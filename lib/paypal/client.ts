/**
 * Cliente REST de PayPal (Orders API v2) — server-only.
 *
 * Usamos la API REST directa con fetch (mismo enfoque que lib/culqi.ts) para no
 * depender de un SDK de PayPal (los oficiales están en flujo de deprecación).
 * Flujo redirect (server-side):
 *   1. createPaypalOrder  → crea la orden y devuelve el link de aprobación.
 *   2. el cliente aprueba en paypal.com y vuelve a return_url.
 *   3. capturePaypalOrder → captura el dinero (lo dispara el retorno y/o webhook).
 *
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 */

import { logger } from "@/lib/logger";
import { getActivePaypalKeys, type PaypalMode } from "./config";

const log = logger.child({ module: "paypal" });

interface AuthedContext {
  baseUrl: string;
  accessToken: string;
  mode: PaypalMode;
  currency: string;
  exchangeRate: number;
  webhookId: string;
}

/**
 * Obtiene un access token OAuth2 (client_credentials) con las credenciales
 * activas. Devuelve null si PayPal no está configurado o la auth falla.
 */
async function authedContext(): Promise<AuthedContext | null> {
  const keys = await getActivePaypalKeys();
  if (!keys) {
    log.error("PayPal credentials not configured");
    return null;
  }

  try {
    const basic = Buffer.from(`${keys.clientId}:${keys.clientSecret}`).toString("base64");
    const res = await fetch(`${keys.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      log.error({ status: res.status }, "PayPal OAuth failed");
      return null;
    }

    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) return null;

    return {
      baseUrl: keys.baseUrl,
      accessToken: json.access_token,
      mode: keys.mode,
      currency: keys.currency,
      exchangeRate: keys.exchangeRate,
      webhookId: keys.webhookId,
    };
  } catch (error) {
    log.error({ err: error }, "PayPal OAuth request failed");
    return null;
  }
}

interface PaypalLink {
  href: string;
  rel: string;
  method?: string;
}

export interface CreatePaypalOrderInput {
  orderId: string;
  orderDisplayNumber: string;
  amount: number; // ya convertido a la divisa de PayPal
  currency: string;
  viewToken: string;
  baseUrl: string; // URL pública de la tienda (no la de la API de PayPal)
  brandName?: string;
}

export interface CreatePaypalOrderResult {
  success: boolean;
  paypalOrderId?: string;
  approveUrl?: string;
  error?: string;
}

/**
 * Crea una orden de PayPal (intent CAPTURE) y devuelve el link de aprobación al
 * que redirigir al cliente.
 */
export async function createPaypalOrder(
  input: CreatePaypalOrderInput
): Promise<CreatePaypalOrderResult> {
  const ctx = await authedContext();
  if (!ctx) {
    return { success: false, error: "PayPal no está configurado. Contacta al administrador." };
  }

  const base = input.baseUrl.replace(/\/$/, "");
  const vt = encodeURIComponent(input.viewToken);

  try {
    const res = await fetch(`${ctx.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.orderId,
            custom_id: input.orderId,
            description: `Orden ${input.orderDisplayNumber}`,
            amount: {
              currency_code: input.currency,
              value: input.amount.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: input.brandName || "Tienda",
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: `${base}/orden/${input.orderId}/pago-paypal/retorno?vt=${vt}`,
          cancel_url: `${base}/orden/${input.orderId}/pago-paypal?token=${vt}&cancel=1`,
        },
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      log.error({ status: res.status, paypalError: json, orderId: input.orderId }, "PayPal create order failed");
      return { success: false, error: "Error al iniciar el pago con PayPal. Intenta nuevamente." };
    }

    const links = (json.links ?? []) as PaypalLink[];
    const approve = links.find((l) => l.rel === "approve" || l.rel === "payer-action");

    if (!json.id || !approve?.href) {
      log.error({ orderId: input.orderId }, "PayPal order created without approve link");
      return { success: false, error: "No se pudo iniciar el pago con PayPal." };
    }

    log.info({ paypalOrderId: json.id, mode: ctx.mode, orderId: input.orderId }, "PayPal order created");
    return { success: true, paypalOrderId: json.id, approveUrl: approve.href };
  } catch (error) {
    log.error({ err: error, orderId: input.orderId }, "PayPal create order request failed");
    return { success: false, error: "Error de conexión con PayPal. Intenta nuevamente." };
  }
}

export interface PaypalOrderInfo {
  id: string;
  status: string; // CREATED | APPROVED | COMPLETED | VOIDED | PAYER_ACTION_REQUIRED
  customId: string;
  captureId: string | null;
  captureStatus: string | null;
  amountValue: number | null;
  currencyCode: string | null;
}

function extractOrderInfo(json: Record<string, unknown>): PaypalOrderInfo {
  const units = (json.purchase_units as Array<Record<string, unknown>> | undefined) ?? [];
  const unit = units[0] ?? {};
  const payments = (unit.payments as Record<string, unknown> | undefined) ?? {};
  const captures = (payments.captures as Array<Record<string, unknown>> | undefined) ?? [];
  const capture = captures[0];
  const amount = (capture?.amount as Record<string, unknown> | undefined) ?? undefined;

  return {
    id: String(json.id ?? ""),
    status: String(json.status ?? ""),
    customId: String((unit.custom_id as string | undefined) ?? (capture?.custom_id as string | undefined) ?? ""),
    captureId: capture ? String(capture.id ?? "") : null,
    captureStatus: capture ? String(capture.status ?? "") : null,
    amountValue: amount?.value != null ? Number(amount.value) : null,
    currencyCode: amount?.currency_code != null ? String(amount.currency_code) : null,
  };
}

/**
 * Captura una orden de PayPal previamente aprobada por el comprador.
 */
export async function capturePaypalOrder(paypalOrderId: string): Promise<PaypalOrderInfo | null> {
  const ctx = await authedContext();
  if (!ctx) return null;

  try {
    const res = await fetch(`${ctx.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const json = await res.json();

    if (!res.ok) {
      // ORDER_ALREADY_CAPTURED: ya se capturó (carrera retorno/webhook). No es
      // un error fatal — leemos el estado actual y dejamos que confirm lo trate.
      const issue = json?.details?.[0]?.issue;
      if (issue === "ORDER_ALREADY_CAPTURED") {
        log.info({ paypalOrderId }, "PayPal order already captured");
        return getPaypalOrder(paypalOrderId);
      }
      log.error({ status: res.status, paypalError: json, paypalOrderId }, "PayPal capture failed");
      return null;
    }

    return extractOrderInfo(json);
  } catch (error) {
    log.error({ err: error, paypalOrderId }, "PayPal capture request failed");
    return null;
  }
}

/**
 * Obtiene una orden de PayPal por id (para verificación/idempotencia).
 */
export async function getPaypalOrder(paypalOrderId: string): Promise<PaypalOrderInfo | null> {
  const ctx = await authedContext();
  if (!ctx) return null;

  try {
    const res = await fetch(`${ctx.baseUrl}/v2/checkout/orders/${paypalOrderId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });

    if (!res.ok) {
      log.error({ status: res.status, paypalOrderId }, "PayPal get order failed");
      return null;
    }

    return extractOrderInfo(await res.json());
  } catch (error) {
    log.error({ err: error, paypalOrderId }, "PayPal get order request failed");
    return null;
  }
}

export interface PaypalWebhookHeaders {
  transmissionId: string | null;
  transmissionTime: string | null;
  certUrl: string | null;
  authAlgo: string | null;
  transmissionSig: string | null;
}

/**
 * Verifica la firma de un webhook de PayPal contra su API. Devuelve true solo si
 * PayPal responde verification_status === "SUCCESS". Si no hay webhookId
 * configurado devuelve null (el llamador decide; la verificación contra la API
 * de la orden sigue siendo la prueba real).
 */
export async function verifyPaypalWebhookSignature(
  headers: PaypalWebhookHeaders,
  rawBody: string
): Promise<boolean | null> {
  const ctx = await authedContext();
  if (!ctx) return false;
  if (!ctx.webhookId) return null;

  try {
    const res = await fetch(`${ctx.baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers.authAlgo,
        cert_url: headers.certUrl,
        transmission_id: headers.transmissionId,
        transmission_sig: headers.transmissionSig,
        transmission_time: headers.transmissionTime,
        webhook_id: ctx.webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    });

    if (!res.ok) {
      log.error({ status: res.status }, "PayPal verify-webhook-signature failed");
      return false;
    }

    const json = (await res.json()) as { verification_status?: string };
    return json.verification_status === "SUCCESS";
  } catch (error) {
    log.error({ err: error }, "PayPal verify-webhook-signature request failed");
    return false;
  }
}

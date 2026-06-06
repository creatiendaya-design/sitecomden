/**
 * Cliente de MercadoPago (Checkout Pro) — server-only.
 *
 * Construye el SDK oficial (`mercadopago` v3) a partir de las credenciales
 * activas guardadas en BD. La preferencia se crea con UN solo ítem cuyo
 * `unit_price` es el total de la orden: así el monto cobrado por MercadoPago
 * coincide exactamente con `order.total` (los descuentos/envío ya están
 * resueltos en nuestro lado) y el webhook puede verificarlo sin ambigüedad.
 *
 * Docs: https://www.mercadopago.com.pe/developers/es/docs/checkout-pro/landing
 */

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { logger } from "@/lib/logger";
import {
  getActiveMercadoPagoKeys,
  MERCADOPAGO_CURRENCY,
  type MercadoPagoMode,
} from "./config";

const log = logger.child({ module: "mercadopago" });

interface MercadoPagoClient {
  client: MercadoPagoConfig;
  mode: MercadoPagoMode;
}

/**
 * Construye el cliente del SDK con el access token activo.
 * Devuelve null si MercadoPago no está configurado.
 */
async function buildClient(): Promise<MercadoPagoClient | null> {
  const keys = await getActiveMercadoPagoKeys();
  if (!keys) {
    log.error("MercadoPago access token not configured");
    return null;
  }

  return {
    client: new MercadoPagoConfig({
      accessToken: keys.accessToken,
      options: { timeout: 8000 },
    }),
    mode: keys.mode,
  };
}

export interface CreatePreferenceInput {
  orderId: string;
  orderNumber: string;
  orderDisplayNumber: string;
  total: number;
  customerName: string;
  customerEmail: string;
  viewToken: string;
  /** URL pública base, ej. https://tienda.pe (sin slash final). */
  baseUrl: string;
}

export interface CreatePreferenceResult {
  success: boolean;
  preferenceId?: string;
  redirectUrl?: string;
  error?: string;
}

/**
 * Crea una preferencia de Checkout Pro y devuelve la URL a la que redirigir
 * al cliente para que pague en la pantalla segura de MercadoPago.
 */
export async function createCheckoutPreference(
  input: CreatePreferenceInput
): Promise<CreatePreferenceResult> {
  const mp = await buildClient();
  if (!mp) {
    return {
      success: false,
      error: "MercadoPago no está configurado. Contacta al administrador.",
    };
  }

  const base = input.baseUrl.replace(/\/$/, "");
  const token = encodeURIComponent(input.viewToken);
  // auto_return / notification_url exigen URLs públicas https. En localhost
  // (http) MercadoPago rechaza auto_return, así que lo omitimos en dev para no
  // romper la creación de la preferencia.
  const isHttps = base.startsWith("https://");

  try {
    const preference = await new Preference(mp.client).create({
      body: {
        items: [
          {
            id: input.orderId,
            title: `Orden ${input.orderDisplayNumber}`,
            quantity: 1,
            unit_price: Number(input.total),
            currency_id: MERCADOPAGO_CURRENCY,
          },
        ],
        payer: {
          name: input.customerName,
          email: input.customerEmail,
        },
        back_urls: {
          success: `${base}/orden/${input.orderId}/confirmacion?token=${token}`,
          pending: `${base}/orden/${input.orderId}/confirmacion?token=${token}`,
          failure: `${base}/orden/${input.orderId}/pago-mercadopago?token=${token}`,
        },
        ...(isHttps ? { auto_return: "approved" } : {}),
        notification_url: `${base}/api/webhooks/mercadopago`,
        external_reference: input.orderId,
        metadata: {
          order_id: input.orderId,
          order_number: input.orderNumber,
        },
        statement_descriptor: "TIENDA",
      },
    });

    // Con credenciales de prueba (TEST-) MercadoPago redirige automáticamente al
    // entorno de pruebas usando el `init_point` normal. El `sandbox_init_point`
    // (dominio legacy sandbox.mercadopago.com.pe) está roto: provoca
    // ERR_TOO_MANY_REDIRECTS y challenges de validación de email en bucle. Por eso
    // usamos SIEMPRE init_point — el modo lo determinan las credenciales, no la URL.
    // Docs: https://github.com/mercadopago/sdk-js/discussions/60
    const redirectUrl = preference.init_point ?? preference.sandbox_init_point;

    if (!redirectUrl) {
      log.error({ preferenceId: preference.id }, "Preference created without init_point");
      return { success: false, error: "No se pudo iniciar el pago con MercadoPago." };
    }

    log.info(
      { preferenceId: preference.id, mode: mp.mode, orderId: input.orderId },
      "MercadoPago preference created"
    );

    return { success: true, preferenceId: preference.id, redirectUrl };
  } catch (error) {
    log.error({ err: error, orderId: input.orderId }, "Failed to create MercadoPago preference");
    return {
      success: false,
      error: "Error al iniciar el pago con MercadoPago. Intenta nuevamente.",
    };
  }
}

export interface MercadoPagoPayment {
  id: string;
  status: string;
  statusDetail: string;
  externalReference: string;
  transactionAmount: number;
  currencyId: string;
  paymentMethodId: string;
}

/**
 * Obtiene un pago por id desde la API de MercadoPago. Es la única prueba
 * confiable de que un pago existe y fue aprobado (no confiar en el webhook ni
 * en los query params del retorno).
 */
export async function getMercadoPagoPayment(
  paymentId: string
): Promise<MercadoPagoPayment | null> {
  const mp = await buildClient();
  if (!mp) return null;

  try {
    const payment = await new Payment(mp.client).get({ id: paymentId });
    return {
      id: String(payment.id ?? paymentId),
      status: payment.status ?? "",
      statusDetail: payment.status_detail ?? "",
      externalReference: payment.external_reference ?? "",
      transactionAmount: Number(payment.transaction_amount ?? 0),
      currencyId: payment.currency_id ?? "",
      paymentMethodId: payment.payment_method_id ?? "",
    };
  } catch (error) {
    log.error({ err: error, paymentId }, "Failed to fetch MercadoPago payment");
    return null;
  }
}

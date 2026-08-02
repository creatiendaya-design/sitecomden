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
 *
 * Exportado para que el cobro con tarjeta (`card-payment.ts`) use exactamente
 * las mismas credenciales y timeout que Checkout Pro: dos formas de construir el
 * cliente acabarían divergiendo (una en test y otra en producción, por ejemplo).
 */
export async function buildClient(): Promise<MercadoPagoClient | null> {
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
  /** Teléfono del comprador (9 dígitos en Perú). Mejora la aprobación. */
  customerPhone?: string | null;
  /** DNI del comprador. En Perú el antifraude de MP lo pondera bastante. */
  customerDni?: string | null;
  /** Dirección de envío (calle) del comprador. */
  customerAddress?: string | null;
  /** Distrito del comprador — se envía como referencia de zona. */
  customerDistrict?: string | null;
}

/**
 * Divide un nombre completo en nombre y apellido. MercadoPago los quiere
 * separados (`payer.name` / `payer.surname`); mandarlo todo junto en `name`
 * deja `surname` vacío, y los datos incompletos del pagador penalizan la
 * aprobación.
 */
export function splitFullName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { name: parts[0] ?? "", surname: "" };
  }
  // En Perú lo habitual es "Nombre(s) ApellidoPaterno ApellidoMaterno": el
  // último token siempre es apellido, el resto lo tratamos como nombre.
  return {
    name: parts.slice(0, -1).join(" "),
    surname: parts[parts.length - 1],
  };
}

/**
 * Normaliza un teléfono peruano a `area_code` + `number`. MercadoPago rechaza
 * el objeto entero si trae caracteres no numéricos, así que ante cualquier duda
 * devolvemos undefined (omitir es mejor que enviar basura).
 */
function buildPayerPhone(
  phone: string | null | undefined
): { area_code: string; number: string } | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return undefined;
  // Descartar prefijo país 51 si viene incluido (51 987654321 → 987654321).
  const local = digits.startsWith("51") && digits.length > 9 ? digits.slice(2) : digits;
  if (local.length !== 9) return undefined;
  return { area_code: "51", number: local };
}

/**
 * Identificación del pagador. Solo DNI (8 dígitos): enviar un tipo/número que
 * no valide es peor que no enviar nada.
 */
export function buildPayerIdentification(
  dni: string | null | undefined
): { type: string; number: string } | undefined {
  if (!dni) return undefined;
  const digits = dni.replace(/\D/g, "");
  if (digits.length !== 8) return undefined;
  return { type: "DNI", number: digits };
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

  const { name, surname } = splitFullName(input.customerName);
  const phone = buildPayerPhone(input.customerPhone);
  const identification = buildPayerIdentification(input.customerDni);

  try {
    const preference = await new Preference(mp.client).create({
      body: {
        // SIGUE SIENDO UN SOLO ÍTEM cuyo unit_price es el total de la orden:
        // el webhook valida que el monto cobrado sea exactamente order.total.
        // Solo se añaden campos descriptivos (description / category_id), que
        // el motor de aprobación de MercadoPago pondera pero no afectan el monto.
        items: [
          {
            id: input.orderId,
            title: `Orden ${input.orderDisplayNumber}`,
            description: `Compra en línea — pedido ${input.orderDisplayNumber}`,
            category_id: "retail",
            quantity: 1,
            unit_price: Number(input.total),
            currency_id: MERCADOPAGO_CURRENCY,
          },
        ],
        // Cuanto más completo el pagador, mejor aprueba el antifraude de MP.
        // Antes solo se enviaban name + email, dejando identificación, teléfono
        // y dirección vacíos — el perfil de riesgo más alto posible.
        payer: {
          name,
          surname,
          email: input.customerEmail,
          ...(phone ? { phone } : {}),
          ...(identification ? { identification } : {}),
          ...(input.customerAddress
            ? {
                address: {
                  street_name: [input.customerAddress, input.customerDistrict]
                    .filter(Boolean)
                    .join(", ")
                    .slice(0, 250),
                  zip_code: "",
                },
              }
            : {}),
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
    // El SDK envuelve la respuesta de MercadoPago en propiedades no estándar
    // (`cause`, `status`) que `err: error` de pino NO serializa: sin esto el log
    // queda como "Failed to create..." sin decir POR QUÉ (token rechazado,
    // invalid_notification_url, auto_return inválido, cuenta sin habilitar…).
    log.error(
      {
        err: error,
        orderId: input.orderId,
        mode: mp.mode,
        baseUrl: base,
        mpStatus: extractMpStatus(error),
        mpCause: extractMpCause(error),
      },
      "Failed to create MercadoPago preference"
    );
    return {
      success: false,
      error: "Error al iniciar el pago con MercadoPago. Intenta nuevamente.",
    };
  }
}

/** Código HTTP que devolvió MercadoPago, si el error viene de la API. */
export function extractMpStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const status = (error as Record<string, unknown>).status;
  return typeof status === "number" ? status : null;
}

/**
 * Detalle de error de la API de MercadoPago (`cause`), serializado a algo que
 * el logger sí escribe. Es el dato que identifica la falla real.
 */
export function extractMpCause(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const cause = (error as Record<string, unknown>).cause;
  if (cause === undefined || cause === null) return null;
  try {
    return JSON.stringify(cause).slice(0, 1000);
  } catch {
    return String(cause);
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

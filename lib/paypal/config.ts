/**
 * Configuración de PayPal (server-only).
 *
 * IMPORTANTE: este módulo NO es "use server". El client secret es un secreto y
 * nunca debe quedar expuesto como endpoint RPC. La lectura vive aquí (módulo
 * plano de servidor); solo el panel admin accede vía un Server Action protegido
 * (ver actions/paypal-settings.ts).
 *
 * Nota de moneda: PayPal NO soporta PEN (soles). Cobramos en una divisa
 * internacional (por defecto USD) convirtiendo `order.total` con un tipo de
 * cambio configurable (soles por 1 USD).
 */

import { prisma } from "@/lib/db";

export const PAYPAL_SETTING_KEY = "paypal_config";

export type PaypalMode = "sandbox" | "live";

export interface PaypalCredentials {
  clientId: string;
  clientSecret: string;
}

export interface PaypalSettings {
  mode: PaypalMode;
  sandbox: PaypalCredentials;
  live: PaypalCredentials;
  /** Divisa de cobro en PayPal (PayPal no acepta PEN). Ej: "USD". */
  currency: string;
  /** Tipo de cambio: soles (PEN) por 1 unidad de `currency`. Ej: 3.8 */
  exchangeRate: number;
  /** Webhook ID de PayPal (para verificar la firma de las notificaciones). */
  webhookId: string;
}

export const DEFAULT_PAYPAL_SETTINGS: PaypalSettings = {
  mode: "sandbox",
  sandbox: { clientId: "", clientSecret: "" },
  live: { clientId: "", clientSecret: "" },
  currency: "USD",
  exchangeRate: 0,
  webhookId: "",
};

function isCredentials(value: unknown): value is PaypalCredentials {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).clientId === "string" &&
    typeof (value as Record<string, unknown>).clientSecret === "string"
  );
}

export function paypalApiBase(mode: PaypalMode): string {
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

/**
 * Lee la configuración completa de PayPal (incluye secretos). Server-only.
 */
export async function readPaypalSettings(): Promise<PaypalSettings> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: PAYPAL_SETTING_KEY },
    });

    if (!setting || !setting.value) {
      return DEFAULT_PAYPAL_SETTINGS;
    }

    const value = setting.value as unknown as Record<string, unknown>;
    if (
      typeof value === "object" &&
      (value.mode === "sandbox" || value.mode === "live") &&
      isCredentials(value.sandbox) &&
      isCredentials(value.live)
    ) {
      return {
        mode: value.mode,
        sandbox: value.sandbox,
        live: value.live,
        currency: typeof value.currency === "string" && value.currency ? value.currency : "USD",
        exchangeRate: typeof value.exchangeRate === "number" ? value.exchangeRate : 0,
        webhookId: typeof value.webhookId === "string" ? value.webhookId : "",
      };
    }

    return DEFAULT_PAYPAL_SETTINGS;
  } catch (error) {
    console.error("Error reading PayPal settings:", error);
    return DEFAULT_PAYPAL_SETTINGS;
  }
}

/**
 * Credenciales activas según el modo, o null si el client id/secret activo no
 * está configurado.
 */
export async function getActivePaypalKeys(): Promise<{
  clientId: string;
  clientSecret: string;
  mode: PaypalMode;
  baseUrl: string;
  currency: string;
  exchangeRate: number;
  webhookId: string;
} | null> {
  const settings = await readPaypalSettings();
  const creds = settings.mode === "live" ? settings.live : settings.sandbox;

  if (!creds.clientId || !creds.clientSecret) {
    return null;
  }

  return {
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    mode: settings.mode,
    baseUrl: paypalApiBase(settings.mode),
    currency: settings.currency || "USD",
    exchangeRate: settings.exchangeRate,
    webhookId: settings.webhookId,
  };
}

/**
 * Convierte un total en soles (PEN) al monto a cobrar en la divisa de PayPal,
 * redondeado a 2 decimales. Si no hay tipo de cambio válido devuelve null.
 */
export function convertPenToCharge(
  totalPen: number,
  exchangeRate: number
): number | null {
  if (!exchangeRate || exchangeRate <= 0) return null;
  return Math.round((totalPen / exchangeRate) * 100) / 100;
}

/**
 * Configuración de MercadoPago (server-only).
 *
 * IMPORTANTE: este módulo NO es "use server". Las credenciales (access token,
 * webhook secret) son secretos y nunca deben quedar expuestas como endpoint RPC
 * llamable desde el navegador. Por eso la lectura vive aquí (módulo plano de
 * servidor) y solo el panel admin accede a ellas a través de un Server Action
 * protegido con permisos (ver actions/mercadopago-settings.ts).
 */

import { prisma } from "@/lib/db";

export const MERCADOPAGO_SETTING_KEY = "mercadopago_config";
export const MERCADOPAGO_CURRENCY = "PEN";

export type MercadoPagoMode = "test" | "production";

export interface MercadoPagoCredentials {
  accessToken: string;
  publicKey: string;
}

export interface MercadoPagoSettings {
  mode: MercadoPagoMode;
  test: MercadoPagoCredentials;
  production: MercadoPagoCredentials;
  /**
   * Secret de firma del webhook (Tus integraciones → Webhooks → Clave secreta).
   * Cuando está presente se valida el header `x-signature` de cada notificación.
   * Es único por integración (no por modo).
   */
  webhookSecret: string;
}

export const DEFAULT_MERCADOPAGO_SETTINGS: MercadoPagoSettings = {
  mode: "test",
  test: { accessToken: "", publicKey: "" },
  production: { accessToken: "", publicKey: "" },
  webhookSecret: "",
};

function isCredentials(value: unknown): value is MercadoPagoCredentials {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).accessToken === "string" &&
    typeof (value as Record<string, unknown>).publicKey === "string"
  );
}

/**
 * Lee la configuración completa de MercadoPago (incluye secretos).
 * Server-only — nunca retornar esto directamente al cliente.
 */
export async function readMercadoPagoSettings(): Promise<MercadoPagoSettings> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: MERCADOPAGO_SETTING_KEY },
    });

    if (!setting || !setting.value) {
      return DEFAULT_MERCADOPAGO_SETTINGS;
    }

    const value = setting.value as unknown as Record<string, unknown>;
    if (
      typeof value === "object" &&
      (value.mode === "test" || value.mode === "production") &&
      isCredentials(value.test) &&
      isCredentials(value.production)
    ) {
      return {
        mode: value.mode,
        test: value.test,
        production: value.production,
        webhookSecret:
          typeof value.webhookSecret === "string" ? value.webhookSecret : "",
      };
    }

    return DEFAULT_MERCADOPAGO_SETTINGS;
  } catch (error) {
    console.error("Error reading MercadoPago settings:", error);
    return DEFAULT_MERCADOPAGO_SETTINGS;
  }
}

/**
 * Devuelve las credenciales activas según el modo (test/production), o null si
 * el access token activo no está configurado.
 */
export async function getActiveMercadoPagoKeys(): Promise<{
  accessToken: string;
  publicKey: string;
  mode: MercadoPagoMode;
} | null> {
  const settings = await readMercadoPagoSettings();
  const creds = settings.mode === "production" ? settings.production : settings.test;

  if (!creds.accessToken) {
    return null;
  }

  return {
    accessToken: creds.accessToken,
    publicKey: creds.publicKey,
    mode: settings.mode,
  };
}

/**
 * Secret de firma del webhook (o null si no está configurado).
 */
export async function getMercadoPagoWebhookSecret(): Promise<string | null> {
  const settings = await readMercadoPagoSettings();
  return settings.webhookSecret || null;
}

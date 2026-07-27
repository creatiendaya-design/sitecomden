/**
 * Lectura server-only de la configuración de emails.
 *
 * Vive fuera de `actions/email-settings.ts` porque ese módulo es
 * `"use server"`: todo lo que exporta es una Server Action invocable desde el
 * navegador. Los helpers que consume el mailer (`lib/email.ts`) corren en
 * contexto de cliente-comprador, así que no pueden llevar guard de admin;
 * separarlos permite guardar la acción de administración sin romper los
 * correos transaccionales.
 */

import "server-only";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "email-settings" });

export interface EmailSettings {
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  adminEmail: string;
  companyName: string;
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  fromEmail: "onboarding@resend.dev",
  fromName: "Mi Tienda",
  replyToEmail: "soporte@mitienda.com",
  adminEmail: "admin@mitienda.com",
  companyName: "Mi Tienda",
};

export async function readEmailSettings(): Promise<EmailSettings> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "email_settings" },
      select: { value: true },
    });

    if (!setting?.value) return DEFAULT_EMAIL_SETTINGS;

    const value = setting.value as unknown as Record<string, unknown>;
    if (
      typeof value.fromEmail === "string" &&
      typeof value.fromName === "string" &&
      typeof value.replyToEmail === "string" &&
      typeof value.adminEmail === "string" &&
      typeof value.companyName === "string"
    ) {
      return {
        fromEmail: value.fromEmail,
        fromName: value.fromName,
        replyToEmail: value.replyToEmail,
        adminEmail: value.adminEmail,
        companyName: value.companyName,
      };
    }

    return DEFAULT_EMAIL_SETTINGS;
  } catch (error) {
    log.error({ err: error }, "Failed to read email settings");
    return DEFAULT_EMAIL_SETTINGS;
  }
}

/** Remitente formateado para Resend: `Nombre <email>`. */
export async function getFromEmail(): Promise<string> {
  const settings = await readEmailSettings();
  return `${settings.fromName} <${settings.fromEmail}>`;
}

/** Buzón que recibe las notificaciones internas de pedidos. */
export async function getAdminEmail(): Promise<string> {
  const settings = await readEmailSettings();
  return settings.adminEmail;
}

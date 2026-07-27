"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import {
  readEmailSettings,
  DEFAULT_EMAIL_SETTINGS,
  type EmailSettings,
} from "@/lib/email-settings";

const log = logger.child({ module: "email-settings-action" });

export type { EmailSettings } from "@/lib/email-settings";

// ============================================================
// OBTENER CONFIGURACIÓN DE EMAILS (PROTEGIDO)
// ============================================================

export async function getEmailSettings(): Promise<EmailSettings> {
  const { response } = await requirePermission("settings:update");
  if (response) return DEFAULT_EMAIL_SETTINGS;

  return readEmailSettings();
}

// ============================================================
// GUARDAR CONFIGURACIÓN DE EMAILS (PROTEGIDO)
// ============================================================

export async function saveEmailSettings(settings: EmailSettings) {
  const { response } = await requirePermission("settings:update");
  if (response) {
    return {
      success: false,
      error: "No autorizado para cambiar la configuración de emails",
    };
  }

  try {
    // Validaciones básicas
    if (!settings.fromEmail || !settings.fromEmail.includes("@")) {
      return {
        success: false,
        error: "Email de envío inválido",
      };
    }

    if (!settings.replyToEmail || !settings.replyToEmail.includes("@")) {
      return {
        success: false,
        error: "Email de respuesta inválido",
      };
    }

    if (!settings.adminEmail || !settings.adminEmail.includes("@")) {
      return {
        success: false,
        error: "Email de admin inválido",
      };
    }

    if (!settings.fromName || settings.fromName.trim() === "") {
      return {
        success: false,
        error: "Nombre de remitente es requerido",
      };
    }

    if (!settings.companyName || settings.companyName.trim() === "") {
      return {
        success: false,
        error: "Nombre de empresa es requerido",
      };
    }

    // Guardar o actualizar setting
    await prisma.setting.upsert({
      where: { key: "email_settings" },
      update: {
        value: settings as unknown as Prisma.InputJsonValue,
        category: "email",
        description: "Configuración de emails del sistema",
      },
      create: {
        key: "email_settings",
        value: settings as unknown as Prisma.InputJsonValue,
        category: "email",
        description: "Configuración de emails del sistema",
      },
    });

    // Revalidar páginas que usan esta configuración
    revalidatePath("/admin/configuracion/emails");

    return {
      success: true,
      message: "Configuración guardada correctamente",
    };
  } catch (error) {
    log.error({ err: error }, "Failed to save email settings");
    return {
      success: false,
      error: "Error al guardar la configuración",
    };
  }
}

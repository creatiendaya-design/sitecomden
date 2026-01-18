"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ============================================================
// TIPOS
// ============================================================

export interface EmailSettings {
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  adminEmail: string;
  companyName: string;
}

// ============================================================
// OBTENER CONFIGURACIÓN DE EMAILS
// ============================================================

export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "email_settings" },
    });

    if (!setting) {
      // Valores por defecto si no existe configuración
      return {
        fromEmail: "onboarding@resend.dev",
        fromName: "Mi Tienda",
        replyToEmail: "soporte@mitienda.com",
        adminEmail: "admin@mitienda.com",
        companyName: "Mi Tienda",
      };
    }

    return setting.value as EmailSettings;
  } catch (error) {
    console.error("Error getting email settings:", error);
    // Retornar defaults en caso de error
    return {
      fromEmail: "onboarding@resend.dev",
      fromName: "Mi Tienda",
      replyToEmail: "soporte@mitienda.com",
      adminEmail: "admin@mitienda.com",
      companyName: "Mi Tienda",
    };
  }
}

// ============================================================
// GUARDAR CONFIGURACIÓN DE EMAILS
// ============================================================

export async function saveEmailSettings(settings: EmailSettings) {
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
        value: settings,
        category: "email",
        description: "Configuración de emails del sistema",
      },
      create: {
        key: "email_settings",
        value: settings,
        category: "email",
        description: "Configuración de emails del sistema",
      },
    });

    console.log("Email settings saved:", settings);

    // Revalidar páginas que usan esta configuración
    revalidatePath("/admin/configuracion/emails");

    return {
      success: true,
      message: "Configuración guardada correctamente",
    };
  } catch (error) {
    console.error("Error saving email settings:", error);
    return {
      success: false,
      error: "Error al guardar la configuración",
    };
  }
}

// ============================================================
// OBTENER FROM_EMAIL FORMATEADO (para Resend)
// ============================================================

export async function getFromEmail(): Promise<string> {
  const settings = await getEmailSettings();
  return `${settings.fromName} <${settings.fromEmail}>`;
}

// ============================================================
// OBTENER ADMIN_EMAIL
// ============================================================

export async function getAdminEmail(): Promise<string> {
  const settings = await getEmailSettings();
  return settings.adminEmail;
}
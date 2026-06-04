"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  readMercadoPagoSettings,
  MERCADOPAGO_SETTING_KEY,
  type MercadoPagoSettings,
} from "@/lib/mercadopago/config";

export type { MercadoPagoSettings } from "@/lib/mercadopago/config";

/**
 * Obtener configuración de MercadoPago para el panel admin.
 *
 * PROTEGIDO: retorna secretos (access token, webhook secret), así que solo
 * usuarios con permiso pueden leerlo. NO exponer en el checkout/storefront.
 */
export async function getMercadoPagoSettings(): Promise<MercadoPagoSettings | null> {
  const { response } = await requirePermission("settings:update");
  if (response) return null;

  return readMercadoPagoSettings();
}

/**
 * Guardar configuración de MercadoPago (PROTEGIDO).
 */
export async function saveMercadoPagoSettings(
  settings: MercadoPagoSettings
): Promise<{ success: boolean; error?: string; message?: string }> {
  const { response } = await requirePermission("settings:update");
  if (response) {
    return { success: false, error: "No autorizado para cambiar la configuración" };
  }

  if (settings.mode !== "test" && settings.mode !== "production") {
    return { success: false, error: "Modo inválido. Debe ser 'test' o 'production'" };
  }

  const activeCreds = settings.mode === "production" ? settings.production : settings.test;
  if (!activeCreds.accessToken) {
    return {
      success: false,
      error: `El Access Token de ${settings.mode === "production" ? "producción" : "prueba"} es requerido para el modo activo`,
    };
  }

  // Normalizar: nunca persistir undefined/null en los campos string.
  const normalized: MercadoPagoSettings = {
    mode: settings.mode,
    test: {
      accessToken: settings.test.accessToken?.trim() ?? "",
      publicKey: settings.test.publicKey?.trim() ?? "",
    },
    production: {
      accessToken: settings.production.accessToken?.trim() ?? "",
      publicKey: settings.production.publicKey?.trim() ?? "",
    },
    webhookSecret: settings.webhookSecret?.trim() ?? "",
  };

  try {
    await prisma.setting.upsert({
      where: { key: MERCADOPAGO_SETTING_KEY },
      update: {
        value: normalized as unknown as Prisma.InputJsonValue,
        category: "payment",
        description: "Configuración de MercadoPago (credenciales y modo de operación)",
      },
      create: {
        key: MERCADOPAGO_SETTING_KEY,
        value: normalized as unknown as Prisma.InputJsonValue,
        category: "payment",
        description: "Configuración de MercadoPago (credenciales y modo de operación)",
      },
    });

    revalidatePath("/admin/configuracion/mercadopago");
    revalidatePath("/checkout");

    return { success: true, message: "Configuración de MercadoPago guardada correctamente" };
  } catch (error) {
    console.error("Error saving MercadoPago settings:", error);
    return { success: false, error: "Error al guardar la configuración de MercadoPago" };
  }
}

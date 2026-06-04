"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  readPaypalSettings,
  PAYPAL_SETTING_KEY,
  type PaypalSettings,
} from "@/lib/paypal/config";

export type { PaypalSettings } from "@/lib/paypal/config";

/**
 * Obtener configuración de PayPal para el panel admin.
 *
 * PROTEGIDO: retorna secretos (client secret), solo usuarios con permiso.
 */
export async function getPaypalSettings(): Promise<PaypalSettings | null> {
  const { response } = await requirePermission("settings:update");
  if (response) return null;

  return readPaypalSettings();
}

/**
 * Guardar configuración de PayPal (PROTEGIDO).
 */
export async function savePaypalSettings(
  settings: PaypalSettings
): Promise<{ success: boolean; error?: string; message?: string }> {
  const { response } = await requirePermission("settings:update");
  if (response) {
    return { success: false, error: "No autorizado para cambiar la configuración" };
  }

  if (settings.mode !== "sandbox" && settings.mode !== "live") {
    return { success: false, error: "Modo inválido. Debe ser 'sandbox' o 'live'" };
  }

  const activeCreds = settings.mode === "live" ? settings.live : settings.sandbox;
  if (!activeCreds.clientId || !activeCreds.clientSecret) {
    return {
      success: false,
      error: `El Client ID y Secret de ${settings.mode === "live" ? "producción" : "sandbox"} son requeridos para el modo activo`,
    };
  }

  const currency = (settings.currency || "USD").trim().toUpperCase();
  if (currency.length !== 3) {
    return { success: false, error: "La divisa debe ser un código de 3 letras (ej. USD)" };
  }
  if (currency === "PEN") {
    return { success: false, error: "PayPal no acepta soles (PEN). Usa una divisa internacional como USD." };
  }

  const exchangeRate = Number(settings.exchangeRate);
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    return { success: false, error: "El tipo de cambio (soles por 1 USD) debe ser mayor a 0" };
  }

  const normalized: PaypalSettings = {
    mode: settings.mode,
    sandbox: {
      clientId: settings.sandbox.clientId?.trim() ?? "",
      clientSecret: settings.sandbox.clientSecret?.trim() ?? "",
    },
    live: {
      clientId: settings.live.clientId?.trim() ?? "",
      clientSecret: settings.live.clientSecret?.trim() ?? "",
    },
    currency,
    exchangeRate,
    webhookId: settings.webhookId?.trim() ?? "",
  };

  try {
    await prisma.setting.upsert({
      where: { key: PAYPAL_SETTING_KEY },
      update: {
        value: normalized as unknown as Prisma.InputJsonValue,
        category: "payment",
        description: "Configuración de PayPal (credenciales, divisa y modo)",
      },
      create: {
        key: PAYPAL_SETTING_KEY,
        value: normalized as unknown as Prisma.InputJsonValue,
        category: "payment",
        description: "Configuración de PayPal (credenciales, divisa y modo)",
      },
    });

    revalidatePath("/admin/configuracion/paypal");
    revalidatePath("/checkout");

    return { success: true, message: "Configuración de PayPal guardada correctamente" };
  } catch (error) {
    console.error("Error saving PayPal settings:", error);
    return { success: false, error: "Error al guardar la configuración de PayPal" };
  }
}

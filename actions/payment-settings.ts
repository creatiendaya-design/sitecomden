"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ============================================================
// TIPOS
// ============================================================

export interface PaymentMethodSettings {
  yape: {
    enabled: boolean;
    phoneNumber: string;
    qrImageUrl: string;
    accountName: string;
  };
  plin: {
    enabled: boolean;
    phoneNumber: string;
    qrImageUrl: string;
    accountName: string;
  };
}

// ============================================================
// VALORES POR DEFECTO
// ============================================================

const DEFAULT_PAYMENT_SETTINGS: PaymentMethodSettings = {
  yape: {
    enabled: true,
    phoneNumber: "987654321",
    qrImageUrl: "",
    accountName: "Tu Tienda Perú",
  },
  plin: {
    enabled: true,
    phoneNumber: "987654321",
    qrImageUrl: "",
    accountName: "Tu Tienda Perú",
  },
};

// ============================================================
// OBTENER CONFIGURACIÓN DE MÉTODOS DE PAGO
// ============================================================

export async function getPaymentMethodSettings(): Promise<PaymentMethodSettings> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "payment_methods" },
    });

    // ✅ Validar que exista y que value no sea null
    if (!setting || !setting.value) {
      return DEFAULT_PAYMENT_SETTINGS;
    }

    // ✅ Validar que sea un objeto con la estructura correcta
    const value = setting.value as any;
    if (
      typeof value === "object" &&
      value.yape &&
      value.plin &&
      typeof value.yape === "object" &&
      typeof value.plin === "object"
    ) {
      return value as PaymentMethodSettings;
    }

    // Si no cumple la estructura, retornar defaults
    return DEFAULT_PAYMENT_SETTINGS;
  } catch (error) {
    console.error("Error getting payment method settings:", error);
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

// ============================================================
// GUARDAR CONFIGURACIÓN DE MÉTODOS DE PAGO
// ============================================================

export async function savePaymentMethodSettings(settings: PaymentMethodSettings) {
  try {
    // Validar que los números tengan formato correcto
    if (settings.yape.enabled && !settings.yape.phoneNumber) {
      return {
        success: false,
        error: "El número de Yape es requerido",
      };
    }

    if (settings.plin.enabled && !settings.plin.phoneNumber) {
      return {
        success: false,
        error: "El número de Plin es requerido",
      };
    }

    // Guardar o actualizar setting
    await prisma.setting.upsert({
      where: { key: "payment_methods" },
      update: {
        value: settings as any, // ✅ Cast a any para evitar error de tipos
        category: "payment",
        description: "Configuración de métodos de pago Yape y Plin",
      },
      create: {
        key: "payment_methods",
        value: settings as any, // ✅ Cast a any para evitar error de tipos
        category: "payment",
        description: "Configuración de métodos de pago Yape y Plin",
      },
    });

    console.log("Payment method settings saved:", settings);

    // Revalidar páginas que usan esta configuración
    revalidatePath("/orden/[orderId]/pago-pendiente", "page");
    revalidatePath("/admin/configuracion/pagos");

    return {
      success: true,
      message: "Configuración guardada correctamente",
    };
  } catch (error) {
    console.error("Error saving payment method settings:", error);
    return {
      success: false,
      error: "Error al guardar la configuración",
    };
  }
}

// ============================================================
// SUBIR IMAGEN DE QR
// ============================================================

import { put } from "@vercel/blob";

export async function uploadQRImage(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const method = formData.get("method") as string; // "yape" o "plin"

    if (!file) {
      return {
        success: false,
        error: "No se recibió ningún archivo",
      };
    }

    if (!method || !["yape", "plin"].includes(method)) {
      return {
        success: false,
        error: "Método de pago inválido",
      };
    }

    // Validar que sea imagen
    if (!file.type.startsWith("image/")) {
      return {
        success: false,
        error: "El archivo debe ser una imagen",
      };
    }

    // Validar tamaño (máximo 2MB para QR)
    if (file.size > 2 * 1024 * 1024) {
      return {
        success: false,
        error: "La imagen debe ser menor a 2MB",
      };
    }

    // Subir a Vercel Blob
    const blob = await put(`qr/${method}-${Date.now()}.jpg`, file, {
      access: "public",
    });

    console.log(`QR ${method} uploaded:`, blob.url);

    return {
      success: true,
      url: blob.url,
    };
  } catch (error) {
    console.error("Error uploading QR image:", error);
    return {
      success: false,
      error: "Error al subir la imagen",
    };
  }
}
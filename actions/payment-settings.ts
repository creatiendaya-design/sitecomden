"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

export type PaymentMethodSettings = {
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
  card: {
    enabled: boolean;
    description: string;
  };
  paypal: {
    enabled: boolean;
    description: string;
  };
  mercadopago: {
    enabled: boolean;
    description: string;
  };
};

const DEFAULT_SETTINGS: PaymentMethodSettings = {
  yape: {
    enabled: true,
    phoneNumber: "",
    qrImageUrl: "",
    accountName: "",
  },
  plin: {
    enabled: true,
    phoneNumber: "",
    qrImageUrl: "",
    accountName: "",
  },
  card: {
    enabled: true,
    description: "Acepta Visa, Mastercard y otras tarjetas",
  },
  paypal: {
    enabled: false,
    description: "Pagos internacionales",
  },
  mercadopago: {
    enabled: false,
    description: "Alternativa para LATAM",
  },
};

/**
 * Obtener configuración de métodos de pago (Público - NO proteger)
 */
export async function getPaymentMethodSettings(): Promise<PaymentMethodSettings> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "payment_methods" },
    });

    // ✅ Validar que exista y que value no sea null
    if (!setting || !setting.value) {
      return DEFAULT_SETTINGS;
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
      // Merge con defaults para asegurar que existan todos los métodos
      // (útil si se agregaron métodos nuevos después)
      return {
        ...DEFAULT_SETTINGS,
        ...value,
        card: value.card || DEFAULT_SETTINGS.card,
        paypal: value.paypal || DEFAULT_SETTINGS.paypal,
        mercadopago: value.mercadopago || DEFAULT_SETTINGS.mercadopago,
      } as PaymentMethodSettings;
    }

    // Si no cumple la estructura, retornar defaults
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Error getting payment method settings:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Guardar configuración de métodos de pago (Admin - PROTEGIDO)
 */
export async function savePaymentMethodSettings(
  settings: PaymentMethodSettings
): Promise<{ success: boolean; error?: string; message?: string }> {
  // 🔐 PROTECCIÓN: Solo admins con permiso pueden cambiar configuración
  const { user } = await requirePermission("settings.update");
  
  try {
    // Validar que los números tengan formato correcto si están habilitados
    if (settings.yape.enabled && !settings.yape.phoneNumber) {
      return {
        success: false,
        error: "El número de Yape es requerido cuando está habilitado",
      };
    }

    if (settings.plin.enabled && !settings.plin.phoneNumber) {
      return {
        success: false,
        error: "El número de Plin es requerido cuando está habilitado",
      };
    }

    // Validar que al menos un método esté habilitado
    const hasEnabledMethod = 
      settings.yape.enabled || 
      settings.plin.enabled || 
      settings.card.enabled || 
      settings.paypal.enabled || 
      settings.mercadopago.enabled;

    if (!hasEnabledMethod) {
      return {
        success: false,
        error: "Debe habilitar al menos un método de pago",
      };
    }

    // Guardar o actualizar setting
    await prisma.setting.upsert({
      where: { key: "payment_methods" },
      update: {
        value: settings as any,
        category: "payment",
        description: "Configuración de métodos de pago",
      },
      create: {
        key: "payment_methods",
        value: settings as any,
        category: "payment",
        description: "Configuración de métodos de pago",
      },
    });

    console.log(`✅ Configuración de pagos actualizada por usuario ${user!.id}:`, {
      yapeEnabled: settings.yape.enabled,
      plinEnabled: settings.plin.enabled,
      cardEnabled: settings.card.enabled,
      paypalEnabled: settings.paypal.enabled,
      mercadopagoEnabled: settings.mercadopago.enabled,
    });

    // Revalidar páginas que usan esta configuración
    revalidatePath("/", "layout"); // Revalidar todo el sitio
    revalidatePath("/checkout");
    revalidatePath("/orden/[orderId]/pago-pendiente", "page");
    revalidatePath("/admin/configuracion/pagos");

    return { 
      success: true,
      message: "Configuración guardada correctamente"
    };
  } catch (error) {
    console.error("Error saving payment settings:", error);
    return {
      success: false,
      error: "Error al guardar la configuración",
    };
  }
}

/**
 * Subir imagen QR de Yape/Plin (Admin - PROTEGIDO)
 */
export async function uploadQRImage(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  // 🔐 PROTECCIÓN: Solo admins con permiso pueden subir QR codes
  const { user } = await requirePermission("settings.update");
  
  try {
    const file = formData.get("file") as File;
    const method = formData.get("method") as string; // "yape" o "plin"

    if (!file) {
      return { 
        success: false, 
        error: "No se recibió ningún archivo" 
      };
    }

    if (!method || !["yape", "plin"].includes(method)) {
      return { 
        success: false, 
        error: "Método de pago inválido" 
      };
    }

    // Validar que sea imagen
    if (!file.type.startsWith("image/")) {
      return { 
        success: false, 
        error: "El archivo debe ser una imagen" 
      };
    }

    // Validar tamaño (máximo 2MB para QR)
    if (file.size > 2 * 1024 * 1024) {
      return { 
        success: false, 
        error: "La imagen debe ser menor a 2MB" 
      };
    }

    // Subir a Vercel Blob
    const blob = await put(`qr/${method}-${Date.now()}.jpg`, file, {
      access: "public",
    });

    console.log(`✅ QR ${method} subido por usuario ${user!.id}:`, blob.url);

    return { 
      success: true, 
      url: blob.url 
    };
  } catch (error) {
    console.error("Error uploading QR image:", error);
    return {
      success: false,
      error: "Error al subir la imagen",
    };
  }
}

/**
 * Obtener solo los métodos de pago habilitados (para usar en checkout)
 */
export async function getEnabledPaymentMethods(): Promise<{
  yape: boolean;
  plin: boolean;
  card: boolean;
  paypal: boolean;
  mercadopago: boolean;
}> {
  const settings = await getPaymentMethodSettings();

  return {
    yape: settings.yape.enabled,
    plin: settings.plin.enabled,
    card: settings.card.enabled,
    paypal: settings.paypal.enabled,
    mercadopago: settings.mercadopago.enabled,
  };
}
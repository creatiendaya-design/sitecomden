"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ============================================================
// TIPOS
// ============================================================

export interface CulqiSettings {
  mode: "test" | "production";
  test: {
    publicKey: string;
    secretKey: string;
  };
  production: {
    publicKey: string;
    secretKey: string;
  };
}

// ============================================================
// VALORES POR DEFECTO
// ============================================================

const DEFAULT_CULQI_SETTINGS: CulqiSettings = {
  mode: "test",
  test: {
    publicKey: "",
    secretKey: "",
  },
  production: {
    publicKey: "",
    secretKey: "",
  },
};

// ============================================================
// OBTENER CONFIGURACIÓN DE CULQI
// ============================================================

export async function getCulqiSettings(): Promise<CulqiSettings> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "culqi_config" },
    });

    if (!setting || !setting.value) {
      return DEFAULT_CULQI_SETTINGS;
    }

    const value = setting.value as any;
    
    // Validar estructura
    if (
      typeof value === "object" &&
      value.mode &&
      value.test &&
      value.production &&
      typeof value.test === "object" &&
      typeof value.production === "object"
    ) {
      return value as CulqiSettings;
    }

    return DEFAULT_CULQI_SETTINGS;
  } catch (error) {
    console.error("Error getting Culqi settings:", error);
    return DEFAULT_CULQI_SETTINGS;
  }
}

// ============================================================
// GUARDAR CONFIGURACIÓN DE CULQI
// ============================================================

export async function saveCulqiSettings(settings: CulqiSettings) {
  try {
    // Validaciones
    if (!["test", "production"].includes(settings.mode)) {
      return {
        success: false,
        error: "Modo inválido. Debe ser 'test' o 'production'",
      };
    }

    // Si está en modo test, validar que tenga las claves de test
    if (settings.mode === "test") {
      if (!settings.test.publicKey || !settings.test.secretKey) {
        return {
          success: false,
          error: "Las claves de prueba son requeridas cuando el modo es 'test'",
        };
      }
    }

    // Si está en modo production, validar que tenga las claves de production
    if (settings.mode === "production") {
      if (!settings.production.publicKey || !settings.production.secretKey) {
        return {
          success: false,
          error: "Las claves de producción son requeridas cuando el modo es 'production'",
        };
      }
    }

    // Guardar o actualizar setting
    await prisma.setting.upsert({
      where: { key: "culqi_config" },
      update: {
        value: settings as any,
        category: "payment",
        description: "Configuración de Culqi (claves y modo de operación)",
      },
      create: {
        key: "culqi_config",
        value: settings as any,
        category: "payment",
        description: "Configuración de Culqi (claves y modo de operación)",
      },
    });

    console.log("✅ Culqi settings saved successfully");

    // Revalidar páginas relevantes
    revalidatePath("/admin/configuracion/culqi");
    revalidatePath("/checkout/pago");

    return {
      success: true,
      message: "Configuración de Culqi guardada correctamente",
    };
  } catch (error) {
    console.error("Error saving Culqi settings:", error);
    return {
      success: false,
      error: "Error al guardar la configuración de Culqi",
    };
  }
}

// ============================================================
// OBTENER CLAVES ACTIVAS (según modo)
// ============================================================

export async function getActiveCulqiKeys(): Promise<{
  publicKey: string;
  secretKey: string;
  mode: "test" | "production";
} | null> {
  try {
    const settings = await getCulqiSettings();
    
    if (settings.mode === "test") {
      return {
        publicKey: settings.test.publicKey,
        secretKey: settings.test.secretKey,
        mode: "test",
      };
    } else {
      return {
        publicKey: settings.production.publicKey,
        secretKey: settings.production.secretKey,
        mode: "production",
      };
    }
  } catch (error) {
    console.error("Error getting active Culqi keys:", error);
    return null;
  }
}
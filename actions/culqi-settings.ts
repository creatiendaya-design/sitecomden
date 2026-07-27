"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import {
  readCulqiSettings,
  DEFAULT_CULQI_SETTINGS,
  type CulqiSettings,
} from "@/lib/culqi-config";

const log = logger.child({ module: "culqi-settings" });

export type { CulqiSettings } from "@/lib/culqi-config";

/**
 * Marcador que sustituye a la secret key cuando la enviamos al navegador.
 * Si el formulario devuelve una clave que aún contiene este marcador,
 * significa que el admin no la editó y conservamos la almacenada.
 */
const MASK = "••••••••";

function maskSecret(secretKey: string): string {
  if (!secretKey) return "";
  const tail = secretKey.slice(-4);
  return `${MASK}${tail}`;
}

function isMasked(value: string): boolean {
  return value.includes(MASK);
}

// ============================================================
// OBTENER CONFIGURACIÓN (ENMASCARADA)
// ============================================================

/**
 * Configuración de Culqi para el panel admin.
 *
 * PROTEGIDO + ENMASCARADO: las public keys viajan completas (son públicas por
 * definición), pero las secret keys se devuelven como `••••••••1234`. Nunca
 * enviamos una secret key completa al navegador, ni siquiera a un admin.
 */
export async function getCulqiSettings(): Promise<CulqiSettings> {
  const { response } = await requirePermission("settings:update");
  if (response) return DEFAULT_CULQI_SETTINGS;

  const settings = await readCulqiSettings();

  return {
    mode: settings.mode,
    test: {
      publicKey: settings.test.publicKey,
      secretKey: maskSecret(settings.test.secretKey),
    },
    production: {
      publicKey: settings.production.publicKey,
      secretKey: maskSecret(settings.production.secretKey),
    },
  };
}

// ============================================================
// GUARDAR CONFIGURACIÓN
// ============================================================

export async function saveCulqiSettings(settings: CulqiSettings) {
  const { response } = await requirePermission("settings:update");
  if (response) {
    return {
      success: false,
      error: "No autorizado para cambiar la configuración de Culqi",
    };
  }

  try {
    if (settings.mode !== "test" && settings.mode !== "production") {
      return {
        success: false,
        error: "Modo inválido. Debe ser 'test' o 'production'",
      };
    }

    // Las secret keys enmascaradas significan "sin cambios": recuperamos las
    // almacenadas para no sobrescribirlas con el marcador.
    const stored = await readCulqiSettings();
    const merged: CulqiSettings = {
      mode: settings.mode,
      test: {
        publicKey: settings.test.publicKey.trim(),
        secretKey: isMasked(settings.test.secretKey)
          ? stored.test.secretKey
          : settings.test.secretKey.trim(),
      },
      production: {
        publicKey: settings.production.publicKey.trim(),
        secretKey: isMasked(settings.production.secretKey)
          ? stored.production.secretKey
          : settings.production.secretKey.trim(),
      },
    };

    const activeKeys = merged.mode === "test" ? merged.test : merged.production;
    if (!activeKeys.publicKey || !activeKeys.secretKey) {
      return {
        success: false,
        error:
          merged.mode === "test"
            ? "Las claves de prueba son requeridas cuando el modo es 'test'"
            : "Las claves de producción son requeridas cuando el modo es 'production'",
      };
    }

    await prisma.setting.upsert({
      where: { key: "culqi_config" },
      update: {
        value: merged as unknown as Prisma.InputJsonValue,
        category: "payment",
        description: "Configuración de Culqi (claves y modo de operación)",
      },
      create: {
        key: "culqi_config",
        value: merged as unknown as Prisma.InputJsonValue,
        category: "payment",
        description: "Configuración de Culqi (claves y modo de operación)",
      },
    });

    revalidatePath("/admin/configuracion/culqi");
    revalidatePath("/checkout/pago");

    return {
      success: true,
      message: "Configuración de Culqi guardada correctamente",
    };
  } catch (error) {
    log.error({ err: error }, "Failed to save Culqi settings");
    return {
      success: false,
      error: "Error al guardar la configuración de Culqi",
    };
  }
}

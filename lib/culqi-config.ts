/**
 * Lectura server-only de la configuración de Culqi.
 *
 * IMPORTANTE: este módulo NO es `"use server"` a propósito. Las claves
 * secretas se leen aquí y sólo pueden consumirse desde código de servidor
 * (lib/culqi.ts, webhooks, Server Actions guardadas). Antes vivía en
 * `actions/culqi-settings.ts`, lo que convertía a `getCulqiSettings()` y
 * `getActiveCulqiKeys()` en Server Actions invocables desde el navegador:
 * cualquier visitante podía POSTear el action id y recibir la secret key.
 */

import "server-only";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "culqi-config" });

export interface CulqiKeyPair {
  publicKey: string;
  secretKey: string;
}

export interface CulqiSettings {
  mode: "test" | "production";
  test: CulqiKeyPair;
  production: CulqiKeyPair;
}

export const DEFAULT_CULQI_SETTINGS: CulqiSettings = {
  mode: "test",
  test: { publicKey: "", secretKey: "" },
  production: { publicKey: "", secretKey: "" },
};

function isKeyPair(value: unknown): value is CulqiKeyPair {
  if (typeof value !== "object" || value === null) return false;
  const pair = value as Record<string, unknown>;
  return (
    typeof pair.publicKey === "string" && typeof pair.secretKey === "string"
  );
}

/**
 * Configuración completa **con secretos**. Sólo para uso server-side.
 */
export async function readCulqiSettings(): Promise<CulqiSettings> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "culqi_config" },
      select: { value: true },
    });

    if (!setting?.value) return DEFAULT_CULQI_SETTINGS;

    const value = setting.value as unknown as Record<string, unknown>;
    if (
      (value.mode === "test" || value.mode === "production") &&
      isKeyPair(value.test) &&
      isKeyPair(value.production)
    ) {
      return {
        mode: value.mode,
        test: { publicKey: value.test.publicKey, secretKey: value.test.secretKey },
        production: {
          publicKey: value.production.publicKey,
          secretKey: value.production.secretKey,
        },
      };
    }

    return DEFAULT_CULQI_SETTINGS;
  } catch (error) {
    log.error({ err: error }, "Failed to read Culqi settings");
    return DEFAULT_CULQI_SETTINGS;
  }
}

/**
 * Claves activas según el modo configurado. Sólo para uso server-side.
 */
export async function getActiveCulqiKeys(): Promise<
  (CulqiKeyPair & { mode: "test" | "production" }) | null
> {
  try {
    const settings = await readCulqiSettings();
    const active =
      settings.mode === "test" ? settings.test : settings.production;

    return {
      publicKey: active.publicKey,
      secretKey: active.secretKey,
      mode: settings.mode,
    };
  } catch (error) {
    log.error({ err: error }, "Failed to resolve active Culqi keys");
    return null;
  }
}

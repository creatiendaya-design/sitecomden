"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { getActivePixelsCached } from "@/lib/tracking-pixels";

// ============================================
// TIPOS Y SCHEMAS
// ============================================

export type PixelPlatform = "FACEBOOK" | "TIKTOK" | "GOOGLE_ADS" | "GOOGLE_ANALYTICS";

// Configuración de Facebook Pixel
const FacebookConfigSchema = z.object({
  pixelId: z.string().min(1, "Pixel ID es requerido"),
  accessToken: z.string().optional(),
  testEventCode: z.string().optional(),
});

// Configuración de TikTok Pixel
const TikTokConfigSchema = z.object({
  pixelId: z.string().min(1, "Pixel ID es requerido"),
  accessToken: z.string().optional(),
});

// Configuración de Google Ads
const GoogleAdsConfigSchema = z.object({
  conversionId: z.string().min(1, "Conversion ID es requerido"),
  conversionLabel: z.string().optional(),
});

// Configuración de Google Analytics 4
const GoogleAnalyticsConfigSchema = z.object({
  measurementId: z.string().min(1, "Measurement ID es requerido (G-XXXXXXXXXX)"),
  apiSecret: z.string().optional(), // Para Measurement Protocol API
});

export type FacebookConfig = z.infer<typeof FacebookConfigSchema>;
export type TikTokConfig = z.infer<typeof TikTokConfigSchema>;
export type GoogleAdsConfig = z.infer<typeof GoogleAdsConfigSchema>;
export type GoogleAnalyticsConfig = z.infer<typeof GoogleAnalyticsConfigSchema>;

export type PixelConfig =
  | FacebookConfig
  | TikTokConfig
  | GoogleAdsConfig
  | GoogleAnalyticsConfig;

// ============================================
// OBTENER TODOS LOS PÍXELES
// ============================================

export async function getAllPixels() {
  // PROTEGIDO: `config` incluye access tokens de CAPI / api secrets de GA4.
  const { response } = await requirePermission("settings:update");
  if (response) return { success: false, error: "No autorizado" };

  try {
    const pixels = await prisma.trackingPixel.findMany({
      orderBy: { platform: "asc" },
    });

    return {
      success: true,
      pixels: pixels.map((p) => ({
        ...p,
        config: p.config as PixelConfig,
      })),
    };
  } catch (error) {
    console.error("Error al obtener píxeles:", error);
    return { success: false, error: "Error al cargar configuración de píxeles" };
  }
}

// ============================================
// OBTENER PÍXEL POR PLATAFORMA
// ============================================

export async function getPixelByPlatform(platform: PixelPlatform) {
  // PROTEGIDO: devuelve credenciales completas.
  const { response } = await requirePermission("settings:update");
  if (response) return { success: false, error: "No autorizado" };

  try {
    const pixel = await prisma.trackingPixel.findFirst({
      where: { platform },
    });

    if (!pixel) {
      return { success: true, pixel: null };
    }

    return {
      success: true,
      pixel: {
        ...pixel,
        config: pixel.config as PixelConfig,
      },
    };
  } catch (error) {
    console.error(`Error al obtener píxel ${platform}:`, error);
    return { success: false, error: "Error al cargar configuración" };
  }
}

// ============================================
// GUARDAR O ACTUALIZAR PÍXEL
// ============================================

export async function savePixel(
  platform: PixelPlatform,
  config: PixelConfig,
  enabled: boolean,
  testMode: boolean,
  description?: string
) {
  const { response } = await requirePermission("settings:update");
  if (response) return { success: false, error: "No autorizado" };

  try {
    // Validar configuración según plataforma
    let validatedConfig;
    switch (platform) {
      case "FACEBOOK":
        validatedConfig = FacebookConfigSchema.parse(config);
        break;
      case "TIKTOK":
        validatedConfig = TikTokConfigSchema.parse(config);
        break;
      case "GOOGLE_ADS":
        validatedConfig = GoogleAdsConfigSchema.parse(config);
        break;
      case "GOOGLE_ANALYTICS":
        validatedConfig = GoogleAnalyticsConfigSchema.parse(config);
        break;
      default:
        return { success: false, error: "Plataforma no válida" };
    }

    // Buscar si ya existe
    const existing = await prisma.trackingPixel.findFirst({
      where: { platform },
    });

    if (existing) {
      // Actualizar
      await prisma.trackingPixel.update({
        where: { id: existing.id },
        data: {
          config: validatedConfig as unknown as Prisma.InputJsonValue,
          enabled,
          testMode,
          description,
        },
      });
    } else {
      // Crear nuevo
      await prisma.trackingPixel.create({
        data: {
          platform,
          config: validatedConfig as unknown as Prisma.InputJsonValue,
          enabled,
          testMode,
          description,
        },
      });
    }

    revalidatePath("/admin/configuracion/pixeles");
    updateTag("tracking-pixels");

    return { success: true };
  } catch (error) {
    // ✅ FIX: Usar 'issues' en lugar de 'errors'
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.issues[0]?.message || "Error de validación" 
      };
    }
    console.error("Error al guardar píxel:", error);
    return { success: false, error: "Error al guardar configuración" };
  }
}

// ============================================
// ELIMINAR PÍXEL
// ============================================

export async function deletePixel(platform: PixelPlatform) {
  const { response } = await requirePermission("settings:update");
  if (response) return { success: false, error: "No autorizado" };

  try {
    await prisma.trackingPixel.deleteMany({
      where: { platform },
    });

    revalidatePath("/admin/configuracion/pixeles");
    updateTag("tracking-pixels");

    return { success: true };
  } catch (error) {
    console.error("Error al eliminar píxel:", error);
    return { success: false, error: "Error al eliminar configuración" };
  }
}

// ============================================
// TOGGLE ESTADO
// ============================================

export async function togglePixel(platform: PixelPlatform, enabled: boolean) {
  const { response } = await requirePermission("settings:update");
  if (response) return { success: false, error: "No autorizado" };

  try {
    await prisma.trackingPixel.updateMany({
      where: { platform },
      data: { enabled },
    });

    revalidatePath("/admin/configuracion/pixeles");
    updateTag("tracking-pixels");

    return { success: true };
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    return { success: false, error: "Error al actualizar estado" };
  }
}

// ============================================
// OBTENER PÍXELES ACTIVOS (para frontend)
// ============================================

/**
 * Campos de `config` que el navegador necesita para inicializar los scripts
 * de píxel. Todo lo demás (`accessToken` de Meta/TikTok CAPI, `apiSecret` de
 * GA4 Measurement Protocol) es server-only: lo lee `lib/conversion-api.ts`
 * directamente de la BD y NUNCA debe salir en el payload RSC.
 */
const CLIENT_SAFE_PIXEL_FIELDS = [
  "pixelId",
  "testEventCode",
  "conversionId",
  "conversionLabel",
  "measurementId",
] as const;

function toClientSafeConfig(config: unknown): PixelConfig {
  if (typeof config !== "object" || config === null) return {} as PixelConfig;
  const source = config as Record<string, unknown>;
  const safe: Record<string, unknown> = {};

  for (const field of CLIENT_SAFE_PIXEL_FIELDS) {
    if (source[field] !== undefined) safe[field] = source[field];
  }

  return safe as PixelConfig;
}

/**
 * Cached delegate. The actual `unstable_cache` wrapper lives in
 * `lib/tracking-pixels.ts` because a `"use server"` module can't export
 * non-server-action helpers safely. Mutations below call
 * `updateTag("tracking-pixels")` to invalidate this read.
 *
 * PÚBLICO a propósito (lo consumen los layouts del storefront), por eso
 * devuelve la config saneada — sin credenciales de servidor.
 */
export async function getActivePixels(): Promise<{
  success: boolean;
  pixels: Array<{ platform: PixelPlatform; config: PixelConfig; testMode: boolean }>;
}> {
  const result = await getActivePixelsCached();
  return {
    success: result.success,
    pixels: result.pixels.map((p) => ({
      platform: p.platform,
      config: toClientSafeConfig(p.config),
      testMode: p.testMode,
    })),
  };
}
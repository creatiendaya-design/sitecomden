"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
          config: validatedConfig as any,
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
          config: validatedConfig as any,
          enabled,
          testMode,
          description,
        },
      });
    }

    revalidatePath("/admin/configuracion/pixeles");

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
  try {
    await prisma.trackingPixel.deleteMany({
      where: { platform },
    });

    revalidatePath("/admin/configuracion/pixeles");

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
  try {
    await prisma.trackingPixel.updateMany({
      where: { platform },
      data: { enabled },
    });

    revalidatePath("/admin/configuracion/pixeles");

    return { success: true };
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    return { success: false, error: "Error al actualizar estado" };
  }
}

// ============================================
// OBTENER PÍXELES ACTIVOS (para frontend)
// ============================================

export async function getActivePixels() {
  try {
    const pixels = await prisma.trackingPixel.findMany({
      where: { enabled: true },
      select: {
        platform: true,
        config: true,
        testMode: true,
      },
    });

    return {
      success: true,
      pixels: pixels.map((p) => ({
        platform: p.platform,
        config: p.config as PixelConfig,
        testMode: p.testMode,
      })),
    };
  } catch (error) {
    console.error("Error al obtener píxeles activos:", error);
    return { success: false, pixels: [] };
  }
}
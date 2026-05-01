// lib/customizer/validate.ts
import { z } from "zod";
import type { CustomDesign } from "./types";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const boundsSchema = z.object({
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().min(0).max(100),
  heightPct: z.number().min(0).max(100),
});

const snapshotSchema = z.object({
  allowedFonts: z.array(z.string()),
  allowedColors: z.array(z.string().regex(HEX_RE)),
  allowCustomColors: z.boolean(),
  maxLayersPerZone: z.number().int().positive(),
  maxCharsPerLayer: z.number().int().positive(),
  surcharge: z.number().nullable(),
  zones: z.array(z.object({ id: z.string(), name: z.string(), bounds: boundsSchema })),
});

const textLayerSchema = z.object({
  id: z.string().min(1),
  type: z.literal("TEXT"),
  text: z.string(),
  font: z.string(),
  size: z.number().min(8).max(200),
  color: z.string().regex(HEX_RE),
  letterSpacing: z.number().min(-10).max(50),
  rotation: z.number().min(0).max(360),
  x: z.number().min(-50).max(150),
  y: z.number().min(-50).max(150),
  width: z.number().positive(),
  height: z.number().positive(),
  align: z.enum(["left", "center", "right"]),
});

export const customDesignSchema = z.object({
  templateId: z.string().min(1),
  templateSnapshot: snapshotSchema,
  zones: z.array(
    z.object({
      zoneId: z.string(),
      layers: z.array(textLayerSchema),
    })
  ),
});

export type ValidationResult =
  | { success: true; data: CustomDesign }
  | { success: false; error: string };

export function validateCustomDesign(input: unknown): ValidationResult {
  const parsed = customDesignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Diseño inválido" };
  }
  const d = parsed.data;
  const snap = d.templateSnapshot;

  // Al menos una zona con layers
  const totalLayers = d.zones.reduce((acc, z) => acc + z.layers.length, 0);
  if (totalLayers === 0) {
    return { success: false, error: "El diseño debe tener al menos una capa de texto en alguna zona" };
  }

  const allowedZoneIds = new Set(snap.zones.map((z) => z.id));
  const allowedFonts = new Set(snap.allowedFonts);
  const allowedColors = new Set(snap.allowedColors.map((c) => c.toUpperCase()));

  for (const zone of d.zones) {
    if (!allowedZoneIds.has(zone.zoneId)) {
      return { success: false, error: `Zona desconocida: ${zone.zoneId}` };
    }
    if (zone.layers.length > snap.maxLayersPerZone) {
      return { success: false, error: `Zona ${zone.zoneId} excede el máximo de ${snap.maxLayersPerZone} capas` };
    }
    for (const layer of zone.layers) {
      if (layer.text.length > snap.maxCharsPerLayer) {
        return { success: false, error: `Texto excede los ${snap.maxCharsPerLayer} caracteres permitidos` };
      }
      if (!allowedFonts.has(layer.font)) {
        return { success: false, error: `Fuente no permitida: ${layer.font}` };
      }
      if (!snap.allowCustomColors && !allowedColors.has(layer.color.toUpperCase())) {
        return { success: false, error: `Color no permitido: ${layer.color}` };
      }
    }
  }

  return { success: true, data: d as CustomDesign };
}

const VERCEL_BLOB_DOMAIN_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/.+/i;

export function validateCustomDesignImageUrl(url: string): boolean {
  return VERCEL_BLOB_DOMAIN_RE.test(url);
}

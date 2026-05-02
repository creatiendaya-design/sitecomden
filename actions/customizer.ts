"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import type { CustomizableTemplateData, PrintZone, SizeGuide } from "@/lib/customizer/types";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const VERCEL_BLOB_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/.+/i;

const boundsSchema = z.object({
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().positive().max(100),
  heightPct: z.number().positive().max(100),
});

const zoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mockupImage: z.string().regex(VERCEL_BLOB_RE),
  bounds: boundsSchema,
  printResolutionDPI: z.number().int().min(72).max(600),
});

const sizeGuideSchema = z.object({
  unit: z.enum(["cm", "in"]),
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.object({ size: z.string(), values: z.record(z.string(), z.number()) })),
  notes: z.string().optional(),
}).nullable();

const templateInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  active: z.boolean(),
  surcharge: z.number().nullable(),
  zones: z.array(zoneSchema),
  allowedFonts: z.array(z.string()),
  allowedColors: z.array(z.string().regex(HEX_RE)),
  allowCustomColors: z.boolean(),
  sizeGuide: sizeGuideSchema,
  maxLayersPerZone: z.number().int().min(1).max(50),
  maxCharsPerLayer: z.number().int().min(1).max(500),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;
export type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string };

export async function saveCustomizableTemplate(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await requirePermission("customizables:create");
  if (auth.response) return { success: false, error: "No autorizado" };

  const parsed = templateInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;
  try {
    const created = await prisma.customizableTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        active: data.active,
        surcharge: data.surcharge,
        zones: data.zones as unknown as Prisma.InputJsonValue,
        allowedFonts: data.allowedFonts,
        allowedColors: data.allowedColors,
        allowCustomColors: data.allowCustomColors,
        sizeGuide: data.sizeGuide === null ? Prisma.JsonNull : (data.sizeGuide as unknown as Prisma.InputJsonValue),
        maxLayersPerZone: data.maxLayersPerZone,
        maxCharsPerLayer: data.maxCharsPerLayer,
      },
    });
    revalidatePath("/admin/personalizables");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al crear plantilla" };
  }
}

export async function updateCustomizableTemplate(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await requirePermission("customizables:update");
  if (auth.response) return { success: false, error: "No autorizado" };
  const parsed = templateInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const data = parsed.data;
  try {
    const updated = await prisma.customizableTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        active: data.active,
        surcharge: data.surcharge,
        zones: data.zones as unknown as Prisma.InputJsonValue,
        allowedFonts: data.allowedFonts,
        allowedColors: data.allowedColors,
        allowCustomColors: data.allowCustomColors,
        sizeGuide: data.sizeGuide === null ? Prisma.JsonNull : (data.sizeGuide as unknown as Prisma.InputJsonValue),
        maxLayersPerZone: data.maxLayersPerZone,
        maxCharsPerLayer: data.maxCharsPerLayer,
      },
    });
    revalidatePath("/admin/personalizables");
    revalidatePath(`/admin/personalizables/${id}`);
    return { success: true, data: { id: updated.id } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al actualizar" };
  }
}

export async function deleteCustomizableTemplate(id: string): Promise<ActionResult<null>> {
  const auth = await requirePermission("customizables:delete");
  if (auth.response) return { success: false, error: "No autorizado" };
  try {
    const inUse = await prisma.product.count({ where: { customizableTemplateId: id } });
    if (inUse > 0) {
      return { success: false, error: `No se puede eliminar: ${inUse} producto(s) usan esta plantilla. Desactívala en su lugar.` };
    }
    await prisma.customizableTemplate.delete({ where: { id } });
    revalidatePath("/admin/personalizables");
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al eliminar" };
  }
}

export async function listCustomizableTemplates(): Promise<CustomizableTemplateData[]> {
  const rows = await prisma.customizableTemplate.findMany({
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(rowToData);
}

export async function getCustomizableTemplate(id: string): Promise<CustomizableTemplateData | null> {
  const row = await prisma.customizableTemplate.findUnique({ where: { id } });
  return row ? rowToData(row) : null;
}

function rowToData(row: {
  id: string; name: string; description: string | null; active: boolean;
  surcharge: unknown; zones: unknown; allowedFonts: unknown; allowedColors: unknown;
  allowCustomColors: boolean; sizeGuide: unknown; maxLayersPerZone: number; maxCharsPerLayer: number;
}): CustomizableTemplateData {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    surcharge: row.surcharge ? Number(row.surcharge) : null,
    zones: (row.zones as PrintZone[]) ?? [],
    allowedFonts: (row.allowedFonts as string[]) ?? [],
    allowedColors: (row.allowedColors as string[]) ?? [],
    allowCustomColors: row.allowCustomColors,
    sizeGuide: (row.sizeGuide as SizeGuide | null) ?? null,
    maxLayersPerZone: row.maxLayersPerZone,
    maxCharsPerLayer: row.maxCharsPerLayer,
  };
}

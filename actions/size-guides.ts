// actions/size-guides.ts
"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sizeGuideDataSchema } from "@/lib/size-guides/schema";
import type {
  SizeGuideData,
  SizeGuideListItem,
  SizeGuideTab,
  SizeGuideTable,
} from "@/lib/size-guides/types";
import type { SizeUnit as PrismaSizeUnit, Prisma } from "@prisma/client";

function dbUnitToTs(u: PrismaSizeUnit): "cm" | "in" {
  return u === "IN" ? "in" : "cm";
}
function tsUnitToDb(u: "cm" | "in"): PrismaSizeUnit {
  return u === "in" ? "IN" : "CM";
}

function rowToData(row: {
  id: string;
  name: string;
  unit: PrismaSizeUnit;
  tabs: Prisma.JsonValue;
  table: Prisma.JsonValue;
  active: boolean;
}): SizeGuideData {
  return {
    id: row.id,
    name: row.name,
    unit: dbUnitToTs(row.unit),
    tabs: (row.tabs as unknown as SizeGuideTab[]) ?? [],
    table: (row.table as unknown as SizeGuideTable) ?? { columns: [], rows: [] },
    active: row.active,
  };
}

export async function listSizeGuides(): Promise<
  | { success: true; data: SizeGuideListItem[] }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:view");
  if (response) return { success: false, error: "No autorizado" };

  const rows = await prisma.sizeGuide.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return {
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      unit: dbUnitToTs(r.unit),
      active: r.active,
      productCount: r._count.products,
      updatedAt: r.updatedAt,
    })),
  };
}

export async function listActiveSizeGuides(): Promise<
  | { success: true; data: { id: string; name: string; unit: "cm" | "in" }[] }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:view");
  if (response) return { success: false, error: "No autorizado" };

  const rows = await prisma.sizeGuide.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true },
  });

  return {
    success: true,
    data: rows.map((r) => ({ id: r.id, name: r.name, unit: dbUnitToTs(r.unit) })),
  };
}

export async function getSizeGuide(id: string): Promise<
  | { success: true; data: SizeGuideData }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:view");
  if (response) return { success: false, error: "No autorizado" };

  const row = await prisma.sizeGuide.findUnique({ where: { id } });
  if (!row) return { success: false, error: "Guía no encontrada" };
  return { success: true, data: rowToData(row) };
}

export async function createSizeGuide(input: unknown): Promise<
  | { success: true; data: { id: string } }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:create");
  if (response) return { success: false, error: "No autorizado" };

  const parsed = sizeGuideDataSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const created = await prisma.sizeGuide.create({
    data: {
      name: parsed.data.name,
      unit: tsUnitToDb(parsed.data.unit),
      tabs: parsed.data.tabs as unknown as Prisma.InputJsonValue,
      table: parsed.data.table as unknown as Prisma.InputJsonValue,
      active: parsed.data.active,
    },
  });

  revalidatePath("/admin/guia-tallas");
  return { success: true, data: { id: created.id } };
}

export async function updateSizeGuide(id: string, input: unknown): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:update");
  if (response) return { success: false, error: "No autorizado" };

  const parsed = sizeGuideDataSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  await prisma.sizeGuide.update({
    where: { id },
    data: {
      name: parsed.data.name,
      unit: tsUnitToDb(parsed.data.unit),
      tabs: parsed.data.tabs as unknown as Prisma.InputJsonValue,
      table: parsed.data.table as unknown as Prisma.InputJsonValue,
      active: parsed.data.active,
    },
  });

  revalidatePath("/admin/guia-tallas");
  revalidatePath(`/admin/guia-tallas/${id}`);
  return { success: true };
}

export async function deleteSizeGuide(id: string): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:delete");
  if (response) return { success: false, error: "No autorizado" };

  await prisma.sizeGuide.delete({ where: { id } });
  revalidatePath("/admin/guia-tallas");
  return { success: true };
}

export async function duplicateSizeGuide(id: string): Promise<
  | { success: true; data: { id: string } }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:create");
  if (response) return { success: false, error: "No autorizado" };

  const orig = await prisma.sizeGuide.findUnique({ where: { id } });
  if (!orig) return { success: false, error: "Guía no encontrada" };

  const copy = await prisma.sizeGuide.create({
    data: {
      name: `${orig.name} (copia)`,
      unit: orig.unit,
      tabs: orig.tabs as Prisma.InputJsonValue,
      table: orig.table as Prisma.InputJsonValue,
      active: false,
    },
  });

  revalidatePath("/admin/guia-tallas");
  return { success: true, data: { id: copy.id } };
}

export async function toggleSizeGuideActive(id: string): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:update");
  if (response) return { success: false, error: "No autorizado" };

  const row = await prisma.sizeGuide.findUnique({ where: { id }, select: { active: true } });
  if (!row) return { success: false, error: "Guía no encontrada" };
  await prisma.sizeGuide.update({ where: { id }, data: { active: !row.active } });

  revalidatePath("/admin/guia-tallas");
  return { success: true };
}

"use server"

import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"

/**
 * Plan 19 — CRUD for per-product theme-section templates (Shopify OS 2.0
 * "product templates"). A theme owns exactly one `isDefault` template plus
 * any number of named ones. Products point at one via
 * `Product.themeProductTemplateId`; null falls back to the default.
 *
 * Section editing itself lives in actions/theme-sections.ts (scoped by
 * `productTemplateId`). This file manages the template containers + the
 * product↔template assignment.
 */

const NEON_TX_OPTS = { timeout: 30_000, maxWait: 10_000 }

export interface ProductTemplateRow {
  id: string
  themeId: string
  name: string
  isDefault: boolean
  position: number
  /** Count of PRODUCT sections in this template (for the picker UI). */
  sectionCount: number
}

/** Resolve the live (non-preview) active theme id for admin-side mutations. */
async function getActiveThemeId(): Promise<string> {
  const theme = await prisma.theme.findFirst({
    where: { active: true },
    select: { id: true },
  })
  if (!theme) throw new Error("No hay un tema activo configurado")
  return theme.id
}

function toRow(t: {
  id: string
  themeId: string
  name: string
  isDefault: boolean
  position: number
  _count: { sections: number }
}): ProductTemplateRow {
  return {
    id: t.id,
    themeId: t.themeId,
    name: t.name,
    isDefault: t.isDefault,
    position: t.position,
    sectionCount: t._count.sections,
  }
}

// ---------- List ----------

/**
 * List a theme's product templates (default first, then by position). When
 * `themeId` is omitted, resolves the active theme — used by the product form
 * which doesn't know the theme id.
 */
export async function listProductTemplates(
  themeId?: string,
): Promise<ProductTemplateRow[]> {
  await protectRoute("themes:update")
  const id = themeId ?? (await getActiveThemeId())
  const rows = await prisma.themeProductTemplate.findMany({
    where: { themeId: id },
    orderBy: [{ isDefault: "desc" }, { position: "asc" }],
    select: {
      id: true,
      themeId: true,
      name: true,
      isDefault: true,
      position: true,
      _count: { select: { sections: true } },
    },
  })
  return rows.map(toRow)
}

// ---------- Create ----------

const createSchema = z.object({
  name: z.string().min(1).max(80),
  themeId: z.string().min(1).optional(),
  copyFromDefault: z.boolean().optional(),
})

/**
 * Create a new product template. By default it copies the theme's default
 * template's sections so it doesn't start blank (admins almost always want
 * a working buy zone as a starting point). Pass `copyFromDefault: false`
 * for an empty template.
 */
export async function createProductTemplate(
  name: string,
  opts?: { themeId?: string; copyFromDefault?: boolean },
): Promise<ProductTemplateRow> {
  await protectRoute("themes:update")
  const input = createSchema.parse({
    name,
    themeId: opts?.themeId,
    copyFromDefault: opts?.copyFromDefault ?? true,
  })
  const themeId = input.themeId ?? (await getActiveThemeId())

  const created = await prisma.$transaction(async (tx) => {
    const last = await tx.themeProductTemplate.findFirst({
      where: { themeId },
      orderBy: { position: "desc" },
      select: { position: true },
    })
    const position = (last?.position ?? -1) + 1

    const tpl = await tx.themeProductTemplate.create({
      data: { themeId, name: input.name.trim(), isDefault: false, position },
    })

    if (input.copyFromDefault) {
      const def = await tx.themeProductTemplate.findFirst({
        where: { themeId, isDefault: true },
        select: { id: true },
      })
      if (def) {
        await copyTemplateSections(tx, def.id, tpl.id, themeId)
      }
    }

    return tx.themeProductTemplate.findUniqueOrThrow({
      where: { id: tpl.id },
      select: {
        id: true,
        themeId: true,
        name: true,
        isDefault: true,
        position: true,
        _count: { select: { sections: true } },
      },
    })
  }, NEON_TX_OPTS)

  revalidatePath(`/admin/personalizar/temas/${themeId}/customize`)
  return toRow(created)
}

// ---------- Duplicate ----------

const duplicateSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1).max(80),
})

/** Duplicate a template (sections + sub-blocks) under a new name. */
export async function duplicateProductTemplate(
  templateId: string,
  name: string,
): Promise<ProductTemplateRow> {
  await protectRoute("themes:update")
  const input = duplicateSchema.parse({ templateId, name })

  const source = await prisma.themeProductTemplate.findUnique({
    where: { id: input.templateId },
    select: { id: true, themeId: true },
  })
  if (!source) throw new Error("Plantilla no encontrada")

  const created = await prisma.$transaction(async (tx) => {
    const last = await tx.themeProductTemplate.findFirst({
      where: { themeId: source.themeId },
      orderBy: { position: "desc" },
      select: { position: true },
    })
    const position = (last?.position ?? -1) + 1

    const tpl = await tx.themeProductTemplate.create({
      data: {
        themeId: source.themeId,
        name: input.name.trim(),
        isDefault: false,
        position,
      },
    })
    await copyTemplateSections(tx, source.id, tpl.id, source.themeId)

    return tx.themeProductTemplate.findUniqueOrThrow({
      where: { id: tpl.id },
      select: {
        id: true,
        themeId: true,
        name: true,
        isDefault: true,
        position: true,
        _count: { select: { sections: true } },
      },
    })
  }, NEON_TX_OPTS)

  revalidatePath(`/admin/personalizar/temas/${source.themeId}/customize`)
  return toRow(created)
}

/**
 * Copy all PRODUCT sections (+ sub-blocks) from one template to another.
 * Shared by create(copyFromDefault) and duplicate. Runs inside a caller
 * transaction.
 */
async function copyTemplateSections(
  tx: Prisma.TransactionClient,
  sourceTemplateId: string,
  targetTemplateId: string,
  themeId: string,
): Promise<void> {
  const sections = await tx.themeSection.findMany({
    where: { productTemplateId: sourceTemplateId, productId: null },
    orderBy: { position: "asc" },
    include: { blocks: { orderBy: { position: "asc" } } },
  })
  for (const s of sections) {
    await tx.themeSection.create({
      data: {
        themeId,
        group: "PRODUCT",
        productTemplateId: targetTemplateId,
        type: s.type,
        position: s.position,
        content: s.content as object,
        enabled: s.enabled,
        blocks: {
          create: s.blocks.map((b) => ({
            type: b.type,
            position: b.position,
            content: b.content as object,
            enabled: b.enabled,
          })),
        },
      },
    })
  }
}

// ---------- Rename ----------

const renameSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1).max(80),
})

export async function renameProductTemplate(
  templateId: string,
  name: string,
): Promise<void> {
  await protectRoute("themes:update")
  const input = renameSchema.parse({ templateId, name })
  const tpl = await prisma.themeProductTemplate.update({
    where: { id: input.templateId },
    data: { name: input.name.trim() },
    select: { themeId: true },
  })
  revalidatePath(`/admin/personalizar/temas/${tpl.themeId}/customize`)
}

// ---------- Delete ----------

/**
 * Delete a template. The default template can't be deleted. Assigned
 * products fall back to the default (FK `onDelete: SetNull`), so their pages
 * must be revalidated.
 */
export async function deleteProductTemplate(templateId: string): Promise<void> {
  await protectRoute("themes:update")
  const tpl = await prisma.themeProductTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, themeId: true, isDefault: true },
  })
  if (!tpl) return
  if (tpl.isDefault) {
    throw new Error("No se puede eliminar la plantilla predeterminada")
  }

  await prisma.themeProductTemplate.delete({ where: { id: templateId } })

  // Sections cascade-deleted. Products pointing here reverted to default.
  updateTag(`theme-product-template-${templateId}`)
  updateTag("products")
  revalidatePath(`/admin/personalizar/temas/${tpl.themeId}/customize`)
}

// ---------- Set default ----------

/**
 * Make `templateId` the theme's default (singleton, like Theme.active). All
 * unassigned products render the default, so their pages are revalidated.
 */
export async function setDefaultProductTemplate(
  templateId: string,
): Promise<void> {
  await protectRoute("themes:update")
  const tpl = await prisma.themeProductTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, themeId: true },
  })
  if (!tpl) throw new Error("Plantilla no encontrada")

  await prisma.$transaction([
    prisma.themeProductTemplate.updateMany({
      where: { themeId: tpl.themeId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.themeProductTemplate.update({
      where: { id: templateId },
      data: { isDefault: true },
    }),
  ])

  updateTag(`theme-default-product-template-${tpl.themeId}`)
  updateTag("products")
  revalidatePath(`/admin/personalizar/temas/${tpl.themeId}/customize`)
}

// ---------- Assign to product ----------

const assignSchema = z.object({
  productId: z.string().min(1),
  templateId: z.string().min(1).nullable(),
})

/**
 * Assign a product to a template (or null = use the theme default).
 * Does NOT touch the product's section overrides (Fase 3). Uses
 * `products:update` since this is product metadata.
 */
export async function assignProductTemplate(
  productId: string,
  templateId: string | null,
): Promise<{ success: true }> {
  await protectRoute("products:update")
  const input = assignSchema.parse({ productId, templateId })

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, slug: true },
  })
  if (!product) throw new Error("Producto no encontrado")

  // Guard: the template must belong to the active theme.
  if (input.templateId) {
    const themeId = await getActiveThemeId()
    const tpl = await prisma.themeProductTemplate.findFirst({
      where: { id: input.templateId, themeId },
      select: { id: true },
    })
    if (!tpl) throw new Error("Plantilla no válida para el tema activo")
  }

  await prisma.product.update({
    where: { id: input.productId },
    data: { themeProductTemplateId: input.templateId },
  })

  updateTag(`product:${product.slug}`)
  updateTag("products")
  revalidatePath(`/admin/productos/${productId}`)
  return { success: true }
}

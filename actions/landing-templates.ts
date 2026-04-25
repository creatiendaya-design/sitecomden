"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"
import type { LandingBlockType, Prisma } from "@prisma/client"

export interface TemplateRow {
  id: string
  name: string
  description: string | null
  category: string | null
  thumbnail: string | null
  active: boolean
  blockCount: number
  productCount: number
  updatedAt: Date
}

export interface TemplateWithBlocks extends TemplateRow {
  templateBlocks: {
    id: string
    type: string
    position: number
    content: unknown
  }[]
}

interface ListFilters {
  active?: boolean
  category?: string
  q?: string
}

export async function listLandingTemplates(filters?: ListFilters): Promise<TemplateRow[]> {
  await protectRoute("landing_templates:view")

  const rows = await prisma.landingTemplate.findMany({
    where: {
      ...(filters?.active !== undefined && { active: filters.active }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.q && {
        OR: [
          { name: { contains: filters.q, mode: "insensitive" } },
          { description: { contains: filters.q, mode: "insensitive" } },
        ],
      }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      thumbnail: true,
      active: true,
      updatedAt: true,
      _count: {
        select: { templateBlocks: true, products: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    thumbnail: r.thumbnail,
    active: r.active,
    blockCount: r._count.templateBlocks,
    productCount: r._count.products,
    updatedAt: r.updatedAt,
  }))
}

export async function getLandingTemplate(id: string): Promise<TemplateWithBlocks | null> {
  await protectRoute("landing_templates:view")

  const t = await prisma.landingTemplate.findUnique({
    where: { id },
    include: {
      templateBlocks: { orderBy: { position: "asc" } },
      _count: { select: { templateBlocks: true, products: true } },
    },
  })
  if (!t) return null

  return {
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    thumbnail: t.thumbnail,
    active: t.active,
    updatedAt: t.updatedAt,
    blockCount: t._count.templateBlocks,
    productCount: t._count.products,
    templateBlocks: t.templateBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      position: b.position,
      content: b.content,
    })),
  }
}

export async function createLandingTemplate(input: {
  name: string
  description?: string
  category?: string
}): Promise<{ id: string }> {
  const userId = await protectRoute("landing_templates:create")

  if (!input.name.trim()) {
    throw new Error("El nombre es obligatorio")
  }

  const t = await prisma.landingTemplate.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      createdBy: userId,
    },
  })

  revalidatePath("/admin/landing-plantillas")
  return { id: t.id }
}

export async function updateLandingTemplateMetadata(
  id: string,
  input: { name?: string; description?: string | null; category?: string | null; thumbnail?: string | null },
): Promise<void> {
  await protectRoute("landing_templates:update")

  await prisma.landingTemplate.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
      ...(input.category !== undefined && { category: input.category?.trim() || null }),
      ...(input.thumbnail !== undefined && { thumbnail: input.thumbnail }),
    },
  })

  revalidatePath("/admin/landing-plantillas")
}

export async function toggleLandingTemplateActive(id: string): Promise<void> {
  await protectRoute("landing_templates:update")

  const t = await prisma.landingTemplate.findUnique({ where: { id }, select: { active: true } })
  if (!t) throw new Error("Plantilla no encontrada")

  await prisma.landingTemplate.update({
    where: { id },
    data: { active: !t.active },
  })

  revalidatePath("/admin/landing-plantillas")
}

export async function deleteLandingTemplate(id: string): Promise<void> {
  await protectRoute("landing_templates:delete")

  // Orphan handling: any LandingBlock that referenced one of this template's
  // blocks (via sourceTemplateBlockId) becomes pure-local. The Prisma schema
  // does NOT cascade that link, so do it explicitly first.
  const blockIds = await prisma.templateBlock.findMany({
    where: { templateId: id },
    select: { id: true },
  })
  if (blockIds.length > 0) {
    await prisma.landingBlock.updateMany({
      where: { sourceTemplateBlockId: { in: blockIds.map((b) => b.id) } },
      data: { sourceTemplateBlockId: null, detached: false },
    })
  }

  // Delete the template (cascades to TemplateBlock; SET NULL on Product.landingTemplateId).
  await prisma.landingTemplate.delete({ where: { id } })

  revalidatePath("/admin/landing-plantillas")
}

export async function countProductsUsingTemplate(id: string): Promise<number> {
  await protectRoute("landing_templates:view")
  return prisma.product.count({ where: { landingTemplateId: id } })
}

interface IncomingBlock {
  id: string
  type: LandingBlockType
  position: number
  content: unknown
}

/**
 * Explicit-save for the template editor. Reconciles TemplateBlock rows inside
 * a single transaction:
 *  - rows not present in `incomingBlocks` are deleted
 *  - rows whose id starts with "tmp-" (or isn't in the DB) are created
 *  - remaining rows are updated (type/position/content)
 *
 * After save we bump the template's `updatedAt` and revalidate the editor
 * path + the `template:${id}` tag used by product landing rendering.
 *
 * Note: newly-created blocks come back with fresh ids on the next fetch; the
 * client calls `router.refresh()` after save, which reloads the template and
 * replaces the builder store's snapshot with real ids.
 */
export async function saveTemplateBlocks(
  templateId: string,
  incomingBlocks: IncomingBlock[],
): Promise<{ success: true }> {
  await protectRoute("landing_templates:update")

  await prisma.$transaction(async (tx) => {
    const existing = await tx.templateBlock.findMany({
      where: { templateId },
      select: { id: true },
    })
    const existingIds = new Set(existing.map((b) => b.id))
    const incomingIds = new Set(incomingBlocks.map((b) => b.id))

    // Delete removed blocks
    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length > 0) {
      await tx.templateBlock.deleteMany({ where: { id: { in: toDelete } } })
    }

    // Upsert each incoming block
    for (const b of incomingBlocks) {
      // tmp- ids come from new blocks added in this session; create them.
      if (b.id.startsWith("tmp-") || !existingIds.has(b.id)) {
        await tx.templateBlock.create({
          data: {
            templateId,
            type: b.type,
            position: b.position,
            content: b.content as object,
          },
        })
      } else {
        await tx.templateBlock.update({
          where: { id: b.id },
          data: {
            type: b.type,
            position: b.position,
            content: b.content as object,
          },
        })
      }
    }

    await tx.landingTemplate.update({
      where: { id: templateId },
      data: { updatedAt: new Date() },
    })
  })

  updateTag(`template:${templateId}`)
  revalidatePath(`/admin/landing-plantillas/${templateId}`)
  return { success: true }
}

/**
 * Apply a template to a product (linking) or unlink it (templateId = null).
 *
 * Linking semantics: every existing LandingBlock for the product is removed
 * (locals + any detached overrides from a previous template). The product's
 * landingTemplateId is then set to the new template; from there it renders
 * solely from TemplateBlock rows. Future template edits propagate
 * automatically (the product owns no overrides yet).
 *
 * Unlinking (templateId = null): same delete + clear pointer. Caller is
 * expected to seed local blocks separately if they want to keep content.
 */
export async function applyTemplateToProduct(
  productId: string,
  templateId: string | null,
): Promise<{ success: true }> {
  await protectRoute("products:update")

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true },
  })
  if (!product) throw new Error("Producto no encontrado")

  await prisma.$transaction(async (tx) => {
    await tx.landingBlock.deleteMany({ where: { productId } })

    await tx.product.update({
      where: { id: productId },
      data: { landingTemplateId: templateId },
    })
  })

  updateTag(`product:${product.slug}`)
  if (templateId) updateTag(`template:${templateId}`)
  revalidatePath(`/admin/productos/${productId}`)
  return { success: true }
}

export async function saveProductLandingAsTemplate(
  productId: string,
  metadata: { name: string; description?: string; category?: string },
): Promise<{ templateId: string }> {
  const userId = await protectRoute("landing_templates:create")

  if (!metadata.name.trim()) {
    throw new Error("El nombre es obligatorio")
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, landingBlocks: { orderBy: { position: "asc" } } },
  })
  if (!product) throw new Error("Producto no encontrado")
  if (product.landingBlocks.length === 0) {
    throw new Error("El producto no tiene bloques para guardar como plantilla")
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the new template.
    const template = await tx.landingTemplate.create({
      data: {
        name: metadata.name.trim(),
        description: metadata.description?.trim() || null,
        category: metadata.category?.trim() || null,
        createdBy: userId,
      },
    })

    // 2. Copy each LandingBlock as a TemplateBlock with identical type/position/content.
    if (product.landingBlocks.length > 0) {
      await tx.templateBlock.createMany({
        data: product.landingBlocks.map((b) => ({
          templateId: template.id,
          type: b.type,
          position: b.position,
          content: b.content as object,
        })),
      })
    }

    // 3. Link the product to the new template.
    await tx.product.update({
      where: { id: productId },
      data: { landingTemplateId: template.id },
    })

    // 4. Delete the product's LandingBlock rows — they are now served from
    //    the template via the resolver.
    await tx.landingBlock.deleteMany({ where: { productId } })

    return { templateId: template.id }
  })

  updateTag(`product:${product.slug}`)
  updateTag(`template:${result.templateId}`)
  revalidatePath("/admin/landing-plantillas")
  revalidatePath(`/admin/productos/${productId}`)
  return result
}

/**
 * Detach a single inherited TemplateBlock for a product. Creates a LandingBlock
 * row that mirrors the TemplateBlock content (same type/position/content) and
 * marks it `detached = true` with `sourceTemplateBlockId` pointing back. From
 * this point the resolver returns the local override (origin = "detached")
 * instead of the inherited template content; subsequent template edits no
 * longer affect this product's copy.
 *
 * Idempotent — if a detached override already exists for the same template
 * block (e.g. double-click race), returns the existing one instead of throwing.
 */
export async function detachTemplateBlock(
  productId: string,
  templateBlockId: string,
): Promise<{ landingBlockId: string }> {
  await protectRoute("products:update")

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, landingTemplateId: true },
  })
  if (!product) throw new Error("Producto no encontrado")
  if (!product.landingTemplateId) throw new Error("El producto no tiene plantilla asignada")

  const templateBlock = await prisma.templateBlock.findUnique({
    where: { id: templateBlockId },
    select: { id: true, templateId: true, type: true, position: true, content: true },
  })
  if (!templateBlock) throw new Error("Bloque de plantilla no encontrado")
  if (templateBlock.templateId !== product.landingTemplateId) {
    throw new Error("El bloque no pertenece a la plantilla del producto")
  }

  const existing = await prisma.landingBlock.findFirst({
    where: { productId, sourceTemplateBlockId: templateBlockId },
    select: { id: true },
  })
  if (existing) {
    return { landingBlockId: existing.id }
  }

  const created = await prisma.landingBlock.create({
    data: {
      productId,
      type: templateBlock.type,
      position: templateBlock.position,
      content: templateBlock.content as Prisma.InputJsonValue,
      sourceTemplateBlockId: templateBlock.id,
      detached: true,
    },
    select: { id: true },
  })

  updateTag(`product:${product.slug}`)
  revalidatePath(`/admin/productos/${productId}`)
  return { landingBlockId: created.id }
}

/**
 * Restore a single detached block back to its template by deleting the
 * LandingBlock override row. The resolver will fall back to the TemplateBlock
 * on the next read.
 */
export async function restoreTemplateBlock(
  productId: string,
  landingBlockId: string,
): Promise<void> {
  await protectRoute("products:update")

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true },
  })
  if (!product) throw new Error("Producto no encontrado")

  await prisma.landingBlock.deleteMany({
    where: { id: landingBlockId, productId },
  })

  updateTag(`product:${product.slug}`)
  revalidatePath(`/admin/productos/${productId}`)
}

/**
 * Unlink a product from its template: every TemplateBlock the product was
 * inheriting becomes a pure-local LandingBlock (content copied), every
 * detached LandingBlock loses its sourceTemplateBlockId / detached flag and
 * stays as a local block, and Product.landingTemplateId is cleared.
 */
export async function unlinkTemplateFromProduct(productId: string): Promise<void> {
  await protectRoute("products:update")

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      slug: true,
      landingTemplateId: true,
      landingBlocks: {
        select: { id: true, sourceTemplateBlockId: true, detached: true },
      },
    },
  })
  if (!product) throw new Error("Producto no encontrado")
  if (!product.landingTemplateId) return // already unlinked

  const templateBlocks = await prisma.templateBlock.findMany({
    where: { templateId: product.landingTemplateId },
    orderBy: { position: "asc" },
  })

  const detachedSourceIds = new Set(
    product.landingBlocks
      .filter((b) => b.detached && b.sourceTemplateBlockId)
      .map((b) => b.sourceTemplateBlockId!),
  )

  await prisma.$transaction(async (tx) => {
    if (detachedSourceIds.size > 0) {
      await tx.landingBlock.updateMany({
        where: {
          productId,
          sourceTemplateBlockId: { in: [...detachedSourceIds] },
          detached: true,
        },
        data: { sourceTemplateBlockId: null, detached: false },
      })
    }

    const inheritedTemplateBlocks = templateBlocks.filter((tb) => !detachedSourceIds.has(tb.id))
    if (inheritedTemplateBlocks.length > 0) {
      await tx.landingBlock.createMany({
        data: inheritedTemplateBlocks.map((tb) => ({
          productId,
          type: tb.type,
          position: tb.position,
          content: tb.content as Prisma.InputJsonValue,
          sourceTemplateBlockId: null,
          detached: false,
        })),
      })
    }

    await tx.product.update({
      where: { id: productId },
      data: { landingTemplateId: null },
    })
  })

  updateTag(`product:${product.slug}`)
  revalidatePath(`/admin/productos/${productId}`)
}

"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { protectRoute } from "@/lib/protect-route"

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

"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"
import type { LandingBlockType } from "@prisma/client"

export interface CategoryWithBlocks {
  id: string
  slug: string
  name: string
  hideProductGrid: boolean
  blocks: { id: string; type: LandingBlockType; position: number; content: unknown }[]
}

export async function getCategoryWithBlocks(
  id: string,
): Promise<CategoryWithBlocks | null> {
  await protectRoute("categories:update")
  const c = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      hideProductGrid: true,
      categoryBlocks: { orderBy: { position: "asc" } },
    },
  })
  if (!c) return null
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    hideProductGrid: c.hideProductGrid,
    blocks: c.categoryBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      position: b.position,
      content: b.content,
    })),
  }
}

interface IncomingBlock {
  id: string
  type: LandingBlockType
  position: number
  content: unknown
}

/**
 * Saves the full block list for a category in a single transaction.
 * Mirrors `savePageBlocks` — handles tmp-ids for new blocks, deletes
 * removed ones, and updates positions.
 */
export async function saveCategoryBlocks(
  categoryId: string,
  incomingBlocks: IncomingBlock[],
): Promise<{ success: true }> {
  await protectRoute("categories:update")

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { slug: true },
  })
  if (!category) throw new Error("Categoría no encontrada")

  await prisma.$transaction(async (tx) => {
    const existing = await tx.categoryBlock.findMany({
      where: { categoryId },
      select: { id: true },
    })
    const existingIds = new Set(existing.map((b) => b.id))
    const incomingIds = new Set(incomingBlocks.map((b) => b.id))

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length > 0) {
      await tx.categoryBlock.deleteMany({ where: { id: { in: toDelete } } })
    }

    for (const b of incomingBlocks) {
      if (b.id.startsWith("tmp-") || !existingIds.has(b.id)) {
        await tx.categoryBlock.create({
          data: {
            categoryId,
            type: b.type,
            position: b.position,
            content: b.content as object,
          },
        })
      } else {
        await tx.categoryBlock.update({
          where: { id: b.id },
          data: {
            type: b.type,
            position: b.position,
            content: b.content as object,
          },
        })
      }
    }

    await tx.category.update({
      where: { id: categoryId },
      data: { updatedAt: new Date() },
    })
  })

  updateTag(`category:${category.slug}`)
  revalidatePath(`/categoria/${category.slug}`)
  revalidatePath(`/admin/categorias/${categoryId}/builder`)
  return { success: true }
}

export async function toggleHideProductGrid(
  categoryId: string,
): Promise<{ hideProductGrid: boolean }> {
  await protectRoute("categories:update")
  const c = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { slug: true, hideProductGrid: true },
  })
  if (!c) throw new Error("Categoría no encontrada")

  const next = !c.hideProductGrid
  await prisma.category.update({
    where: { id: categoryId },
    data: { hideProductGrid: next },
  })

  updateTag(`category:${c.slug}`)
  revalidatePath(`/categoria/${c.slug}`)
  revalidatePath(`/admin/categorias/${categoryId}`)
  return { hideProductGrid: next }
}

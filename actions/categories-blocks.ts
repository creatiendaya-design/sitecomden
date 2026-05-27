"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"
import { getCurrentUserIdOrNull } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { assertKnownBlockType, type LandingBlockType } from "@/lib/types/landing-blocks"
import { invalidateCategory } from "@/lib/cache/invalidate"
import {
  BatchRaceError,
  batchConflict,
  batchErrored,
  batchOk,
  batchUnauthorized,
  isBatchRaceError,
  precheckBatchConflicts,
  type BatchSaveResult,
} from "@/lib/concurrency/batch"

export interface CategoryBlockRow {
  id: string
  type: LandingBlockType
  position: number
  content: unknown
  /** Plan 18 — per-block optimistic-locking version. */
  version: number
}

export interface CategoryWithBlocks {
  id: string
  slug: string
  name: string
  hideProductGrid: boolean
  blocks: CategoryBlockRow[]
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
      version: b.version,
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
  for (const b of incomingBlocks) assertKnownBlockType(b.type)

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
  invalidateCategory(category.slug)
  invalidateCategory(categoryId)
  revalidatePath(`/categoria/${category.slug}`)
  revalidatePath(`/admin/categorias/${categoryId}/builder`)
  return { success: true }
}

/**
 * Plan 18 — version-aware variant of `saveCategoryBlocks`. Mirrors
 * `savePageBlocksVersioned`: each existing block carries its `version`,
 * new blocks are "tmp-…" ids without version. All-or-nothing.
 */
interface IncomingBlockVersioned extends IncomingBlock {
  version?: number
}

export async function saveCategoryBlocksVersioned(
  categoryId: string,
  incomingBlocks: IncomingBlockVersioned[],
): Promise<
  BatchSaveResult<{ blocks: CategoryBlockRow[] }, CategoryBlockRow>
> {
  const userId = await getCurrentUserIdOrNull()
  if (!userId) return batchUnauthorized()
  const allowed = await hasPermission(userId, "categories:update")
  if (!allowed) return batchUnauthorized()

  for (const b of incomingBlocks) assertKnownBlockType(b.type)

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { slug: true },
  })
  if (!category) return { ok: false, reason: "not_found" }

  const conflicts = await precheckBatchConflicts({
    model: prisma.categoryBlock,
    rows: incomingBlocks.map((b) => ({ id: b.id, version: b.version })),
    refetchForConflict: async (id) => {
      const fresh = await prisma.categoryBlock.findUnique({ where: { id } })
      if (!fresh) return null
      return {
        id: fresh.id,
        type: fresh.type,
        position: fresh.position,
        content: fresh.content,
        version: fresh.version,
      } satisfies CategoryBlockRow
    },
  })
  if (conflicts.length > 0) return batchConflict(conflicts)

  try {
    const persisted = await prisma.$transaction(async (tx) => {
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
        const isNew = b.id.startsWith("tmp-") || !existingIds.has(b.id)
        if (isNew) {
          await tx.categoryBlock.create({
            data: {
              categoryId,
              type: b.type,
              position: b.position,
              content: b.content as object,
            },
          })
        } else {
          if (typeof b.version !== "number") {
            throw new BatchRaceError(b.id)
          }
          const upd = await tx.categoryBlock.updateMany({
            where: { id: b.id, version: b.version },
            data: {
              type: b.type,
              position: b.position,
              content: b.content as object,
              version: { increment: 1 },
            },
          })
          if (upd.count === 0) throw new BatchRaceError(b.id)
        }
      }

      await tx.category.update({
        where: { id: categoryId },
        data: { updatedAt: new Date() },
      })

      return tx.categoryBlock.findMany({
        where: { categoryId },
        orderBy: { position: "asc" },
      })
    })

    updateTag(`category:${category.slug}`)
    invalidateCategory(category.slug)
    invalidateCategory(categoryId)
    revalidatePath(`/categoria/${category.slug}`)
    revalidatePath(`/admin/categorias/${categoryId}/builder`)

    return batchOk<{ blocks: CategoryBlockRow[] }, CategoryBlockRow>({
      blocks: persisted.map((b) => ({
        id: b.id,
        type: b.type,
        position: b.position,
        content: b.content,
        version: b.version,
      })),
    })
  } catch (err) {
    if (isBatchRaceError(err)) {
      const fresh = await prisma.categoryBlock.findUnique({
        where: { id: err.rowId },
      })
      return batchConflict<CategoryBlockRow>([
        {
          rowId: err.rowId,
          current: fresh
            ? {
                id: fresh.id,
                type: fresh.type,
                position: fresh.position,
                content: fresh.content,
                version: fresh.version,
              }
            : null,
          serverVersion: fresh?.version ?? null,
        },
      ])
    }
    return batchErrored(
      err instanceof Error ? err.message : "Error al guardar bloques",
    )
  }
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
  invalidateCategory(c.slug)
  invalidateCategory(categoryId)
  revalidatePath(`/categoria/${c.slug}`)
  revalidatePath(`/admin/categorias/${categoryId}`)
  return { hideProductGrid: next }
}

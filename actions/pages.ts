"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"
import { getCurrentUserIdOrNull } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { assertKnownBlockType, type LandingBlockType } from "@/lib/types/landing-blocks"
import { isReservedSlug } from "@/lib/pages/reserved-slugs"
import { z } from "zod"
import { createPageSchema } from "@/lib/validations/admin"
import { logAudit } from "@/lib/audit-log"
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

function flattenZodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join("; ")
}

export interface PageRow {
  id: string
  slug: string
  title: string
  description: string | null
  /** SEO `<title>` override; null falls back to `title`. */
  seoTitle: string | null
  /** SEO meta description override; null falls back to `description`. */
  seoDescription: string | null
  /** Open Graph image URL; null = no image in social previews. */
  seoImage: string | null
  /** When true, emit `<meta name="robots" content="noindex,nofollow">`. */
  noIndex: boolean
  active: boolean
  blockCount: number
  updatedAt: Date
}

export interface PageWithBlocks extends PageRow {
  pageBlocks: {
    id: string
    type: string
    position: number
    content: unknown
    /** Plan 18 — per-block optimistic-locking version. */
    version: number
  }[]
}

export async function listPages(): Promise<PageRow[]> {
  await protectRoute("pages:view")
  const rows = await prisma.page.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      seoTitle: true,
      seoDescription: true,
      seoImage: true,
      noIndex: true,
      active: true,
      updatedAt: true,
      _count: { select: { pageBlocks: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
    seoImage: r.seoImage,
    noIndex: r.noIndex,
    active: r.active,
    blockCount: r._count.pageBlocks,
    updatedAt: r.updatedAt,
  }))
}

/**
 * Slim variant of `listPages` for use inside the theme picker UI. Gated by
 * `themes:update` (not `pages:view`) so an admin who can edit themes but
 * not browse the full Pages section can still pick a home page.
 */
export async function listPagesForThemePicker(): Promise<PageRow[]> {
  await protectRoute("themes:update")
  const rows = await prisma.page.findMany({
    where: { active: true },
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      seoTitle: true,
      seoDescription: true,
      seoImage: true,
      noIndex: true,
      active: true,
      updatedAt: true,
      _count: { select: { pageBlocks: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
    seoImage: r.seoImage,
    noIndex: r.noIndex,
    active: r.active,
    blockCount: r._count.pageBlocks,
    updatedAt: r.updatedAt,
  }))
}

export async function getPage(id: string): Promise<PageWithBlocks | null> {
  await protectRoute("pages:view")
  const p = await prisma.page.findUnique({
    where: { id },
    include: {
      pageBlocks: { orderBy: { position: "asc" } },
      _count: { select: { pageBlocks: true } },
    },
  })
  if (!p) return null
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    seoImage: p.seoImage,
    noIndex: p.noIndex,
    active: p.active,
    blockCount: p._count.pageBlocks,
    updatedAt: p.updatedAt,
    pageBlocks: p.pageBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      position: b.position,
      content: b.content,
      version: b.version,
    })),
  }
}

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function createPage(input: {
  slug: string
  title: string
  description?: string
  seoTitle?: string
  seoDescription?: string
  seoImage?: string
  noIndex?: boolean
}): Promise<{ id: string }> {
  const userId = await protectRoute("pages:create")

  // Pre-normalize so the schema's regex check sees the cleaned slug.
  const normalized = {
    ...input,
    slug: normalizeSlug(input.slug),
  }
  const parsed = createPageSchema.safeParse(normalized)
  if (!parsed.success) throw new Error(flattenZodError(parsed.error))

  const slug = parsed.data.slug
  if (isReservedSlug(slug)) {
    throw new Error(
      `El slug "${slug}" está reservado por el sistema. Elegí otro.`,
    )
  }

  const exists = await prisma.page.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (exists) {
    throw new Error(`Ya existe una página con el slug "${slug}".`)
  }

  const p = await prisma.page.create({
    data: {
      slug,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      seoTitle: input.seoTitle?.trim() || null,
      seoDescription: input.seoDescription?.trim() || null,
      seoImage: input.seoImage?.trim() || null,
      noIndex: input.noIndex ?? false,
      createdBy: userId,
    },
  })
  revalidatePath("/admin/paginas")

  await logAudit({
    action: "page.created",
    userId,
    entityType: "Page",
    entityId: p.id,
    after: { slug: p.slug, title: p.title },
  })

  return { id: p.id }
}

export async function updatePageMetadata(
  id: string,
  input: {
    slug?: string
    title?: string
    description?: string | null
    seoTitle?: string | null
    seoDescription?: string | null
    seoImage?: string | null
    noIndex?: boolean
    active?: boolean
  },
): Promise<void> {
  await protectRoute("pages:update")

  let nextSlug: string | undefined
  if (input.slug !== undefined) {
    nextSlug = normalizeSlug(input.slug)
    if (!nextSlug) throw new Error("El slug es obligatorio")
    if (isReservedSlug(nextSlug)) {
      throw new Error(`El slug "${nextSlug}" está reservado.`)
    }
    const existing = await prisma.page.findUnique({
      where: { slug: nextSlug },
      select: { id: true },
    })
    if (existing && existing.id !== id) {
      throw new Error(`Ya existe otra página con el slug "${nextSlug}".`)
    }
  }

  const previous = await prisma.page.findUnique({
    where: { id },
    select: { slug: true },
  })

  await prisma.page.update({
    where: { id },
    data: {
      ...(nextSlug !== undefined && { slug: nextSlug }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.seoTitle !== undefined && {
        seoTitle: input.seoTitle?.trim() || null,
      }),
      ...(input.seoDescription !== undefined && {
        seoDescription: input.seoDescription?.trim() || null,
      }),
      ...(input.seoImage !== undefined && {
        seoImage: input.seoImage?.trim() || null,
      }),
      ...(input.noIndex !== undefined && { noIndex: input.noIndex }),
      ...(input.active !== undefined && { active: input.active }),
    },
  })

  if (previous?.slug) updateTag(`page:${previous.slug}`)
  if (nextSlug && nextSlug !== previous?.slug) updateTag(`page:${nextSlug}`)
  // Plan 12: home/cart resolvers cache page-with-blocks reads by id, so
  // metadata edits must bust the per-id cache too.
  updateTag(`page-blocks:${id}`)
  revalidatePath("/admin/paginas")
  revalidatePath(`/admin/paginas/${id}`)
}

interface IncomingBlock {
  id: string
  type: LandingBlockType
  position: number
  content: unknown
}

export async function savePageBlocks(
  pageId: string,
  incomingBlocks: IncomingBlock[],
): Promise<{ success: true }> {
  await protectRoute("pages:update")
  for (const b of incomingBlocks) assertKnownBlockType(b.type)

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { slug: true },
  })
  if (!page) throw new Error("Página no encontrada")

  await prisma.$transaction(async (tx) => {
    const existing = await tx.pageBlock.findMany({
      where: { pageId },
      select: { id: true },
    })
    const existingIds = new Set(existing.map((b) => b.id))
    const incomingIds = new Set(incomingBlocks.map((b) => b.id))

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length > 0) {
      await tx.pageBlock.deleteMany({ where: { id: { in: toDelete } } })
    }

    for (const b of incomingBlocks) {
      // tmp-ids come from new blocks added in this session — create them.
      // Persisted ids that no longer exist (rare race) are also recreated.
      if (b.id.startsWith("tmp-") || !existingIds.has(b.id)) {
        await tx.pageBlock.create({
          data: {
            pageId,
            type: b.type,
            position: b.position,
            content: b.content as object,
          },
        })
      } else {
        await tx.pageBlock.update({
          where: { id: b.id },
          data: {
            type: b.type,
            position: b.position,
            content: b.content as object,
          },
        })
      }
    }

    await tx.page.update({
      where: { id: pageId },
      data: { updatedAt: new Date() },
    })
  })

  updateTag(`page:${page.slug}`)
  // Plan 12: per-id cache used by home/cart resolvers must also be busted.
  updateTag(`page-blocks:${pageId}`)
  revalidatePath(`/admin/paginas/${pageId}`)
  return { success: true }
}

/**
 * Plan 18 — version-aware variant of `savePageBlocks`. Each existing
 * block carries its `version`; new blocks ("tmp-…" ids) omit it.
 * All-or-nothing on conflict.
 */
interface IncomingBlockVersioned extends IncomingBlock {
  version?: number
}

export interface PageBlockConflictRow {
  id: string
  type: string
  position: number
  content: unknown
  version: number
}

export async function savePageBlocksVersioned(
  pageId: string,
  incomingBlocks: IncomingBlockVersioned[],
): Promise<
  BatchSaveResult<
    { blocks: PageBlockConflictRow[] },
    PageBlockConflictRow
  >
> {
  const userId = await getCurrentUserIdOrNull()
  if (!userId) return batchUnauthorized()
  const allowed = await hasPermission(userId, "pages:update")
  if (!allowed) return batchUnauthorized()

  for (const b of incomingBlocks) assertKnownBlockType(b.type)

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { slug: true },
  })
  if (!page) return { ok: false, reason: "not_found" }

  // Pre-check
  const conflicts = await precheckBatchConflicts({
    model: prisma.pageBlock,
    rows: incomingBlocks.map((b) => ({ id: b.id, version: b.version })),
    refetchForConflict: async (id) => {
      const fresh = await prisma.pageBlock.findUnique({ where: { id } })
      if (!fresh) return null
      return {
        id: fresh.id,
        type: fresh.type,
        position: fresh.position,
        content: fresh.content,
        version: fresh.version,
      } satisfies PageBlockConflictRow
    },
  })
  if (conflicts.length > 0) return batchConflict(conflicts)

  try {
    const persisted = await prisma.$transaction(async (tx) => {
      const existing = await tx.pageBlock.findMany({
        where: { pageId },
        select: { id: true },
      })
      const existingIds = new Set(existing.map((b) => b.id))
      const incomingIds = new Set(incomingBlocks.map((b) => b.id))

      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
      if (toDelete.length > 0) {
        await tx.pageBlock.deleteMany({ where: { id: { in: toDelete } } })
      }

      for (const b of incomingBlocks) {
        const isNew = b.id.startsWith("tmp-") || !existingIds.has(b.id)
        if (isNew) {
          await tx.pageBlock.create({
            data: {
              pageId,
              type: b.type,
              position: b.position,
              content: b.content as object,
            },
          })
        } else {
          if (typeof b.version !== "number") {
            throw new BatchRaceError(b.id)
          }
          const upd = await tx.pageBlock.updateMany({
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

      await tx.page.update({
        where: { id: pageId },
        data: { updatedAt: new Date() },
      })

      return tx.pageBlock.findMany({
        where: { pageId },
        orderBy: { position: "asc" },
      })
    })

    updateTag(`page:${page.slug}`)
    updateTag(`page-blocks:${pageId}`)
    revalidatePath(`/admin/paginas/${pageId}`)

    return batchOk<
      { blocks: PageBlockConflictRow[] },
      PageBlockConflictRow
    >({
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
      const fresh = await prisma.pageBlock.findUnique({
        where: { id: err.rowId },
      })
      return batchConflict<PageBlockConflictRow>([
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

export async function deletePage(id: string): Promise<void> {
  const userId = await protectRoute("pages:delete")
  if (typeof id !== "string" || !id) throw new Error("Página inválida")

  const p = await prisma.page.findUnique({
    where: { id },
    select: { slug: true, title: true },
  })
  if (!p) return
  await prisma.page.delete({ where: { id } })
  updateTag(`page:${p.slug}`)
  updateTag(`page-blocks:${id}`)
  revalidatePath("/admin/paginas")

  await logAudit({
    action: "page.deleted",
    userId,
    entityType: "Page",
    entityId: id,
    before: { slug: p.slug, title: p.title },
  })
}

export async function togglePageActive(id: string): Promise<void> {
  await protectRoute("pages:update")
  const p = await prisma.page.findUnique({
    where: { id },
    select: { active: true, slug: true },
  })
  if (!p) throw new Error("Página no encontrada")
  await prisma.page.update({
    where: { id },
    data: { active: !p.active },
  })
  updateTag(`page:${p.slug}`)
  revalidatePath("/admin/paginas")
}

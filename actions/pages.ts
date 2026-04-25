"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"
import type { LandingBlockType } from "@prisma/client"
import { isReservedSlug } from "@/lib/pages/reserved-slugs"

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
  pageBlocks: { id: string; type: string; position: number; content: unknown }[]
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
  if (!input.title.trim()) throw new Error("El título es obligatorio")

  const slug = normalizeSlug(input.slug)
  if (!slug) throw new Error("El slug es obligatorio")
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
      title: input.title.trim(),
      description: input.description?.trim() || null,
      seoTitle: input.seoTitle?.trim() || null,
      seoDescription: input.seoDescription?.trim() || null,
      seoImage: input.seoImage?.trim() || null,
      noIndex: input.noIndex ?? false,
      createdBy: userId,
    },
  })
  revalidatePath("/admin/paginas")
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
  revalidatePath(`/admin/paginas/${pageId}`)
  return { success: true }
}

export async function deletePage(id: string): Promise<void> {
  await protectRoute("pages:delete")
  const p = await prisma.page.findUnique({
    where: { id },
    select: { slug: true },
  })
  if (!p) return
  await prisma.page.delete({ where: { id } })
  updateTag(`page:${p.slug}`)
  revalidatePath("/admin/paginas")
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

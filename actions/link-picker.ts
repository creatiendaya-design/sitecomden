"use server"

import { prisma } from "@/lib/db"
import { protectRouteAny } from "@/lib/protect-route"

/**
 * Unified link-target row used by the Shopify-style link picker UI in the
 * theme customizer / page builder. Every row carries the final storefront
 * `href` so the field can store a plain URL string with no extra resolver
 * lookup at render time.
 */
export interface LinkTarget {
  kind: "product" | "category" | "page" | "policy"
  id: string
  label: string
  /** Secondary line shown under the label (e.g. slug, price hint). */
  hint?: string
  /** Optional image URL — only products have one today. */
  image?: string | null
  /** Resolved storefront URL — this is what gets stored when the admin picks
   *  the row. */
  url: string
}

export type LinkTargetKind = LinkTarget["kind"]

export interface BrowseLinkTargetsResult {
  rows: LinkTarget[]
  /** Total count for the kind under the current query — used to render
   *  "N results" in the picker's browse view. */
  total: number
  hasMore: boolean
}

async function assertCanBrowse(): Promise<void> {
  // Any admin with access to surfaces that embed the picker (theme
  // customizer, page builder, landing builder, category builder, menus)
  // can browse link targets. We don't restrict per-resource because the
  // picker only surfaces public-facing slugs.
  await protectRouteAny([
    "themes:update",
    "pages:view",
    "menus:view",
    "landing-templates:view",
    "categories:view",
  ])
}

function buildContains(query: string) {
  const q = query.trim()
  return q ? { contains: q, mode: "insensitive" as const } : undefined
}

function toProductRow(p: {
  id: string
  name: string
  slug: string
  images: unknown
}): LinkTarget {
  const images = Array.isArray(p.images) ? (p.images as string[]) : []
  return {
    kind: "product",
    id: p.id,
    label: p.name,
    hint: `/productos/${p.slug}`,
    image: images[0] ?? null,
    url: `/productos/${p.slug}`,
  }
}

function toCategoryRow(c: {
  id: string
  name: string
  slug: string
}): LinkTarget {
  return {
    kind: "category",
    id: c.id,
    label: c.name,
    hint: `/categoria/${c.slug}`,
    url: `/categoria/${c.slug}`,
  }
}

function toPageRow(pg: {
  id: string
  title: string
  slug: string
}): LinkTarget {
  return {
    kind: "page",
    id: pg.id,
    label: pg.title,
    hint: `/${pg.slug}`,
    url: `/${pg.slug}`,
  }
}

function toPolicyRow(po: {
  id: string
  title: string
  slug: string
}): LinkTarget {
  return {
    kind: "policy",
    id: po.id,
    label: po.title,
    hint: `/politicas/${po.slug}`,
    url: `/politicas/${po.slug}`,
  }
}

const DEFAULT_LIMIT_PER_KIND = 8

/**
 * Mixed top-level search across all kinds. Used by the picker's "Buscar"
 * input on the main view — returns a small slice per kind so the dropdown
 * stays scannable.
 */
export async function searchLinkTargets(
  query: string,
  limitPerKind: number = DEFAULT_LIMIT_PER_KIND,
): Promise<LinkTarget[]> {
  await assertCanBrowse()

  const contains = buildContains(query)

  const [products, categories, pages, policies] = await Promise.all([
    prisma.product.findMany({
      where: contains
        ? { active: true, OR: [{ name: contains }, { slug: contains }] }
        : { active: true },
      select: { id: true, name: true, slug: true, images: true },
      orderBy: { createdAt: "desc" },
      take: limitPerKind,
    }),
    prisma.category.findMany({
      where: contains
        ? { active: true, OR: [{ name: contains }, { slug: contains }] }
        : { active: true },
      select: { id: true, name: true, slug: true },
      orderBy: { order: "asc" },
      take: limitPerKind,
    }),
    prisma.page.findMany({
      where: contains
        ? { active: true, OR: [{ title: contains }, { slug: contains }] }
        : { active: true },
      select: { id: true, title: true, slug: true },
      orderBy: { updatedAt: "desc" },
      take: limitPerKind,
    }),
    prisma.policy.findMany({
      where: contains
        ? { active: true, OR: [{ title: contains }, { slug: contains }] }
        : { active: true },
      select: { id: true, title: true, slug: true },
      orderBy: { updatedAt: "desc" },
      take: limitPerKind,
    }),
  ])

  return [
    ...categories.map(toCategoryRow),
    ...products.map(toProductRow),
    ...pages.map(toPageRow),
    ...policies.map(toPolicyRow),
  ]
}

/**
 * Dedicated browse for a single kind — drives the picker's "drill-down"
 * view (Shopify-style "All products" pane). Returns rows + total count so
 * the UI can show "N resultados" and a paginate-more affordance.
 */
export async function browseLinkTargets(
  kind: LinkTargetKind,
  query: string,
  limit: number = 25,
): Promise<BrowseLinkTargetsResult> {
  await assertCanBrowse()

  const contains = buildContains(query)
  const safeLimit = Math.min(Math.max(limit, 1), 100)

  switch (kind) {
    case "product": {
      const where = contains
        ? { active: true, OR: [{ name: contains }, { slug: contains }] }
        : { active: true }
      const [rows, total] = await Promise.all([
        prisma.product.findMany({
          where,
          select: { id: true, name: true, slug: true, images: true },
          orderBy: { createdAt: "desc" },
          take: safeLimit + 1,
        }),
        prisma.product.count({ where }),
      ])
      const hasMore = rows.length > safeLimit
      return {
        rows: rows.slice(0, safeLimit).map(toProductRow),
        total,
        hasMore,
      }
    }
    case "category": {
      const where = contains
        ? { active: true, OR: [{ name: contains }, { slug: contains }] }
        : { active: true }
      const [rows, total] = await Promise.all([
        prisma.category.findMany({
          where,
          select: { id: true, name: true, slug: true },
          orderBy: { order: "asc" },
          take: safeLimit + 1,
        }),
        prisma.category.count({ where }),
      ])
      const hasMore = rows.length > safeLimit
      return {
        rows: rows.slice(0, safeLimit).map(toCategoryRow),
        total,
        hasMore,
      }
    }
    case "page": {
      const where = contains
        ? { active: true, OR: [{ title: contains }, { slug: contains }] }
        : { active: true }
      const [rows, total] = await Promise.all([
        prisma.page.findMany({
          where,
          select: { id: true, title: true, slug: true },
          orderBy: { updatedAt: "desc" },
          take: safeLimit + 1,
        }),
        prisma.page.count({ where }),
      ])
      const hasMore = rows.length > safeLimit
      return {
        rows: rows.slice(0, safeLimit).map(toPageRow),
        total,
        hasMore,
      }
    }
    case "policy": {
      const where = contains
        ? { active: true, OR: [{ title: contains }, { slug: contains }] }
        : { active: true }
      const [rows, total] = await Promise.all([
        prisma.policy.findMany({
          where,
          select: { id: true, title: true, slug: true },
          orderBy: { updatedAt: "desc" },
          take: safeLimit + 1,
        }),
        prisma.policy.count({ where }),
      ])
      const hasMore = rows.length > safeLimit
      return {
        rows: rows.slice(0, safeLimit).map(toPolicyRow),
        total,
        hasMore,
      }
    }
    default: {
      const _exhaustive: never = kind
      void _exhaustive
      return { rows: [], total: 0, hasMore: false }
    }
  }
}

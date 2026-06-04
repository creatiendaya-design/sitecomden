"use server"

import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"

/**
 * Product shape consumed by the FEATURED_COLLECTION page-builder block. Carries
 * everything `ProductCard` needs (images stay raw JSON — the card normalizes
 * them itself) so the home / static-page / category renderers look identical to
 * the rest of the storefront.
 */
export interface CollectionProductCard {
  id: string
  slug: string
  name: string
  basePrice: number
  compareAtPrice: number | null
  images: unknown
  hasVariants: boolean
  featured: boolean
  stock: number
}

export type CollectionSource =
  | "collection"
  | "manual_picks"
  | "newest"
  | "featured"
  | "best_sellers"

export type CollectionSort =
  | "newest"
  | "featured"
  | "price_asc"
  | "price_desc"

interface CollectionQuery {
  source: CollectionSource
  categoryId?: string | null
  productIds?: string[]
  sort?: CollectionSort
  limit?: number
}

interface CollectionResult {
  products: CollectionProductCard[]
  /** Slug of the picked collection, for the optional "Ver todo" link. */
  collectionSlug: string | null
}

const PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  basePrice: true,
  compareAtPrice: true,
  images: true,
  hasVariants: true,
  featured: true,
  stock: true,
} satisfies Prisma.ProductSelect

type ProductRow = {
  id: string
  slug: string
  name: string
  basePrice: Prisma.Decimal
  compareAtPrice: Prisma.Decimal | null
  images: Prisma.JsonValue
  hasVariants: boolean
  featured: boolean
  stock: number
}

function serialize(p: ProductRow): CollectionProductCard {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    basePrice: Number(p.basePrice ?? 0),
    compareAtPrice: p.compareAtPrice === null ? null : Number(p.compareAtPrice),
    images: p.images,
    hasVariants: p.hasVariants,
    featured: p.featured,
    stock: p.stock,
  }
}

function orderByFor(sort: CollectionSort): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "featured":
      return { featured: "desc" }
    case "price_asc":
      return { basePrice: "asc" }
    case "price_desc":
      return { basePrice: "desc" }
    case "newest":
    default:
      return { createdAt: "desc" }
  }
}

/**
 * Resolves the products for a FEATURED_COLLECTION block. Public (no auth) — it
 * only ever returns active, storefront-visible products and is invoked from a
 * client renderer on both the editor canvas and the storefront. Unlike the
 * product-page theme section, no `currentProductId` is involved, so it works on
 * the home page and any static/category page.
 */
export async function getCollectionProducts(
  q: CollectionQuery,
): Promise<CollectionResult> {
  const limit = Math.min(Math.max(q.limit ?? 8, 1), 24)
  const sort: CollectionSort = q.sort ?? "newest"

  // Manual selection — explicit ids, preserve the admin's order.
  if (q.source === "manual_picks") {
    const ids = q.productIds ?? []
    if (ids.length === 0) return { products: [], collectionSlug: null }
    const rows = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      select: PRODUCT_SELECT,
      take: limit,
    })
    const byId = new Map(rows.map((r) => [r.id, r]))
    const products = ids
      .map((id) => byId.get(id))
      .filter((r): r is ProductRow => Boolean(r))
      .map(serialize)
    return { products, collectionSlug: null }
  }

  // Specific collection — join through ProductCategory (smart + manual
  // collections both materialize rows there).
  if (q.source === "collection") {
    if (!q.categoryId) return { products: [], collectionSlug: null }
    const [rows, category] = await Promise.all([
      prisma.product.findMany({
        where: {
          active: true,
          categories: { some: { categoryId: q.categoryId } },
        },
        select: PRODUCT_SELECT,
        orderBy: orderByFor(sort),
        take: limit,
      }),
      prisma.category.findUnique({
        where: { id: q.categoryId },
        select: { slug: true },
      }),
    ])
    return {
      products: rows.map(serialize),
      collectionSlug: category?.slug ?? null,
    }
  }

  // Best sellers — 90-day order-line aggregation.
  if (q.source === "best_sellers") {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const grouped = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: ninetyDaysAgo } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    })
    const ids = grouped
      .map((g) => g.productId)
      .filter((id): id is string => Boolean(id))
    if (ids.length === 0) return { products: [], collectionSlug: null }
    const rows = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      select: PRODUCT_SELECT,
    })
    const byId = new Map(rows.map((r) => [r.id, r]))
    const products = ids
      .map((id) => byId.get(id))
      .filter((r): r is ProductRow => Boolean(r))
      .map(serialize)
    return { products, collectionSlug: null }
  }

  // "newest" / "featured" — whole catalog.
  const rows = await prisma.product.findMany({
    where: { active: true },
    select: PRODUCT_SELECT,
    orderBy: q.source === "featured" ? orderByFor("featured") : orderByFor("newest"),
    take: limit,
  })
  return { products: rows.map(serialize), collectionSlug: null }
}

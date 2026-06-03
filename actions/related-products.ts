"use server"

import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth"

export interface RelatedProductCard {
  id: string
  slug: string
  name: string
  price: number
  compareAtPrice: number | null
  mainImage: string | null
}

interface RelatedProductsQuery {
  mode: "manual" | "auto"
  productIds?: string[]
  source?: "same-category" | "same-tags" | "best-sellers" | "recently-added"
  currentProductId?: string
  excludeCurrentProduct?: boolean
  limit?: number
}

function serialize(p: {
  id: string
  slug: string
  name: string
  basePrice: unknown
  compareAtPrice: unknown
  images: unknown
}): RelatedProductCard {
  // images is a Json field that may be string[] or [{url:"..."}]
  let mainImage: string | null = null
  if (Array.isArray(p.images) && p.images.length > 0) {
    const first = p.images[0]
    if (typeof first === "string") mainImage = first
    else if (typeof first === "object" && first !== null && "url" in first) {
      mainImage = (first as { url: string }).url ?? null
    }
  }
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: Number(p.basePrice ?? 0),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    mainImage,
  }
}

export async function getRelatedProducts(
  q: RelatedProductsQuery,
): Promise<RelatedProductCard[]> {
  const limit = Math.min(Math.max(q.limit ?? 4, 1), 12)

  if (q.mode === "manual") {
    if (!q.productIds || q.productIds.length === 0) return []
    const rows = await prisma.product.findMany({
      where: { id: { in: q.productIds }, active: true },
      select: {
        id: true,
        slug: true,
        name: true,
        basePrice: true,
        compareAtPrice: true,
        images: true,
      },
      take: limit,
    })
    // Preserve the order the admin specified
    const byId = new Map(rows.map((r) => [r.id, r]))
    return q.productIds
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => serialize(r))
  }

  // Auto mode
  const source = q.source ?? "same-category"
  const excludeIds =
    q.excludeCurrentProduct && q.currentProductId ? [q.currentProductId] : []

  switch (source) {
    case "same-category":
    case "same-tags": {
      if (!q.currentProductId) return []
      const current = await prisma.product.findUnique({
        where: { id: q.currentProductId },
        include: { categories: { select: { categoryId: true } } },
      })
      const categoryIds = current?.categories.map((c) => c.categoryId) ?? []
      if (categoryIds.length === 0) return []

      const whereClause =
        source === "same-tags"
          ? {
              AND: categoryIds.map((cid) => ({
                categories: { some: { categoryId: cid } },
              })),
              id: { notIn: excludeIds },
              active: true as const,
            }
          : {
              categories: { some: { categoryId: { in: categoryIds } } },
              id: { notIn: excludeIds },
              active: true as const,
            }

      const rows = await prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          slug: true,
          name: true,
          basePrice: true,
          compareAtPrice: true,
          images: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
      return rows.map(serialize)
    }

    case "best-sellers": {
      // OrderItem has no createdAt; filter via the parent Order.createdAt
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const grouped = await prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: { createdAt: { gte: ninetyDaysAgo } },
          productId: { notIn: excludeIds.length > 0 ? excludeIds : undefined },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: limit,
      })

      const ids = grouped
        .map((g) => g.productId)
        .filter((id): id is string => Boolean(id))
      if (ids.length === 0) return []

      const rows = await prisma.product.findMany({
        where: { id: { in: ids }, active: true },
        select: {
          id: true,
          slug: true,
          name: true,
          basePrice: true,
          compareAtPrice: true,
          images: true,
        },
      })
      const byId = new Map(rows.map((r) => [r.id, r]))
      return ids
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .map((r) => serialize(r))
    }

    case "recently-added": {
      const rows = await prisma.product.findMany({
        where: { id: { notIn: excludeIds.length > 0 ? excludeIds : undefined }, active: true },
        select: {
          id: true,
          slug: true,
          name: true,
          basePrice: true,
          compareAtPrice: true,
          images: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
      return rows.map(serialize)
    }
  }
}

export async function searchProductsForPicker(
  query: string,
  limit = 20,
): Promise<RelatedProductCard[]> {
  // Admin-only picker: exposes the full catalog (name/price/image), so gate it.
  const { response } = await requirePermission("products:view")
  if (response) return []

  const q = query.trim()
  const rows = await prisma.product.findMany({
    where: q
      ? {
          active: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : { active: true },
    select: {
      id: true,
      slug: true,
      name: true,
      basePrice: true,
      compareAtPrice: true,
      images: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return rows.map(serialize)
}

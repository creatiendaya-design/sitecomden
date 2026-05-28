import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import type { Product as PrismaProduct } from "@prisma/client"
import { prisma } from "@/lib/db"
import ProductCard from "@/components/shop/ProductCard"
import { SectionWrapper } from "../_helpers"

interface FeaturedCollectionProps {
  section: ResolvedThemeSection
  currentProductId: string
}

interface FeaturedCollectionContent {
  heading?: string
  source?: "same_category" | "manual_picks" | "best_sellers" | "recently_viewed"
  productIds?: string[]
  limit?: number
  layout?: "grid" | "carousel"
}

type RelatedProductRow = Pick<
  PrismaProduct,
  | "id"
  | "name"
  | "slug"
  | "basePrice"
  | "compareAtPrice"
  | "images"
  | "hasVariants"
  | "featured"
  | "stock"
>

const DEFAULT_LIMIT = 8

async function fetchSameCategory(
  currentProductId: string,
  limit: number,
): Promise<RelatedProductRow[]> {
  const categoryRows = await prisma.productCategory.findMany({
    where: { productId: currentProductId },
    select: { categoryId: true },
  })
  const categoryIds = categoryRows.map((r) => r.categoryId)
  if (categoryIds.length === 0) return []

  const products = await prisma.product.findMany({
    where: {
      active: true,
      id: { not: currentProductId },
      categories: { some: { categoryId: { in: categoryIds } } },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
      compareAtPrice: true,
      images: true,
      hasVariants: true,
      featured: true,
      stock: true,
    },
  })
  return products
}

async function fetchManualPicks(
  productIds: string[],
  limit: number,
): Promise<RelatedProductRow[]> {
  if (productIds.length === 0) return []
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
      compareAtPrice: true,
      images: true,
      hasVariants: true,
      featured: true,
      stock: true,
    },
  })
  // Preserve the order chosen by the admin.
  const byId = new Map(products.map((p) => [p.id, p]))
  return productIds.flatMap((id) => {
    const p = byId.get(id)
    return p ? [p] : []
  })
}

async function fetchBestSellers(
  currentProductId: string,
  limit: number,
): Promise<RelatedProductRow[]> {
  // First-iteration: rank by `featured` flag + createdAt. Replacing this with
  // a real Order-line aggregation is a follow-up improvement (queryable view
  // or a periodic materialized count column).
  const products = await prisma.product.findMany({
    where: { active: true, id: { not: currentProductId } },
    take: limit,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
      compareAtPrice: true,
      images: true,
      hasVariants: true,
      featured: true,
      stock: true,
    },
  })
  return products
}

export async function FeaturedCollection({
  section,
  currentProductId,
}: FeaturedCollectionProps) {
  const content = section.content as FeaturedCollectionContent
  const heading = content.heading?.trim() || "También te puede interesar"
  const source = content.source ?? "same_category"
  const limit = Math.min(Math.max(content.limit ?? DEFAULT_LIMIT, 1), 24)
  const layout = content.layout === "carousel" ? "carousel" : "grid"

  let products: RelatedProductRow[] = []
  if (source === "manual_picks") {
    products = await fetchManualPicks(content.productIds ?? [], limit)
  } else if (source === "best_sellers") {
    products = await fetchBestSellers(currentProductId, limit)
  } else if (source === "recently_viewed") {
    // Server-side can't read the visitor's browser history; fall back to
    // same-category for a sensible default. A future iteration can render
    // this client-side reading from localStorage.
    products = await fetchSameCategory(currentProductId, limit)
  } else {
    products = await fetchSameCategory(currentProductId, limit)
  }

  if (products.length === 0) return null

  const cards = products.map((p) => (
    <ProductCard
      key={p.id}
      product={{
        id: p.id,
        name: p.name,
        slug: p.slug,
        basePrice: Number(p.basePrice),
        compareAtPrice:
          p.compareAtPrice === null ? null : Number(p.compareAtPrice),
        images: p.images,
        hasVariants: p.hasVariants,
        featured: p.featured,
        stock: p.stock,
      }}
    />
  ))

  return (
    <SectionWrapper section={section} as="section" className="py-12">
      <div className="container mx-auto px-4">
        <h2
          className="text-2xl sm:text-3xl font-bold mb-6"
          data-content-field="heading"
        >
          {heading}
        </h2>
        {layout === "carousel" ? (
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {cards.map((card, i) => (
              <div key={i} className="snap-start shrink-0 w-64">
                {card}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {cards}
          </div>
        )}
      </div>
    </SectionWrapper>
  )
}

import type { CSSProperties } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import type { Prisma, Product as PrismaProduct } from "@prisma/client"
import { prisma } from "@/lib/db"
import { cn } from "@/lib/utils"
import ProductCard from "@/components/shop/ProductCard"
import { SectionWrapper } from "../_helpers"
import {
  FeaturedCollectionCarousel,
  type ControlsShape,
} from "./FeaturedCollectionCarousel"

interface FeaturedCollectionProps {
  section: ResolvedThemeSection
  currentProductId: string
}

interface FeaturedCollectionContent {
  heading?: string
  subheading?: string
  headingAlign?: "left" | "center"
  source?:
    | "collection"
    | "same_category"
    | "manual_picks"
    | "best_sellers"
    | "recently_viewed"
  categoryId?: string | null
  productIds?: string[]
  showViewAll?: boolean
  viewAllText?: string
  limit?: number
  layout?: "grid" | "carousel"
  columnsDesktop?: number
  columnsMobile?: number
  showArrows?: boolean
  showDots?: boolean
  controlsShape?: ControlsShape
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
> & {
  variants: {
    price: Prisma.Decimal
    compareAtPrice: Prisma.Decimal | null
    stock: number
  }[]
}

const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  basePrice: true,
  compareAtPrice: true,
  images: true,
  hasVariants: true,
  featured: true,
  stock: true,
  variants: {
    // La card suma el stock de las variantes activas (su `stock` a nivel
    // producto suele ser 0 cuando hay variantes).
    where: { active: true },
    orderBy: { price: "asc" },
    select: { price: true, compareAtPrice: true, stock: true },
  },
} as const

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

  return prisma.product.findMany({
    where: {
      active: true,
      id: { not: currentProductId },
      categories: { some: { categoryId: { in: categoryIds } } },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: PRODUCT_SELECT,
  })
}

/** Pick from a specific collection (Category) the admin chose — Shopify-style.
 *  Smart and manual collections both persist rows in ProductCategory, so a
 *  single join covers either type. The current product is excluded so the
 *  section never recommends the page you're already on. */
async function fetchByCollection(
  categoryId: string,
  currentProductId: string,
  limit: number,
): Promise<RelatedProductRow[]> {
  const rows = await prisma.productCategory.findMany({
    where: {
      categoryId,
      productId: { not: currentProductId },
      product: { active: true },
    },
    take: limit,
    orderBy: { product: { createdAt: "desc" } },
    select: { product: { select: PRODUCT_SELECT } },
  })
  return rows.map((r) => r.product)
}

async function fetchManualPicks(
  productIds: string[],
  limit: number,
): Promise<RelatedProductRow[]> {
  if (productIds.length === 0) return []
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
    take: limit,
    select: PRODUCT_SELECT,
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
  return prisma.product.findMany({
    where: { active: true, id: { not: currentProductId } },
    take: limit,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    select: PRODUCT_SELECT,
  })
}

export async function FeaturedCollection({
  section,
  currentProductId,
}: FeaturedCollectionProps) {
  const content = section.content as FeaturedCollectionContent
  const heading = content.heading?.trim() || "También te puede interesar"
  const subheading = content.subheading?.trim() || ""
  const headingAlign = content.headingAlign === "center" ? "center" : "left"
  const source = content.source ?? "collection"
  const limit = Math.min(Math.max(content.limit ?? DEFAULT_LIMIT, 1), 24)
  const layout = content.layout === "carousel" ? "carousel" : "grid"
  const columnsDesktop = clampInt(content.columnsDesktop, 2, 6, 4)
  const columnsMobile = clampInt(content.columnsMobile, 1, 2, 2)
  const showArrows = content.showArrows !== false
  const showDots = content.showDots !== false
  const controlsShape: ControlsShape =
    content.controlsShape === "square" ? "square" : "round"

  let products: RelatedProductRow[] = []
  let collectionSlug: string | null = null

  if (source === "collection") {
    const categoryId = content.categoryId
    if (categoryId) {
      const [rows, category] = await Promise.all([
        fetchByCollection(categoryId, currentProductId, limit),
        prisma.category.findUnique({
          where: { id: categoryId },
          select: { slug: true },
        }),
      ])
      products = rows
      collectionSlug = category?.slug ?? null
    }
  } else if (source === "manual_picks") {
    products = await fetchManualPicks(content.productIds ?? [], limit)
  } else if (source === "best_sellers") {
    products = await fetchBestSellers(currentProductId, limit)
  } else {
    // same_category + recently_viewed (server can't read browser history;
    // fall back to same-category for a sensible default).
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
        variants: p.variants.map((v) => ({
          price: Number(v.price),
          compareAtPrice:
            v.compareAtPrice === null ? null : Number(v.compareAtPrice),
          stock: v.stock,
        })),
      }}
    />
  ))

  const showViewAll =
    source === "collection" && content.showViewAll !== false && !!collectionSlug
  const viewAllText = content.viewAllText?.trim() || "Ver toda la colección"

  const gridStyle: CSSProperties = {
    ["--cols-d" as string]: String(columnsDesktop),
    ["--cols-m" as string]: String(columnsMobile),
  }

  return (
    <SectionWrapper section={section} as="section" className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <div
          className={cn(
            "mb-8 flex flex-col gap-1",
            headingAlign === "center" && "items-center text-center",
          )}
        >
          <h2
            className="text-2xl font-bold tracking-tight sm:text-3xl"
            data-content-field="heading"
          >
            {heading}
          </h2>
          {subheading && (
            <p
              className="max-w-2xl text-sm text-muted-foreground sm:text-base"
              data-content-field="subheading"
            >
              {subheading}
            </p>
          )}
          <span className="mt-3 h-1 w-16 rounded-full bg-primary/80" />
        </div>

        {layout === "carousel" ? (
          <FeaturedCollectionCarousel
            cards={cards}
            columnsDesktop={columnsDesktop}
            columnsMobile={columnsMobile}
            showArrows={showArrows}
            showDots={showDots}
            controlsShape={controlsShape}
          />
        ) : (
          <div
            style={gridStyle}
            className={cn(
              "grid gap-4 sm:gap-6",
              "[grid-template-columns:repeat(var(--cols-m),minmax(0,1fr))]",
              "sm:[grid-template-columns:repeat(var(--cols-d),minmax(0,1fr))]",
            )}
          >
            {cards}
          </div>
        )}

        {showViewAll && collectionSlug && (
          <div
            className={cn(
              "mt-10 flex",
              headingAlign === "center" ? "justify-center" : "justify-start",
            )}
          >
            <Link
              href={`/categoria/${collectionSlug}`}
              className="group inline-flex items-center gap-2 rounded-full border border-foreground/15 px-6 py-3 text-sm font-medium transition-colors hover:border-foreground/40 hover:bg-foreground/5"
            >
              <span data-content-field="viewAllText">{viewAllText}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
    </SectionWrapper>
  )
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.round(n), min), max)
}

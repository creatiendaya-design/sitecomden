import { prisma } from "@/lib/db"
import ProductCard from "@/components/shop/ProductCard"
import { cn } from "@/lib/utils"
import { applyBlockStyle } from "@/lib/blocks/apply-style"
import { readStyleAndMedia } from "./_normalizeContent"
import type { BlockContentV2 } from "@/lib/blocks/types"

interface Data {
  title?: string
  columnsDesktop?: number
  columnsMobile?: number
  maxItems?: number
  sort?: "manual" | "price_asc" | "price_desc" | "newest" | "featured"
}

interface Props {
  content: BlockContentV2
  /** When provided, the block fetches products from this category server-side.
   *  Without it (e.g. category-less previews), renders an empty notice. */
  categoryId: string | null
}

const COL_DESKTOP_MAP: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
}
const COL_MOBILE_MAP: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
}

/**
 * Server-side renderer for the PRODUCT_GRID block (Plan 7.1). Fetches the
 * products of the surrounding Category and renders them with ProductCard.
 * Lives in the storefront category page; the editor canvas uses a
 * client-side placeholder counterpart (ProductGridBlockEditor).
 */
export default async function ProductGridBlock({
  content,
  categoryId,
}: Props) {
  const data = (content.data ?? {}) as Data
  const { style: blockStyle } = readStyleAndMedia(content)
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle)

  if (!categoryId) {
    return (
      <section
        className={cn("py-8 text-center text-sm text-muted-foreground", styleClass)}
        style={inlineStyle}
      >
        Bloque de productos disponible solo dentro de una categoría.
      </section>
    )
  }

  const products = await loadCategoryProducts({
    categoryId,
    sort: data.sort ?? "manual",
    take: clampMaxItems(data.maxItems),
  })

  if (products.length === 0) {
    return (
      <section
        className={cn("container mx-auto px-4 py-8 text-center", styleClass)}
        style={inlineStyle}
      >
        {data.title && (
          <h2 className="mb-4 text-2xl font-bold">{data.title}</h2>
        )}
        <p className="text-sm text-muted-foreground">
          Esta categoría aún no tiene productos.
        </p>
      </section>
    )
  }

  const colsMobile = COL_MOBILE_MAP[data.columnsMobile ?? 2] ?? "grid-cols-2"
  const colsDesktop = COL_DESKTOP_MAP[data.columnsDesktop ?? 4] ?? "lg:grid-cols-4"

  return (
    <section
      className={cn("container mx-auto px-4 py-8 md:py-12", styleClass)}
      style={inlineStyle}
    >
      {data.title && (
        <h2 className="mb-6 text-2xl md:text-3xl font-bold">{data.title}</h2>
      )}
      <div className={cn("grid gap-4 sm:gap-6", colsMobile, "sm:grid-cols-2", colsDesktop)}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

function clampMaxItems(input: number | undefined): number {
  const n = typeof input === "number" && Number.isFinite(input) ? input : 12
  return Math.min(48, Math.max(4, Math.round(n)))
}

async function loadCategoryProducts({
  categoryId,
  sort,
  take,
}: {
  categoryId: string
  sort: NonNullable<Data["sort"]>
  take: number
}) {
  const productCategories = await prisma.productCategory.findMany({
    where: {
      categoryId,
      product: { active: true },
    },
    take,
    orderBy: prismaOrder(sort),
    include: {
      product: {
        include: {
          categories: { include: { category: true } },
          variants: {
            where: { active: true },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
  })

  return productCategories.map((pc) => {
    const product = pc.product
    return {
      ...product,
      basePrice: Number(product.basePrice),
      compareAtPrice: product.compareAtPrice
        ? Number(product.compareAtPrice)
        : null,
      variants: product.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      })),
    }
  })
}

function prismaOrder(sort: NonNullable<Data["sort"]>) {
  switch (sort) {
    case "price_asc":
      return { product: { basePrice: "asc" as const } }
    case "price_desc":
      return { product: { basePrice: "desc" as const } }
    case "newest":
      return { product: { createdAt: "desc" as const } }
    case "featured":
      // ProductCategory doesn't have a featured flag; sort by product.featured
      // first via createdAt fallback.
      return { product: { featured: "desc" as const } }
    case "manual":
    default:
      // Manual order = ProductCategory's natural insert order (no explicit
      // position column today). createdAt of the join row is a stable proxy.
      return { createdAt: "asc" as const }
  }
}

"use client"

import { useEffect, useState, type CSSProperties } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import ProductCard from "@/components/shop/ProductCard"
import { readStyleAndMedia } from "./_normalizeContent"
import { applyBlockStyle } from "@/lib/blocks/apply-style"
import {
  getCollectionProducts,
  type CollectionProductCard,
  type CollectionSource,
  type CollectionSort,
} from "@/actions/collection-products"
import {
  FeaturedCollectionCarousel,
  type ControlsShape,
} from "@/components/shop/theme-sections/product/FeaturedCollectionCarousel"
import type { BlockContentV2 } from "@/lib/blocks/types"

interface Props {
  content: BlockContentV2
}

interface Data {
  title?: string
  subtitle?: string
  headingAlign?: "left" | "center"
  source?: CollectionSource
  categoryId?: string | null
  productIds?: string[]
  sort?: CollectionSort
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

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.round(n), min), max)
}

/**
 * Universal "Colección destacada" page-builder block. Unlike the product-page
 * theme section of the same name, this works on the home page and any static /
 * category page because it never depends on a current product — it resolves its
 * products client-side via `getCollectionProducts`. Shares the carousel UI
 * (arrows / dots / shape) and `ProductCard` with the rest of the storefront.
 */
export default function FeaturedCollectionBlock({ content }: Props) {
  const data = content.data as unknown as Data
  const { style: blockStyle } = readStyleAndMedia(content)
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle)

  const title = data.title?.trim() || ""
  const subtitle = data.subtitle?.trim() || ""
  const headingAlign = data.headingAlign === "center" ? "center" : "left"
  const source: CollectionSource = data.source ?? "collection"
  const sort: CollectionSort = data.sort ?? "newest"
  const limit = clampInt(data.limit, 1, 24, 8)
  const layout = data.layout === "grid" ? "grid" : "carousel"
  const columnsDesktop = clampInt(data.columnsDesktop, 2, 6, 4)
  const columnsMobile = clampInt(data.columnsMobile, 1, 2, 2)
  const showArrows = data.showArrows !== false
  const showDots = data.showDots !== false
  const controlsShape: ControlsShape =
    data.controlsShape === "square" ? "square" : "round"

  const [products, setProducts] = useState<CollectionProductCard[] | null>(null)
  const [collectionSlug, setCollectionSlug] = useState<string | null>(null)

  const manualKey = (data.productIds ?? []).join(",")

  useEffect(() => {
    let cancelled = false
    setProducts(null)
    getCollectionProducts({
      source,
      categoryId: data.categoryId,
      productIds: data.productIds,
      sort,
      limit,
    })
      .then((res) => {
        if (cancelled) return
        setProducts(res.products)
        setCollectionSlug(res.collectionSlug)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, data.categoryId, manualKey, sort, limit])

  const loading = products === null
  const list: (CollectionProductCard | null)[] = loading
    ? Array.from({ length: Math.min(limit, columnsDesktop * 2) }, () => null)
    : products

  // Nothing to show once resolved (e.g. empty collection / no pick yet).
  if (!loading && products.length === 0) return null

  const cards = list.map((p, i) =>
    p ? (
      <ProductCard
        key={p.id}
        product={{
          id: p.id,
          name: p.name,
          slug: p.slug,
          basePrice: p.basePrice,
          compareAtPrice: p.compareAtPrice,
          images: p.images,
          hasVariants: p.hasVariants,
          featured: p.featured,
          stock: p.stock,
        }}
      />
    ) : (
      <div
        key={`ph-${i}`}
        className="aspect-square w-full animate-pulse rounded-xl bg-muted"
      />
    ),
  )

  const showViewAll =
    source === "collection" && data.showViewAll !== false && !!collectionSlug
  const viewAllText = data.viewAllText?.trim() || "Ver toda la colección"

  const gridStyle: CSSProperties = {
    ["--cols-d" as string]: String(columnsDesktop),
    ["--cols-m" as string]: String(columnsMobile),
  }

  return (
    <section
      className={cn("landing-section py-12 sm:py-16", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        {(title || subtitle) && (
          <div
            className={cn(
              "mb-8 flex flex-col gap-1",
              headingAlign === "center" && "items-center text-center",
            )}
          >
            {title && (
              <h2
                className="text-2xl font-bold tracking-tight sm:text-3xl"
                data-content-field="title"
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className="max-w-2xl text-sm text-muted-foreground sm:text-base"
                data-content-field="subtitle"
              >
                {subtitle}
              </p>
            )}
            <span className="mt-3 h-1 w-16 rounded-full bg-primary/80" />
          </div>
        )}

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
    </section>
  )
}

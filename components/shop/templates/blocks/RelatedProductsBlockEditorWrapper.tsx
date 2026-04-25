"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { readStyleAndMedia } from "./_normalizeContent"
import { applyBlockStyle } from "@/lib/blocks/apply-style"
import { getRelatedProducts, type RelatedProductCard } from "@/actions/related-products"
import type { BlockContentV2 } from "@/lib/blocks/types"

interface Props {
  content: BlockContentV2
  /** Optional: when present (storefront rendering), fetch real products via
   *  the server action on mount. When absent (editor canvas), show placeholders. */
  currentProductId?: string
}

interface Data {
  title?: string
  mode?: "manual" | "auto"
  manualProductIds?: string[]
  autoFilters?: {
    source: "same-category" | "same-tags" | "best-sellers" | "recently-added"
    limit: number
    excludeCurrentProduct: boolean
  }
  columnsDesktop?: number
  columnsMobile?: number
  showPrice?: boolean
}

/**
 * Dual-purpose client component:
 *  - In the editor canvas (no currentProductId): renders placeholder cards so
 *    the admin sees the grid layout.
 *  - On the storefront (currentProductId given): calls the server action on
 *    mount, fetches real products, and renders them as clickable cards.
 *
 * ProductLandingView is a client component so a pure async server component
 * for this block would not render. Client-side fetch via server action is the
 * compatible path.
 */
export default function RelatedProductsBlockEditorWrapper({ content, currentProductId }: Props) {
  const data = content.data as unknown as Data
  const { style: blockStyle } = readStyleAndMedia(content)
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle)

  const limit = data.autoFilters?.limit ?? 4
  const cols = data.columnsDesktop ?? 4
  const mobileCols = data.columnsMobile ?? 2

  const desktopColsClass =
    cols === 3 ? "@3xl:grid-cols-3" : cols === 5 ? "@3xl:grid-cols-5" : "@3xl:grid-cols-4"
  const mobileColsClass = mobileCols === 1 ? "grid-cols-1" : "grid-cols-2"

  const [products, setProducts] = useState<RelatedProductCard[] | null>(null)

  const mode = data.mode ?? "auto"
  const manualIdsKey = (data.manualProductIds ?? []).join(",")

  useEffect(() => {
    // Manual mode: we can fetch in BOTH the canvas and the storefront because
    // the IDs are explicit — no `currentProductId` needed.
    // Auto mode in the canvas: skip the fetch (we don't have a current product),
    // fall through to placeholders.
    if (mode === "auto" && !currentProductId) {
      setProducts(null)
      return
    }
    if (mode === "manual" && (data.manualProductIds?.length ?? 0) === 0) {
      setProducts([])
      return
    }

    let cancelled = false
    getRelatedProducts({
      mode,
      productIds: data.manualProductIds,
      source: data.autoFilters?.source,
      currentProductId,
      excludeCurrentProduct: data.autoFilters?.excludeCurrentProduct ?? true,
      limit,
    })
      .then((rows) => {
        if (!cancelled) setProducts(rows)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentProductId,
    mode,
    manualIdsKey,
    data.autoFilters?.source,
    data.autoFilters?.limit,
    data.autoFilters?.excludeCurrentProduct,
    limit,
  ])

  // Auto mode in the canvas keeps the placeholders. Manual mode shows the
  // real products even on the canvas.
  const showPlaceholders =
    (mode === "auto" && !currentProductId) || products === null
  const list: (RelatedProductCard | null)[] = showPlaceholders
    ? Array.from({ length: Math.min(limit, 8) }, () => null)
    : products.slice(0, Math.min(limit, 8))

  if (!showPlaceholders && products && products.length === 0) return null

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        <h2 className="text-2xl @md:text-3xl font-bold mb-6 text-center">
          {data.title ?? "También te puede gustar"}
        </h2>
        <div className={cn("grid gap-4 @md:gap-6", mobileColsClass, desktopColsClass)}>
          {list.map((p, i) =>
            p ? (
              <Link key={p.id} href={`/productos/${p.slug}`} className="group block">
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                  {p.mainImage ? (
                    <Image
                      src={p.mainImage}
                      alt={p.name}
                      width={400}
                      height={400}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-[11px] text-muted-foreground">
                      Sin imagen
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <div className="text-sm font-medium line-clamp-2">{p.name}</div>
                  {data.showPrice !== false && (
                    <div className="mt-1 text-sm">
                      <span className="font-semibold">S/ {p.price.toFixed(2)}</span>
                      {p.compareAtPrice && p.compareAtPrice > p.price && (
                        <span className="ml-2 text-xs line-through text-muted-foreground">
                          S/ {p.compareAtPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <div
                key={`ph-${i}`}
                className="aspect-square w-full rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground"
              >
                {currentProductId ? "Cargando..." : `Producto ${i + 1}`}
              </div>
            ),
          )}
        </div>
        {mode === "auto" && !currentProductId && (
          <p className="text-center text-[11px] text-muted-foreground mt-4">
            En modo automático los productos se cargan según el producto que se está visualizando.
          </p>
        )}
      </div>
    </section>
  )
}

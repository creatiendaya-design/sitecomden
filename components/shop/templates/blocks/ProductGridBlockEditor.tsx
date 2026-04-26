"use client"

import { Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { applyBlockStyle } from "@/lib/blocks/apply-style"
import { readStyleAndMedia } from "./_normalizeContent"
import type { BlockContentV2 } from "@/lib/blocks/types"

interface Data {
  title?: string
  columnsDesktop?: number
  columnsMobile?: number
  maxItems?: number
  sort?: string
}

interface Props {
  content: BlockContentV2
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
 * Editor canvas placeholder for PRODUCT_GRID (Plan 7.1).
 *
 * The actual storefront renderer lives in ProductGridBlock.tsx (server
 * component). The canvas is client-side and doesn't have a categoryId, so
 * we render skeleton cards that respect the chosen columns + max so the
 * admin sees the layout shape live as they tweak the schema.
 */
export default function ProductGridBlockEditor({ content }: Props) {
  const data = (content.data ?? {}) as Data
  const { style: blockStyle } = readStyleAndMedia(content)
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle)

  const cols = data.columnsDesktop ?? 4
  const max = clampMaxItems(data.maxItems)
  const previewCount = Math.min(8, max) // cap canvas previews to avoid scroll

  const colsMobile = COL_MOBILE_MAP[data.columnsMobile ?? 2] ?? "grid-cols-2"
  const colsDesktop = COL_DESKTOP_MAP[cols] ?? "lg:grid-cols-4"

  return (
    <section
      className={cn("container mx-auto px-4 py-8", styleClass)}
      style={inlineStyle}
    >
      {data.title && (
        <h2 className="mb-6 text-2xl font-bold">{data.title}</h2>
      )}
      <div
        className={cn(
          "grid gap-4 sm:gap-6",
          colsMobile,
          "sm:grid-cols-2",
          colsDesktop,
        )}
      >
        {Array.from({ length: previewCount }).map((_, i) => (
          <PlaceholderCard key={i} index={i + 1} />
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        En el storefront se mostrarán los productos reales de la categoría
        (máx. {max}, orden:{" "}
        <code className="font-mono">{data.sort ?? "manual"}</code>).
      </p>
    </section>
  )
}

function PlaceholderCard({ index }: { index: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-4 flex flex-col gap-3">
      <div className="aspect-square rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground">
        <Package className="h-8 w-8" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-3/4 rounded bg-muted/60" />
        <div className="h-3 w-1/2 rounded bg-muted/60" />
      </div>
      <span className="text-[10px] text-muted-foreground">Producto {index}</span>
    </div>
  )
}

function clampMaxItems(input: number | undefined): number {
  const n = typeof input === "number" && Number.isFinite(input) ? input : 12
  return Math.min(48, Math.max(4, Math.round(n)))
}

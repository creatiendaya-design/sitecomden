"use client"

import { useBuilderStore } from "../store"
import { CanvasFrame } from "./CanvasFrame"
import { BlockRenderer } from "./BlockRenderer"
import { EmptySlot } from "./EmptySlot"
import type { BuilderContext } from "../types"
import type { BlockInstance } from "@/lib/blocks/types"

interface CanvasProps {
  context?: BuilderContext
}

// Detect sticky ticker across v1 flat and v2 zoned content shapes.
// Mirrors LandingBlockRenderer so editor preview matches storefront.
function isStickyTicker(b: BlockInstance): boolean {
  if (b.type !== "TICKER") return false
  const c = b.content as unknown as Record<string, unknown>
  if (c?.sticky === true) return true
  const data = c?.data as Record<string, unknown> | undefined
  return data?.sticky === true
}

export function Canvas({ context }: CanvasProps) {
  const blocks = useBuilderStore((s) => s.blocks)
  const selectBlock = useBuilderStore((s) => s.selectBlock)

  // Sticky tickers render pinned at the top of the canvas regardless of
  // their position in the editor list — same lift-to-top behavior as the
  // storefront. The rest render in their editor order below.
  const stickyTickers = blocks.filter(isStickyTicker)
  const rest = blocks.filter((b) => !isStickyTicker(b))

  return (
    <main
      className="flex-1 flex flex-col bg-muted/40 overflow-hidden"
      onClick={(e) => {
        // Clicks on empty canvas area deselect
        if (e.target === e.currentTarget) selectBlock(null)
      }}
    >
      <CanvasFrame>
        {stickyTickers.map((block) => (
          <BlockRenderer key={`sticky-${block.id}`} block={block} context={context} />
        ))}

        {blocks.length === 0 && stickyTickers.length === 0 ? (
          <EmptyCanvas />
        ) : (
          <>
            <EmptySlot position={0} />
            {rest.map((block, index) => (
              <div key={block.id}>
                <BlockRenderer block={block} context={context} />
                <EmptySlot position={index + 1} />
              </div>
            ))}
          </>
        )}
      </CanvasFrame>
    </main>
  )
}

function EmptyCanvas() {
  return (
    <div className="p-16 text-center">
      <p className="text-sm text-muted-foreground mb-2">Aún no hay bloques en esta página.</p>
      <p className="text-xs text-muted-foreground">
        Agrega uno desde el panel de la izquierda para empezar.
      </p>
    </div>
  )
}

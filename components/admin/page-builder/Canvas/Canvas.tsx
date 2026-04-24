"use client"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
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
  const reorderBlocks = useBuilderStore((s) => s.reorderBlocks)

  // Sticky tickers render pinned at the top of the canvas regardless of
  // their position in the editor list — same lift-to-top behavior as the
  // storefront. The rest render in their editor order below.
  const stickyTickers = blocks.filter(isStickyTicker)
  const rest = blocks.filter((b) => !isStickyTicker(b))

  // dnd-kit sensors for the canvas sortable context. PointerSensor with a
  // small activation distance prevents the grip from triggering a drag on
  // accidental clicks when the user is just hovering the toolbar.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = blocks.findIndex((b) => b.id === active.id)
    const toIndex = blocks.findIndex((b) => b.id === over.id)
    if (fromIndex < 0 || toIndex < 0) return
    reorderBlocks(fromIndex, toIndex)
  }

  return (
    <main
      className="flex-1 flex flex-col bg-muted/40 overflow-hidden"
      onClick={(e) => {
        // Clicks on empty canvas area deselect
        if (e.target === e.currentTarget) selectBlock(null)
      }}
    >
      <CanvasFrame>
        {/*
          A single DndContext + SortableContext wraps ALL blocks in the canvas
          (both sticky tickers and the rest) so the floating toolbar grip is
          actually wired up to drag. Without these providers, useSortable in
          BlockWrapper returns noop listeners and clicks on the grip do nothing.

          We use block.id as the sortable id across both lists. The store's
          reorderBlocks recomputes positions after drag, then the filter into
          sticky/rest runs again on re-render — sticky tickers stay lifted to
          the top regardless of where the admin drops them.
        */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {stickyTickers.length > 0 && (
              <div className="sticky top-0 z-40">
                {stickyTickers.map((block) => (
                  <BlockRenderer key={`sticky-${block.id}`} block={block} context={context} />
                ))}
              </div>
            )}

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
          </SortableContext>
        </DndContext>
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

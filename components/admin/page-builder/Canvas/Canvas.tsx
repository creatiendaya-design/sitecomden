"use client"

import { useBuilderStore } from "../store"
import { CanvasFrame } from "./CanvasFrame"
import { BlockRenderer } from "./BlockRenderer"
import { EmptySlot } from "./EmptySlot"
import type { BuilderContext } from "../types"

interface CanvasProps {
  context?: BuilderContext
}

export function Canvas({ context }: CanvasProps) {
  const blocks = useBuilderStore((s) => s.blocks)
  const selectBlock = useBuilderStore((s) => s.selectBlock)

  return (
    <main
      className="flex-1 flex flex-col bg-muted/40 overflow-hidden"
      onClick={(e) => {
        // Clicks on empty canvas area deselect
        if (e.target === e.currentTarget) selectBlock(null)
      }}
    >
      <CanvasFrame>
        {blocks.length === 0 ? (
          <EmptyCanvas />
        ) : (
          <>
            <EmptySlot position={0} />
            {blocks.map((block, index) => (
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

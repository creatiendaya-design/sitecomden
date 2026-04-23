"use client"

import { useBuilderStore } from "../store"
import { BlockWrapper } from "./BlockWrapper"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { resolveContentForDevice } from "@/lib/blocks/resolve"
import type { BlockInstance } from "@/lib/blocks/types"
import type { BuilderContext } from "../types"

interface BlockRendererProps {
  block: BlockInstance
  context?: BuilderContext
}

export function BlockRenderer({ block, context: _context }: BlockRendererProps) {
  const device = useBuilderStore((s) => s.device)
  const def = getBlockDefinition(block.type)

  if (!def) {
    return (
      <div className="p-4 border border-dashed border-destructive/50 text-xs text-destructive">
        Bloque desconocido: {block.type}
      </div>
    )
  }

  const resolved = resolveContentForDevice(block.content, device)
  const Renderer = def.renderer
  const isHidden =
    (resolved.style.visibility === "mobile-only" && device === "desktop") ||
    (resolved.style.visibility === "desktop-only" && device === "mobile")

  if (isHidden) {
    return (
      <BlockWrapper block={block}>
        <div className="p-6 bg-muted/60 text-center text-xs text-muted-foreground border-dashed border-2 border-muted">
          Oculto en {device === "desktop" ? "desktop" : "mobile"} (visibilidad: {resolved.style.visibility})
        </div>
      </BlockWrapper>
    )
  }

  return (
    <BlockWrapper block={block}>
      <Renderer content={resolved} />
    </BlockWrapper>
  )
}

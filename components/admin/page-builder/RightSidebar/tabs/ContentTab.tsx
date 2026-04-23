"use client"

import { useBuilderStore } from "../../store"
import { getBlockDefinition } from "@/lib/blocks/registry"
import type { BlockContentV2 } from "@/lib/blocks/types"

export function ContentTab() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)

  const block = blocks.find((b) => b.id === selectedBlockId)
  if (!block) return null

  const def = getBlockDefinition(block.type)
  if (!def) {
    return (
      <div className="p-4 text-xs text-destructive">
        No se encontró el formulario para el tipo {block.type}.
      </div>
    )
  }

  const Form = def.contentForm
  return (
    <Form
      content={block.content}
      onChange={(newContent: BlockContentV2) => updateBlockContent(block.id, newContent)}
    />
  )
}

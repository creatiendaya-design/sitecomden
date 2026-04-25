"use client"

import { useBuilderStore } from "../../store"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { SchemaForm } from "@/components/admin/page-builder/forms/SchemaForm"
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

  // Prefer schema-driven form if the block has declared a contentSchema.
  // Fall back to legacy contentForm otherwise, until all blocks are migrated.
  if (def.contentSchema) {
    const data = (block.content.data as Record<string, unknown>) ?? {}
    return (
      <SchemaForm
        schema={def.contentSchema}
        value={data}
        onChange={(nextData) =>
          updateBlockContent(block.id, {
            ...block.content,
            data: nextData,
          })
        }
      />
    )
  }

  if (def.contentForm) {
    const Form = def.contentForm
    return (
      <Form
        content={block.content}
        onChange={(newContent: BlockContentV2) => updateBlockContent(block.id, newContent)}
      />
    )
  }

  return <div className="p-4 text-xs text-muted-foreground">Este bloque no tiene formulario.</div>
}

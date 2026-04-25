"use client"

import { useBuilderStore } from "../../store"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { SchemaForm } from "@/components/admin/page-builder/forms/SchemaForm"

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

  if (!def.contentSchema) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        Este bloque no tiene formulario configurado.
      </div>
    )
  }

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

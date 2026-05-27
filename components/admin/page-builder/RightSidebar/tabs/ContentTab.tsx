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
  // Fields flagged `showInStyleTab` are rendered by the Estilo tab instead,
  // grouped under "Colores del bloque". They still live at content.data.<key>.
  const contentOnlySchema = def.contentSchema.filter((f) => !f.showInStyleTab)
  if (contentOnlySchema.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        Todos los campos de este bloque están en la pestaña Estilo.
      </div>
    )
  }
  // `key={block.id}` forces the form (and every debounced input under it)
  // to remount when the admin selects a different block. Unmount fires
  // each input's flush hook, which commits any half-typed value to the
  // OLD block via the closure captured at this render — preventing lost
  // edits when switching blocks within the debounce window.
  return (
    <SchemaForm
      key={block.id}
      schema={contentOnlySchema}
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

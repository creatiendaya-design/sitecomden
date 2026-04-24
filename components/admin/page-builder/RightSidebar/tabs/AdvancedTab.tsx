"use client"

import { useBuilderStore } from "../../store"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { BlockContentV2 } from "@/lib/blocks/types"

export function AdvancedTab() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)

  const block = blocks.find((b) => b.id === selectedBlockId)
  if (!block) return null

  const patch = (delta: Partial<BlockContentV2>) => {
    updateBlockContent(block.id, { ...block.content, ...delta })
  }

  // Normalize the anchor id: keep only URL-safe chars, lowercase
  const sanitizeAnchor = (raw: string) =>
    raw.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-")

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          ID del bloque
        </Label>
        <Input
          readOnly
          value={block.id}
          className="mt-1 font-mono text-xs bg-muted/40"
          aria-label="ID del bloque (solo lectura)"
        />
      </div>

      <div>
        <Label htmlFor="anchor-id" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Anclaje
        </Label>
        <Input
          id="anchor-id"
          value={block.content.anchorId ?? ""}
          onChange={(e) => patch({ anchorId: sanitizeAnchor(e.target.value) })}
          placeholder="caracteristicas"
          className="mt-1 font-mono text-sm"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Permite enlazar al bloque con <code className="font-mono">/productos/…#{block.content.anchorId || "anclaje"}</code>.
          Solo letras, números, guion y guion bajo.
        </p>
      </div>

      <div>
        <Label htmlFor="internal-notes" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notas internas
        </Label>
        <Textarea
          id="internal-notes"
          value={block.content.internalNotes ?? ""}
          onChange={(e) => patch({ internalNotes: e.target.value })}
          placeholder="Notas solo visibles en el editor"
          className="mt-1 text-sm"
          rows={3}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          No se muestran en la tienda. Útil para recordatorios o referencias.
        </p>
      </div>

      <div className="text-[11px] text-muted-foreground pt-4 border-t">
        Clase CSS custom: disponible en Plan 3 (permiso super-admin).
      </div>
    </div>
  )
}

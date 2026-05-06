"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useCodFormEditor } from "./store"
import {
  FIELD_BLOCK_TYPES,
  STRUCTURAL_BLOCK_TYPES,
  SINGLETON_BLOCK_TYPES,
} from "@/lib/cod-forms/types"
import { getDefaultContentForType } from "@/lib/cod-forms/defaults"
import { blockTypeLabel } from "./SortableBlockItem"
import type { CodFormBlockType } from "@/lib/cod-forms/types"

export default function AddBlockSelector() {
  const [open, setOpen] = useState(false)
  const blocks = useCodFormEditor((s) => s.blocks)
  const addBlock = useCodFormEditor((s) => s.addBlock)
  const patchBlock = useCodFormEditor((s) => s.patchBlock)

  const presentTypes = new Set(blocks.map((b) => b.type))
  // SUBMIT_BUTTON is excluded entirely (it's mandatory and pre-existing).
  const available = [...STRUCTURAL_BLOCK_TYPES, ...FIELD_BLOCK_TYPES].filter(
    (t) =>
      t !== "SUBMIT_BUTTON" &&
      (!SINGLETON_BLOCK_TYPES.includes(t) || !presentTypes.has(t)),
  )

  const onPick = (type: CodFormBlockType) => {
    addBlock(type)
    // Initialize content from defaults
    const next = useCodFormEditor.getState().blocks
    const inserted = next.find(
      (b) => b.type === type && Object.keys(b.content).length === 0,
    )
    if (inserted) {
      patchBlock(inserted.id, { content: getDefaultContentForType(type) })
    }
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Agregar nuevos campos
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar bloque</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {available.map((t) => (
              <Button
                key={t}
                variant="outline"
                className="justify-start"
                onClick={() => onPick(t)}
              >
                {blockTypeLabel(t)}
              </Button>
            ))}
            {available.length === 0 && (
              <p className="col-span-2 text-sm text-muted-foreground">
                No quedan tipos disponibles.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

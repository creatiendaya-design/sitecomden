"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useCodFormEditor } from "./store"
import SortableBlockItem from "./SortableBlockItem"
import AddBlockSelector from "./AddBlockSelector"
import BlockEditPanel from "./BlockEditPanel"

export default function BlocksList() {
  const sensors = useSensors(useSensor(PointerSensor))
  const blocks = useCodFormEditor((s) => s.blocks)
  const setBlocks = useCodFormEditor((s) => s.setBlocks)
  const patchBlock = useCodFormEditor((s) => s.patchBlock)
  const removeBlock = useCodFormEditor((s) => s.removeBlock)
  const [editingId, setEditingId] = useState<string | null>(null)

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex((b) => b.id === active.id)
    const newIdx = blocks.findIndex((b) => b.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    setBlocks(arrayMove(blocks, oldIdx, newIdx))
  }

  return (
    <section className="border rounded-lg bg-white">
      <div className="p-3 border-b font-medium text-sm">Formulario</div>
      <div className="p-3 space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map((b) => (
              <SortableBlockItem
                key={b.id}
                block={b}
                onEdit={() => setEditingId(b.id)}
                onToggleVisible={() => patchBlock(b.id, { visible: !b.visible })}
                onDelete={() => {
                  if (b.type === "SUBMIT_BUTTON") return
                  if (confirm("¿Eliminar este bloque?")) removeBlock(b.id)
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
        <AddBlockSelector />
      </div>
      <BlockEditPanel blockId={editingId} onClose={() => setEditingId(null)} />
    </section>
  )
}

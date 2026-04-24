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
import { BlockListItem } from "./BlockListItem"

export function BlockList() {
  const blocks = useBuilderStore((s) => s.blocks)
  const reorderBlocks = useBuilderStore((s) => s.reorderBlocks)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = blocks.findIndex((b) => `list-${b.id}` === active.id)
    const toIndex = blocks.findIndex((b) => `list-${b.id}` === over.id)
    if (fromIndex < 0 || toIndex < 0) return
    reorderBlocks(fromIndex, toIndex)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={blocks.map((b) => `list-${b.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-1.5">
          {blocks.map((block) => (
            <BlockListItem key={block.id} block={block} />
          ))}
        </div>
      </SortableContext>
      {blocks.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-6 border-2 border-dashed rounded-md">
          Sin bloques. Usa el botón de arriba para agregar.
        </div>
      )}
    </DndContext>
  )
}

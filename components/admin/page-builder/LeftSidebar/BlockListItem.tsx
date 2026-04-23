"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBuilderStore } from "../store"
import { getBlockDefinition } from "@/lib/blocks/registry"
import type { BlockInstance } from "@/lib/blocks/types"

interface BlockListItemProps {
  block: BlockInstance
}

export function BlockListItem({ block }: BlockListItemProps) {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const selectBlock = useBuilderStore((s) => s.selectBlock)
  const def = getBlockDefinition(block.type)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `list-${block.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isSelected = selectedBlockId === block.id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer",
        isSelected ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted border-transparent"
      )}
      onClick={() => selectBlock(block.id)}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-base">{def?.emoji ?? "◻"}</span>
      <span className="flex-1 min-w-0 truncate">{def?.label ?? block.type}</span>
    </div>
  )
}

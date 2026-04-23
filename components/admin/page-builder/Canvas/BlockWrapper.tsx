"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { ReactNode, SyntheticEvent } from "react"
import { useBuilderStore } from "../store"
import { BlockFloatingToolbar } from "./BlockFloatingToolbar"
import { cn } from "@/lib/utils"
import type { BlockInstance } from "@/lib/blocks/types"

interface BlockWrapperProps {
  block: BlockInstance
  children: ReactNode
}

export function BlockWrapper({ block, children }: BlockWrapperProps) {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const selectBlock = useBuilderStore((s) => s.selectBlock)

  const isSelected = selectedBlockId === block.id

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const handleClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    selectBlock(block.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        !isSelected && "hover:outline hover:outline-2 hover:outline-blue-400/60 hover:outline-offset-[-2px]",
        isSelected && "outline outline-2 outline-blue-500 outline-offset-[-2px]"
      )}
      onClick={handleClick}
    >
      {(isSelected || /* toolbar also shows on hover via CSS */ false) ? (
        <BlockFloatingToolbar block={block} dragHandleProps={{ ...attributes, ...listeners }} />
      ) : (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <BlockFloatingToolbar block={block} dragHandleProps={{ ...attributes, ...listeners }} />
        </div>
      )}

      {children}
    </div>
  )
}

"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { ReactNode, SyntheticEvent } from "react"
import { Link2, Pencil } from "lucide-react"
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
  const origin = block.origin ?? "local"

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
        // Origin tint: subtle background overlay so admins can scan a long
        // page and see at a glance which blocks are template-driven vs local.
        origin === "template" && "bg-blue-50/40 dark:bg-blue-950/20",
        origin === "detached" && "bg-amber-50/40 dark:bg-amber-950/20",
        !isSelected && "hover:outline hover:outline-2 hover:outline-blue-400/60 hover:outline-offset-[-2px]",
        isSelected && "outline outline-2 outline-blue-500 outline-offset-[-2px]"
      )}
      onClick={handleClick}
    >
      {origin !== "local" && <OriginBadge origin={origin} />}

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

function OriginBadge({ origin }: { origin: "template" | "detached" }) {
  const isTemplate = origin === "template"
  return (
    <div
      className={cn(
        "absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border",
        isTemplate
          ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800"
          : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
      )}
      title={isTemplate ? "Bloque heredado de la plantilla" : "Bloque desvinculado de la plantilla"}
    >
      {isTemplate ? <Link2 className="h-2.5 w-2.5" /> : <Pencil className="h-2.5 w-2.5" />}
      <span>{isTemplate ? "Heredado" : "Desvinculado"}</span>
    </div>
  )
}

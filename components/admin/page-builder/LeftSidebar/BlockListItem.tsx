"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVertical,
  MoreHorizontal,
  Copy,
  Link as LinkIcon,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useBuilderStore } from "../store"
import { getBlockDefinition } from "@/lib/blocks/registry"
import type { BlockInstance, Visibility } from "@/lib/blocks/types"
import type { SyntheticEvent } from "react"

interface BlockListItemProps {
  block: BlockInstance
}

export function BlockListItem({ block }: BlockListItemProps) {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const selectBlock = useBuilderStore((s) => s.selectBlock)
  const duplicateBlock = useBuilderStore((s) => s.duplicateBlock)
  const removeBlock = useBuilderStore((s) => s.removeBlock)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)
  const def = getBlockDefinition(block.type)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `list-${block.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isSelected = selectedBlockId === block.id
  const currentVisibility = (block.content.style.visibility ?? "always") as Visibility
  const isHidden = currentVisibility === "hidden"

  const stopProp = (e: SyntheticEvent) => e.stopPropagation()

  const setVisibility = (v: Visibility) => {
    updateBlockContent(block.id, {
      ...block.content,
      style: { ...block.content.style, visibility: v },
    })
  }

  const toggleHidden = (e: SyntheticEvent) => {
    e.stopPropagation()
    setVisibility(isHidden ? "always" : "hidden")
  }

  const copyLink = async (e: SyntheticEvent) => {
    e.stopPropagation()
    const url = `${window.location.pathname}#block=${block.id}`
    await navigator.clipboard.writeText(`${window.location.origin}${url}`)
    toast.success("Enlace al bloque copiado")
  }

  const handleDuplicate = (e: SyntheticEvent) => {
    e.stopPropagation()
    duplicateBlock(block.id)
  }

  const handleDelete = (e: SyntheticEvent) => {
    e.stopPropagation()
    if (confirm("¿Eliminar este bloque?")) removeBlock(block.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1 p-2 rounded-md border text-sm cursor-pointer",
        isSelected ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted border-transparent",
        isHidden && "opacity-60"
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

      <span className={cn("flex-1 min-w-0 truncate", isHidden && "line-through")}>
        {def?.label ?? block.type}
      </span>

      {/* Eye toggle — hide/show quickly */}
      <button
        type="button"
        aria-label={isHidden ? "Mostrar bloque" : "Ocultar bloque"}
        title={isHidden ? "Mostrar bloque" : "Ocultar bloque"}
        onClick={toggleHidden}
        className={cn(
          "h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-opacity",
          // Always visible when the block is hidden; otherwise reveal on hover/selected
          isHidden || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>

      {/* Overflow menu — same actions as the canvas floating toolbar */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Más opciones"
            onClick={stopProp}
            className={cn(
              "h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-opacity",
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={stopProp}>
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+D</span>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Eye className="h-4 w-4 mr-2" />
              Visibilidad
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel>Mostrar en</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={currentVisibility}
                onValueChange={(v) => setVisibility(v as Visibility)}
              >
                <DropdownMenuRadioItem value="always">Siempre</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="mobile-only">Solo mobile</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="desktop-only">Solo desktop</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="hidden">Oculto (todos)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={copyLink}>
            <LinkIcon className="h-4 w-4 mr-2" />
            Copiar enlace al bloque
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
            <span className="ml-auto text-xs text-muted-foreground">Del</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

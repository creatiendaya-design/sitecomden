"use client"

import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Copy,
  Eye,
  Link as LinkIcon,
  Settings,
  Trash2,
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
import { Button } from "@/components/ui/button"
import { useBuilderStore } from "../store"
import { toast } from "sonner"
import type { BlockInstance, Visibility } from "@/lib/blocks/types"
import type { SyntheticEvent } from "react"

interface BlockFloatingToolbarProps {
  block: BlockInstance
  dragHandleProps?: Record<string, unknown>
}

export function BlockFloatingToolbar({ block, dragHandleProps }: BlockFloatingToolbarProps) {
  const moveBlockRelative = useBuilderStore((s) => s.moveBlockRelative)
  const duplicateBlock = useBuilderStore((s) => s.duplicateBlock)
  const removeBlock = useBuilderStore((s) => s.removeBlock)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)

  const stopProp = (e: SyntheticEvent) => e.stopPropagation()

  const currentVisibility = (block.content.style.visibility ?? "always") as Visibility

  const setVisibility = (v: Visibility) => {
    updateBlockContent(block.id, {
      ...block.content,
      style: { ...block.content.style, visibility: v },
    })
  }

  const copyLink = async () => {
    const url = `${window.location.pathname}#block=${block.id}`
    await navigator.clipboard.writeText(`${window.location.origin}${url}`)
    toast.success("Enlace al bloque copiado")
  }

  const handleDelete = () => {
    if (confirm("¿Eliminar este bloque?")) removeBlock(block.id)
  }

  return (
    <div
      className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-background border rounded-md shadow-lg px-1 py-0.5 z-20"
      onClick={stopProp}
      onMouseDown={stopProp}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 cursor-grab active:cursor-grabbing"
        aria-label="Arrastrar para reordenar"
        {...dragHandleProps}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label="Mover arriba"
        onClick={() => moveBlockRelative(block.id, "up")}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label="Mover abajo"
        onClick={() => moveBlockRelative(block.id, "down")}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Más opciones">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={stopProp}>
          <DropdownMenuItem onClick={() => duplicateBlock(block.id)}>
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
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={copyLink}>
            <LinkIcon className="h-4 w-4 mr-2" />
            Copiar enlace al bloque
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings className="h-4 w-4 mr-2" />
            Ver propiedades avanzadas
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

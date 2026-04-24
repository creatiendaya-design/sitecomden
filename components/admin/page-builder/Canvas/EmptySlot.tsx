"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { AddBlockPanel } from "../LeftSidebar/AddBlockPanel"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useBuilderStore } from "../store"
import type { LandingBlockType } from "@/lib/blocks/types"

interface EmptySlotProps {
  position: number
}

export function EmptySlot({ position }: EmptySlotProps) {
  const [open, setOpen] = useState(false)
  const addBlock = useBuilderStore((s) => s.addBlock)

  const handleAdd = (type: LandingBlockType) => {
    addBlock(type, position)
    setOpen(false)
  }

  return (
    <div className="h-3 relative group/slot">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Agregar bloque aquí"
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity"
          >
            <span className="absolute inset-x-2 h-px bg-blue-400" />
            <span className="relative z-10 inline-flex items-center gap-1 bg-blue-500 text-white text-xs font-medium rounded-full px-2 py-0.5 shadow">
              <Plus className="h-3 w-3" />
              Agregar
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="center" side="bottom">
          <AddBlockPanel scope="product" onAdd={handleAdd} />
        </PopoverContent>
      </Popover>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { BlockList } from "./BlockList"
import { AddBlockPanel } from "./AddBlockPanel"
import { useBuilderStore } from "../store"
import type { BuilderScope, LandingBlockType } from "../types"

interface LeftSidebarProps {
  scope: BuilderScope
}

export function LeftSidebar({ scope }: LeftSidebarProps) {
  const [addOpen, setAddOpen] = useState(false)
  const addBlock = useBuilderStore((s) => s.addBlock)

  const handleAdd = (type: LandingBlockType) => {
    addBlock(type)
    setAddOpen(false)
  }

  return (
    <aside className="w-[280px] shrink-0 border-r bg-background flex flex-col overflow-hidden">
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <h2 className="text-sm font-medium">Secciones</h2>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <AddBlockPanel scope={scope} onAdd={handleAdd} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <BlockList />
      </div>
    </aside>
  )
}

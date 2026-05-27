"use client"

import { X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useBuilderStore } from "../store"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { EmptyState } from "./EmptyState"
import { ContentTab } from "./tabs/ContentTab"
import { StyleTab } from "./tabs/StyleTab"
import { AdvancedTab } from "./tabs/AdvancedTab"
import { InheritanceBanner } from "./InheritanceBanner"
import type { BuilderContext } from "../types"

interface RightSidebarProps {
  context?: BuilderContext
}

export function RightSidebar({ context }: RightSidebarProps) {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const selectBlock = useBuilderStore((s) => s.selectBlock)

  const block = blocks.find((b) => b.id === selectedBlockId)

  if (!block) {
    return (
      <aside className="w-[340px] shrink-0 border-l bg-background flex flex-col overflow-hidden">
        <EmptyState />
      </aside>
    )
  }

  const def = getBlockDefinition(block.type)
  const isInheritedReadOnly = block.origin === "template"

  const tabs = (
    <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
      <TabsList className="mx-3 mt-2 shrink-0">
        <TabsTrigger value="content" className="flex-1">Contenido</TabsTrigger>
        <TabsTrigger value="style" className="flex-1">Estilo</TabsTrigger>
        <TabsTrigger value="advanced" className="flex-1">Avanzado</TabsTrigger>
      </TabsList>
      <TabsContent value="content" className="flex-1 overflow-auto p-3 mt-0">
        <ContentTab />
      </TabsContent>
      <TabsContent value="style" className="flex-1 overflow-auto p-3 mt-0">
        <StyleTab />
      </TabsContent>
      <TabsContent value="advanced" className="flex-1 overflow-auto p-3 mt-0">
        <AdvancedTab />
      </TabsContent>
    </Tabs>
  )

  return (
    <aside className="w-[340px] shrink-0 border-l bg-background flex flex-col overflow-hidden">
      <div className="p-3 border-b flex items-center gap-2 shrink-0">
        <span className="text-sm font-medium truncate flex-1">{def?.label ?? block.type}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Cerrar panel"
          onClick={() => selectBlock(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <InheritanceBanner block={block} context={context} />

      {isInheritedReadOnly ? (
        <div className="pointer-events-none opacity-60 flex-1 flex flex-col overflow-hidden">
          {tabs}
        </div>
      ) : (
        tabs
      )}
    </aside>
  )
}

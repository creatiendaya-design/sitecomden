"use client"

import { useEffect } from "react"
import { useBuilderStore } from "./store"
import { TopBar } from "./TopBar"
import { LeftSidebar } from "./LeftSidebar/LeftSidebar"
import { Canvas } from "./Canvas/Canvas"
import { RightSidebar } from "./RightSidebar/RightSidebar"
import { registerExistingBlocks } from "@/lib/blocks/register-existing-blocks"
import type { PageBuilderProps } from "./types"
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"

export function PageBuilder({
  blocks: initialBlocks,
  onBlocksChange,
  scope,
  context,
  actions,
  title,
  backHref,
}: PageBuilderProps) {
  // Ensure registry is populated (idempotent)
  useEffect(() => {
    registerExistingBlocks()
  }, [])

  const setBlocks = useBuilderStore((s) => s.setBlocks)
  const blocks = useBuilderStore((s) => s.blocks)

  // Hydrate store from props on mount and when initialBlocks changes
  useEffect(() => {
    setBlocks(initialBlocks)
  }, [initialBlocks, setBlocks])

  // Bubble changes up to parent so it can persist via Server Actions
  useEffect(() => {
    if (blocks !== initialBlocks) {
      onBlocksChange(blocks)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks])

  useKeyboardShortcuts()

  return (
    <div className="h-screen flex flex-col bg-muted/20">
      <TopBar title={title} backHref={backHref} actions={actions} />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar scope={scope} />
        <Canvas context={context} />
        <RightSidebar context={context} />
      </div>
    </div>
  )
}

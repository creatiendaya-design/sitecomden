"use client"

import { useEffect, useRef } from "react"
import { useBuilderStore } from "./store"
import { TopBar } from "./TopBar"
import { LeftSidebar } from "./LeftSidebar/LeftSidebar"
import { Canvas } from "./Canvas/Canvas"
import { RightSidebar } from "./RightSidebar/RightSidebar"
import { registerExistingBlocks } from "@/lib/blocks/register-existing-blocks"
import type { PageBuilderProps } from "./types"
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"
import { useUrlSelection } from "./hooks/useUrlSelection"
import { useBeforeUnload } from "./hooks/useBeforeUnload"

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

  // Hydrate store from props ONCE on mount. After mount, the store is the
  // source of truth — we do NOT re-sync from props, because that creates a
  // ping-pong loop with onBlocksChange (store → parent → prop → store).
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    setBlocks(initialBlocks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Bubble changes up to parent so it can persist via Server Actions.
  // Skip until the first hydration has happened — otherwise the initial
  // setBlocks call fires this with the SAME blocks array (just different ref).
  useEffect(() => {
    if (!hydratedRef.current) return
    onBlocksChange(blocks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks])

  useKeyboardShortcuts()
  useUrlSelection()
  useBeforeUnload()

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

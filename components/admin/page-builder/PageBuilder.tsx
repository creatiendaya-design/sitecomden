"use client"

import { useEffect, useRef, useState } from "react"
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
  headerExtra,
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
  //
  // `hydrated` is a useState (not a ref) because the blocks-watcher
  // useEffect below reads it via closure, and we NEED the first render's
  // closure to see `false`. With a ref, both effects run in the same
  // commit and the watcher would see `true` (set by the hydration effect)
  // before hydration's setBlocks state update flushed — causing the
  // watcher to fire onBlocksChange with the pre-hydration blocks=[].
  // Downstream that empty payload became a phantom no-op autosave that
  // briefly showed "guardando" and, with Plan 18, could race into a
  // conflict against another admin's concurrent edits.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (hydrated) return
    setBlocks(initialBlocks)
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-sync store when the parent passes a NEW initialBlocks reference
  // post-hydration. Happens after `router.refresh()` resolves: the server
  // component re-renders with fresh data, the prop reference changes, and
  // we have to push that into the store or the canvas keeps showing the
  // stale local state. We compare by reference (not deep-equal) because
  // the server's RSC payload always allocates a fresh array — a reference
  // change here is a deliberate parent refresh.
  const lastInitialBlocksRef = useRef(initialBlocks)
  useEffect(() => {
    if (!hydrated) return
    if (lastInitialBlocksRef.current === initialBlocks) return
    lastInitialBlocksRef.current = initialBlocks
    setBlocks(initialBlocks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBlocks, hydrated])

  // Bubble changes up to parent so it can persist via Server Actions.
  useEffect(() => {
    if (!hydrated) return
    onBlocksChange(blocks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, hydrated])

  useKeyboardShortcuts()
  useUrlSelection()
  useBeforeUnload()

  return (
    <div className="h-screen flex flex-col bg-muted/20">
      <TopBar title={title} backHref={backHref} actions={actions} headerExtra={headerExtra} />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar scope={scope} />
        <Canvas context={context} />
        <RightSidebar context={context} />
      </div>
    </div>
  )
}

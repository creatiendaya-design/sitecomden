"use client"

import { useEffect } from "react"
import { useBuilderStore } from "../store"

/**
 * Sync selected block id with URL hash:
 *   /admin/productos/[id]#block=<blockId>
 *
 * On mount: read hash, select matching block if any.
 * On selection change: replace hash to reflect current selection.
 * On back/forward navigation: re-sync store from hash.
 */
export function useUrlSelection() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const selectBlock = useBuilderStore((s) => s.selectBlock)
  const blocks = useBuilderStore((s) => s.blocks)

  // Read from hash on mount and on popstate
  useEffect(() => {
    const syncFromHash = () => {
      const match = window.location.hash.match(/block=([^&]+)/)
      const id = match?.[1]
      if (id && blocks.some((b) => b.id === id)) {
        selectBlock(id)
      } else if (!id) {
        selectBlock(null)
      }
    }

    syncFromHash()
    window.addEventListener("popstate", syncFromHash)
    return () => window.removeEventListener("popstate", syncFromHash)
  }, [blocks, selectBlock])

  // Write to hash on selection change
  useEffect(() => {
    const hash = selectedBlockId ? `#block=${selectedBlockId}` : ""
    if (window.location.hash !== hash) {
      const newUrl = `${window.location.pathname}${window.location.search}${hash}`
      window.history.replaceState(null, "", newUrl)
    }
  }, [selectedBlockId])
}

"use client"

import { useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { LeftSidebar } from "@/components/admin/page-builder/LeftSidebar/LeftSidebar"
import { useBuilderStore } from "@/components/admin/page-builder/store"
import { registerExistingBlocks } from "@/lib/blocks/register-existing-blocks"
import { savePageBlocks } from "@/actions/pages"
import type { BlockInstance } from "@/lib/blocks/types"

interface Props {
  pageId: string
  initialBlocks: BlockInstance[]
  onSaved?: () => void
}

const AUTOSAVE_DEBOUNCE_MS = 600

/**
 * Plan 13 — embeds the page-builder LeftSidebar (block list + add panel)
 * inside the customizer. Hydrates the global builder store from the
 * server-fetched blocks on mount and whenever pageId changes (so
 * switching the target page in the toolbar reloads cleanly).
 *
 * Autosaves on every block mutation via savePageBlocks. The customizer
 * iframe refreshes after each save so the admin sees changes live.
 */
export function EmbeddedBlocksEditor({ pageId, initialBlocks, onSaved }: Props) {
  const setBlocks = useBuilderStore((s) => s.setBlocks)
  const selectBlock = useBuilderStore((s) => s.selectBlock)
  const blocks = useBuilderStore((s) => s.blocks)
  const setSaveStatus = useBuilderStore((s) => s.setSaveStatus)

  // Register block definitions once (idempotent inside).
  useEffect(() => {
    registerExistingBlocks()
  }, [])

  // Hydrate the global store with the blocks of the active page. When the
  // target page changes (admin picked Cart instead of Home), this also
  // resets selection and sets the new block list.
  const hydratedKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (hydratedKeyRef.current === pageId) return
    hydratedKeyRef.current = pageId
    selectBlock(null)
    setBlocks(initialBlocks)
  }, [pageId, initialBlocks, setBlocks, selectBlock])

  // Debounced autosave on block changes. Only fires after the first
  // hydration has settled — otherwise the initial setBlocks would
  // re-persist the same blocks.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleBlocksChange = useCallback(
    (next: BlockInstance[]) => {
      if (hydratedKeyRef.current !== pageId) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        setSaveStatus({ status: "saving" })
        try {
          await savePageBlocks(
            pageId,
            next.map((b) => ({
              id: b.id,
              type: b.type as Parameters<
                typeof savePageBlocks
              >[1][number]["type"],
              position: b.position,
              content: b.content as unknown,
            })),
          )
          setSaveStatus({ status: "saved", at: Date.now() })
          setTimeout(() => {
            const s = useBuilderStore.getState().saveStatus
            if (s.status === "saved") {
              setSaveStatus({ status: "idle" })
            }
          }, 2000)
          onSaved?.()
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Error al guardar"
          setSaveStatus({ status: "error", message })
          toast.error(`Error al guardar: ${message}`)
        }
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [pageId, setSaveStatus, onSaved],
  )

  // Bubble store changes up through the autosave handler. We watch the
  // `blocks` reference; the store mutates it on every edit.
  useEffect(() => {
    if (hydratedKeyRef.current !== pageId) return
    handleBlocksChange(blocks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks])

  // Clean up debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return <LeftSidebar scope="page" />
}

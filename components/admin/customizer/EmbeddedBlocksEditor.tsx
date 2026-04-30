"use client"

import { useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { LeftSidebar } from "@/components/admin/page-builder/LeftSidebar/LeftSidebar"
import { useBuilderStore } from "@/components/admin/page-builder/store"
import type { BuilderScope } from "@/components/admin/page-builder/types"
import { registerExistingBlocks } from "@/lib/blocks/register-existing-blocks"
import type { BlockInstance, LandingBlockType } from "@/lib/blocks/types"

/**
 * Persisted shape the editor passes back to its `saveBlocks` callback.
 * The caller maps to the right server action (savePageBlocks vs
 * saveCategoryBlocks) so the editor doesn't need to know the surface.
 */
export interface EditorBlock {
  id: string
  type: LandingBlockType
  position: number
  content: unknown
}

interface Props {
  /** Stable identifier for the current editing surface — when this
   *  changes, the global builder store re-hydrates with `initialBlocks`.
   *  Use `page-<id>` or `category-<id>` etc. to keep the namespace clean. */
  editorKey: string
  initialBlocks: BlockInstance[]
  /** Called after each debounced edit. The customizer wires this to the
   *  appropriate server action (savePageBlocks for home/cart/page,
   *  saveCategoryBlocks for category targets). */
  saveBlocks: (blocks: EditorBlock[]) => Promise<void>
  /** Scope passed to the page-builder LeftSidebar — drives which block
   *  types are offered in the Add panel. Defaults to "page". */
  scope?: BuilderScope
  onSaved?: () => void
}

const AUTOSAVE_DEBOUNCE_MS = 600

/**
 * Plan 13 — embeds the page-builder LeftSidebar (block list + add panel)
 * inside the customizer. Hydrates the global builder store on mount and
 * whenever editorKey changes (admin switched target in the toolbar).
 *
 * Autosaves every change via the supplied `saveBlocks` callback. The
 * customizer iframe refreshes after each save so the admin sees changes
 * live. Plan 14 generalized the save path so both pages and categories
 * can be edited through this same component.
 */
export function EmbeddedBlocksEditor({
  editorKey,
  initialBlocks,
  saveBlocks,
  scope = "page",
  onSaved,
}: Props) {
  const setBlocks = useBuilderStore((s) => s.setBlocks)
  const selectBlock = useBuilderStore((s) => s.selectBlock)
  const blocks = useBuilderStore((s) => s.blocks)
  const setSaveStatus = useBuilderStore((s) => s.setSaveStatus)

  // Register block definitions once (idempotent inside).
  useEffect(() => {
    registerExistingBlocks()
  }, [])

  // Hydrate the global store with the blocks of the active surface. When
  // the editor key changes (admin picked a different target), this also
  // resets selection and replaces the block list.
  const hydratedKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (hydratedKeyRef.current === editorKey) return
    hydratedKeyRef.current = editorKey
    selectBlock(null)
    setBlocks(initialBlocks)
  }, [editorKey, initialBlocks, setBlocks, selectBlock])

  // Debounced autosave on block changes. Only fires after the first
  // hydration has settled — otherwise the initial setBlocks would
  // re-persist the same blocks.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleBlocksChange = useCallback(
    (next: BlockInstance[]) => {
      if (hydratedKeyRef.current !== editorKey) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        setSaveStatus({ status: "saving" })
        try {
          await saveBlocks(
            next.map((b) => ({
              id: b.id,
              type: b.type as LandingBlockType,
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
    [editorKey, setSaveStatus, onSaved, saveBlocks],
  )

  // Bubble store changes up through the autosave handler. We watch the
  // `blocks` reference; the store mutates it on every edit.
  useEffect(() => {
    if (hydratedKeyRef.current !== editorKey) return
    handleBlocksChange(blocks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks])

  // Clean up debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return <LeftSidebar scope={scope} />
}

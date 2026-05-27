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
  /** Plan 18 — version known to the client. Undefined for newly-created
   *  blocks that haven't been persisted yet. The save action uses this for
   *  per-row conditional updates. */
  version?: number
}

/** Plan 18 — return type from `saveBlocks`. Either a successful save with
 *  the persisted snapshot (fresh versions), or a conflict report from the
 *  server that the customizer surfaces via BatchConflictDialog. */
export type SaveBlocksResult =
  | { ok: true; persisted: EditorBlock[] }
  | {
      ok: false
      reason: "conflict"
      conflicts: { rowId: string; serverVersion: number | null; label: string }[]
      /** The exact payload the editor sent — used by the customizer to build
       *  the force-overwrite retry payload. */
      sent: EditorBlock[]
    }
  | { ok: false; reason: "error"; message: string }

interface Props {
  /** Stable identifier for the current editing surface — when this
   *  changes, the global builder store re-hydrates with `initialBlocks`.
   *  Use `page-<id>` or `category-<id>` etc. to keep the namespace clean. */
  editorKey: string
  initialBlocks: BlockInstance[]
  /** Called after each debounced edit. The customizer wires this to the
   *  appropriate server action (savePageBlocks for home/cart/page,
   *  saveCategoryBlocks for category targets). */
  saveBlocks: (blocks: EditorBlock[]) => Promise<SaveBlocksResult>
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
    // Seed the dedup ref so the very first blocks-change useEffect (which
    // fires because setBlocks just mutated the store) doesn't trigger a
    // no-op autosave.
    lastSerializedRef.current = JSON.stringify(initialBlocks)
  }, [editorKey, initialBlocks, setBlocks, selectBlock])

  const replaceBlocksFromServer = useBuilderStore(
    (s) => s.replaceBlocksFromServer,
  )

  // Plan 18 — serialize saves to prevent self-conflicts. See
  // PageBuilderShell for the rationale. The drain loop reads from the
  // store each iteration so the latest `version` (post-replace) is used.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef(false)
  const pendingRef = useRef(false)
  const hadConflictRef = useRef(false)
  // Dedup ref — skip autosaves when nothing actually changed. CRITICAL
  // because the blocks-watcher useEffect fires on initial hydration too,
  // and without this we'd fire a no-op save on mount. That no-op save is
  // dangerous: in the 600ms debounce window another admin might bump the
  // version, so our "echo back the same state" save races into a
  // CONFLICT against the freshly-advanced server version.
  const lastSerializedRef = useRef<string | null>(null)

  const performSave = useCallback(async () => {
    if (inFlightRef.current) {
      pendingRef.current = true
      return
    }
    inFlightRef.current = true
    try {
      do {
        pendingRef.current = false
        // Read latest store state so `version` reflects the previous
        // iteration's `replaceBlocksFromServer`.
        const currentBlocks = useBuilderStore.getState().blocks
        setSaveStatus({ status: "saving" })
        const result = await saveBlocks(
          currentBlocks.map((b) => ({
            id: b.id,
            type: b.type as LandingBlockType,
            position: b.position,
            content: b.content as unknown,
            version: b.version,
          })),
        )
        if (result.ok) {
          replaceBlocksFromServer(result.persisted)
          // Re-seed the dedup ref so the blocks-watcher useEffect that
          // fires from replaceBlocksFromServer (new ids/versions) doesn't
          // immediately schedule another no-op save.
          lastSerializedRef.current = JSON.stringify(
            useBuilderStore.getState().blocks,
          )
          setSaveStatus({ status: "saved", at: Date.now() })
          setTimeout(() => {
            const s = useBuilderStore.getState().saveStatus
            if (s.status === "saved") {
              setSaveStatus({ status: "idle" })
            }
          }, 2000)
          onSaved?.()
          continue
        }
        if (result.reason === "conflict") {
          // Conflict surfaces via the parent's BatchConflictDialog.
          // Stop draining — the user needs to resolve before we save again.
          setSaveStatus({
            status: "error",
            message: `${result.conflicts.length} bloque(s) modificados por otro admin`,
          })
          hadConflictRef.current = true
          pendingRef.current = false
          return
        }
        setSaveStatus({ status: "error", message: result.message })
        toast.error(`Error al guardar: ${result.message}`)
        pendingRef.current = false
        return
      } while (pendingRef.current)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar"
      setSaveStatus({ status: "error", message })
      toast.error(`Error al guardar: ${message}`)
    } finally {
      inFlightRef.current = false
    }
  }, [setSaveStatus, onSaved, saveBlocks, replaceBlocksFromServer])

  const handleBlocksChange = useCallback(
    (next: BlockInstance[]) => {
      if (hydratedKeyRef.current !== editorKey) return
      // While a conflict is on screen, freeze autosave — the parent's
      // BatchConflictDialog is the gate. The reload/force flow will reset
      // `hadConflictRef` indirectly via remount (editorKey change).
      if (hadConflictRef.current) return
      // Plan 18 — only autosave on user edits. The watcher also fires on
      // setBlocks (hydration) and replaceBlocksFromServer (post-save), and
      // those should NOT trigger another save.
      if (!useBuilderStore.getState().isDirty) return
      // Dedup: skip if nothing actually changed since the last save.
      const serialized = JSON.stringify(next)
      if (serialized === lastSerializedRef.current) return
      lastSerializedRef.current = serialized
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void performSave()
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [editorKey, performSave],
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

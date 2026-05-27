"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PageBuilder } from "@/components/admin/page-builder/PageBuilder"
import { useBuilderStore } from "@/components/admin/page-builder/store"
import { savePageBlocksVersioned } from "@/actions/pages"
import { PagePicker } from "./PagePicker"
import type { BlockInstance } from "@/lib/blocks/types"
import { BatchConflictDialog } from "@/components/admin/concurrency/BatchConflictDialog"

interface PageBuilderShellProps {
  page: {
    id: string
    slug: string
    title: string
  }
  initialBlocks: BlockInstance[]
}

const AUTOSAVE_DEBOUNCE_MS = 600

type PendingPayload = {
  id: string
  type: string
  position: number
  content: unknown
  version?: number
}[]

interface ConflictState {
  sent: PendingPayload
  conflicts: {
    rowId: string
    serverVersion: number | null
    label: string
  }[]
}

export function PageBuilderShell({
  page,
  initialBlocks,
}: PageBuilderShellProps) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSerializedRef = useRef<string>(JSON.stringify(initialBlocks))
  const [conflict, setConflict] = useState<ConflictState | null>(null)
  const conflictRef = useRef<ConflictState | null>(null)
  conflictRef.current = conflict
  // Plan 18 — bump this counter on Recargar to force PageBuilder + its
  // store to fully remount with the freshly-fetched `initialBlocks`.
  // Without the remount the Zustand store keeps the conflicted local
  // edit, defeating the whole point of accepting the server copy.
  const [reloadGen, setReloadGen] = useState(0)

  const replaceBlocksFromServer = useBuilderStore(
    (s) => s.replaceBlocksFromServer,
  )

  // Plan 18 — serialize saves to prevent self-conflicts. Without this,
  // two rapid edits race: edit Y's autosave starts before edit X's save
  // responds, so Y sends the pre-X `version` and conflicts against the
  // version X just bumped server-side. The pattern:
  //   - inFlightRef: there's a save running right now
  //   - pendingRef:  another edit happened while a save was in flight;
  //                  re-fire after the current save completes
  // The drain loop reads `useBuilderStore.getState().blocks` each iteration
  // so the new version (post-replaceBlocksFromServer) is picked up.
  const inFlightRef = useRef(false)
  const pendingRef = useRef(false)

  const performSave = useCallback(
    async (overridePayload?: PendingPayload) => {
      // If something is already saving and the caller isn't doing a force
      // overwrite, just queue. The currently-running save will drain.
      if (inFlightRef.current && !overridePayload) {
        pendingRef.current = true
        return
      }
      inFlightRef.current = true

      try {
        let payload: PendingPayload | undefined = overridePayload
        do {
          pendingRef.current = false

          // If we don't have an override (regular autosave path), build
          // the payload from the LATEST store state. This is what makes
          // the drain loop correct: after replaceBlocksFromServer ran on
          // the previous iteration, blocks already have fresh versions.
          if (!payload) {
            const blocks = useBuilderStore.getState().blocks
            payload = blocks.map((b) => ({
              id: b.id,
              type: b.type,
              position: b.position,
              content: b.content as unknown,
              version: b.version,
            }))
          }

          useBuilderStore.getState().setSaveStatus({ status: "saving" })
          const result = await savePageBlocksVersioned(
            page.id,
            payload.map((b) => ({
              id: b.id,
              type: b.type as Parameters<
                typeof savePageBlocksVersioned
              >[1][number]["type"],
              position: b.position,
              content: b.content,
              version: b.version,
            })),
          )

          if (result.ok) {
            replaceBlocksFromServer(result.data.blocks)
            useBuilderStore
              .getState()
              .setSaveStatus({ status: "saved", at: Date.now() })
            setTimeout(() => {
              const s = useBuilderStore.getState().saveStatus
              if (s.status === "saved") {
                useBuilderStore.getState().setSaveStatus({ status: "idle" })
              }
            }, 2000)
            // Successful save: reset payload so next iteration reads
            // from store (drain).
            payload = undefined
            continue
          }

          if (result.reason === "conflict") {
            setConflict({
              sent: payload,
              conflicts: result.conflicts.map((c) => ({
                rowId: c.rowId,
                serverVersion: c.serverVersion,
                label: c.current
                  ? `${c.current.type} (#${c.current.position + 1})`
                  : `Bloque eliminado (${c.rowId.slice(-6)})`,
              })),
            })
            useBuilderStore.getState().setSaveStatus({
              status: "error",
              message: `${result.conflicts.length} bloque(s) modificados por otro admin`,
            })
            // Drop pending: the user needs to resolve before we keep
            // autosaving (we'd just keep conflicting).
            pendingRef.current = false
            return
          }

          const message =
            "message" in result
              ? result.message
              : result.reason === "unauthorized"
                ? "Sesión expirada"
                : "El recurso ya no existe"
          useBuilderStore.getState().setSaveStatus({
            status: "error",
            message,
          })
          toast.error(`Error al guardar: ${message}`)
          pendingRef.current = false
          return
        } while (pendingRef.current && !conflictRef.current)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al guardar"
        useBuilderStore.getState().setSaveStatus({ status: "error", message })
        toast.error(`Error al guardar: ${message}`)
      } finally {
        inFlightRef.current = false
      }
    },
    [page.id, replaceBlocksFromServer],
  )

  const handleBlocksChange = useCallback(
    (next: BlockInstance[]) => {
      // While a conflict is on screen, freeze autosave — let the user pick
      // Reload or Force before resuming.
      if (conflictRef.current) return

      // Plan 18 — only autosave when the change came from a user action.
      // The watcher also fires on initial hydration (setBlocks), on post-
      // save sync (replaceBlocksFromServer), and on post-router.refresh
      // re-hydration. None of those are user edits, and saving in those
      // cases either causes a no-op round-trip or races into a false
      // conflict against a more recently advanced version on the server.
      // The store's `isDirty` flag tracks "user edited" — true after any
      // mutation in the page-builder store, false after server-side
      // ingest (setBlocks / replaceBlocksFromServer).
      if (!useBuilderStore.getState().isDirty) return

      const serialized = JSON.stringify(next)
      if (serialized === lastSerializedRef.current) return
      lastSerializedRef.current = serialized

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        // performSave() with no args reads the latest store state itself.
        // Don't await — the autosave is fire-and-forget; serialization is
        // handled inside performSave via inFlightRef.
        void performSave()
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [performSave],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleReload = useCallback(() => {
    setConflict(null)
    // Clear the lingering "Error al guardar" status — autosave will resume
    // on the next edit, and we don't want the chip to keep claiming an
    // error after the user explicitly accepted the server's copy.
    useBuilderStore.getState().setSaveStatus({ status: "idle" })
    // Force the PageBuilder subtree to remount so the store re-hydrates
    // from the server-fetched `initialBlocks` instead of keeping the
    // conflicted local draft. The remount also resets selection / debounce.
    setReloadGen((g) => g + 1)
    // Reset the dirty-tracking ref so the next render's auto-fired
    // handleBlocksChange (with the fresh initialBlocks) is a no-op.
    lastSerializedRef.current = ""
    router.refresh()
  }, [router])

  const handleForce = useCallback(async () => {
    if (!conflict) return
    const versionMap = new Map<string, number>()
    for (const c of conflict.conflicts) {
      if (c.serverVersion !== null) versionMap.set(c.rowId, c.serverVersion)
    }
    const forced = conflict.sent.map((b) => ({
      ...b,
      version: versionMap.get(b.id) ?? b.version,
    }))
    setConflict(null)
    await performSave(forced)
  }, [conflict, performSave])

  return (
    <>
      <PageBuilder
        key={reloadGen}
        blocks={initialBlocks}
        onBlocksChange={handleBlocksChange}
        scope="page"
        context={{ type: "page", page }}
        title={page.title}
        backHref="/admin/paginas"
        headerExtra={<PagePicker currentPageId={page.id} />}
      />

      <BatchConflictDialog
        open={conflict !== null}
        onOpenChange={(next) => {
          if (!next) setConflict(null)
        }}
        conflicts={
          conflict?.conflicts.map((c) => ({
            rowId: c.rowId,
            current: { label: c.label } as { label: string },
            serverVersion: c.serverVersion,
          })) ?? []
        }
        onReload={handleReload}
        onForce={handleForce}
        resourceLabel="esta página"
        formatLabel={(c) => c.current?.label ?? c.rowId}
      />
    </>
  )
}

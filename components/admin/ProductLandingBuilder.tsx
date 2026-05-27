"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { PageBuilder } from "./page-builder/PageBuilder"
import { useBuilderStore } from "./page-builder/store"
import { syncProductLandingBlocksVersioned } from "@/actions/landing-blocks"
import { TemplateSelector } from "./products/TemplateSelector"
import type { BlockInstance } from "@/lib/blocks/types"
import { toast } from "sonner"
import { BatchConflictDialog } from "@/components/admin/concurrency/BatchConflictDialog"

interface ProductLandingBuilderProps {
  product: {
    id: string
    slug: string
    name: string
  }
  initialBlocks: BlockInstance[]
  currentTemplateId: string | null
  currentBlockCount: number
}

const AUTOSAVE_DEBOUNCE_MS = 600

type PendingPayload = {
  id: string
  type: string
  position: number
  content: unknown
  sourceTemplateBlockId?: string | null
  detached?: boolean
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

export function ProductLandingBuilder({
  product,
  initialBlocks,
  currentTemplateId,
  currentBlockCount,
}: ProductLandingBuilderProps) {
  const router = useRouter()
  // No mirror state: the Zustand store in PageBuilder is the single source of
  // truth after the initial hydration. Holding mirror state here would create
  // a ping-pong loop (store → onBlocksChange → setState → prop → useEffect → store).
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSerializedRef = useRef<string>(JSON.stringify(initialBlocks))
  const [conflict, setConflict] = useState<ConflictState | null>(null)
  const conflictRef = useRef<ConflictState | null>(null)
  conflictRef.current = conflict
  // Plan 18 — see PageBuilderShell for the rationale on this counter.
  const [reloadGen, setReloadGen] = useState(0)

  const replaceBlocksFromServer = useBuilderStore(
    (s) => s.replaceBlocksFromServer,
  )

  // Plan 18 — see PageBuilderShell for the serialization rationale.
  const inFlightRef = useRef(false)
  const pendingRef = useRef(false)

  const performSave = useCallback(
    async (overridePayload?: PendingPayload) => {
      if (inFlightRef.current && !overridePayload) {
        pendingRef.current = true
        return
      }
      inFlightRef.current = true

      try {
        let payload: PendingPayload | undefined = overridePayload
        do {
          pendingRef.current = false

          if (!payload) {
            const blocks = useBuilderStore.getState().blocks
            payload = blocks.map((b) => ({
              id: b.id,
              type: b.type,
              position: b.position,
              content: b.content as unknown,
              sourceTemplateBlockId: b.sourceTemplateBlockId ?? null,
              detached: b.detached ?? false,
              version: b.version,
            }))
          }

          useBuilderStore.getState().setSaveStatus({ status: "saving" })
          const result = await syncProductLandingBlocksVersioned(
            product.id,
            payload.map((b) => ({
              id: b.id,
              type: b.type as Parameters<
                typeof syncProductLandingBlocksVersioned
              >[1][number]["type"],
              position: b.position,
              content: b.content,
              sourceTemplateBlockId: b.sourceTemplateBlockId ?? null,
              detached: b.detached ?? false,
              version: b.version,
            })),
          )

          if (result.ok) {
            replaceBlocksFromServer(result.data.blocks)
            lastSerializedRef.current = JSON.stringify(
              useBuilderStore.getState().blocks,
            )
            useBuilderStore
              .getState()
              .setSaveStatus({ status: "saved", at: Date.now() })
            setTimeout(() => {
              const s = useBuilderStore.getState().saveStatus
              if (s.status === "saved")
                useBuilderStore.getState().setSaveStatus({ status: "idle" })
            }, 2000)
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
    [product.id, replaceBlocksFromServer],
  )

  const handleBlocksChange = useCallback(
    (next: BlockInstance[]) => {
      if (conflictRef.current) return
      // Plan 18 — see PageBuilderShell for the rationale on this gate.
      if (!useBuilderStore.getState().isDirty) return

      const serialized = JSON.stringify(next)
      if (serialized === lastSerializedRef.current) return
      lastSerializedRef.current = serialized

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
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
    useBuilderStore.getState().setSaveStatus({ status: "idle" })
    setReloadGen((g) => g + 1)
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
        scope="product"
        context={{ type: "product", product }}
        title={product.name}
        backHref={`/admin/productos/${product.id}`}
        headerExtra={
          <TemplateSelector
            productId={product.id}
            productSlug={product.slug}
            currentTemplateId={currentTemplateId}
            currentBlockCount={currentBlockCount}
          />
        }
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
        resourceLabel="esta landing"
        formatLabel={(c) => c.current?.label ?? c.rowId}
      />
    </>
  )
}

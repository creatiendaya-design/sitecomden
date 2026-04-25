"use client"

import { useCallback, useEffect, useRef } from "react"
import { PageBuilder } from "./page-builder/PageBuilder"
import { useBuilderStore } from "./page-builder/store"
import { syncProductLandingBlocks } from "@/actions/landing-blocks"
import { TemplateSelector } from "./products/TemplateSelector"
import type { BlockInstance } from "@/lib/blocks/types"
import { toast } from "sonner"

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

export function ProductLandingBuilder({
  product,
  initialBlocks,
  currentTemplateId,
  currentBlockCount,
}: ProductLandingBuilderProps) {
  // No mirror state: the Zustand store in PageBuilder is the single source of
  // truth after the initial hydration. Holding mirror state here would create
  // a ping-pong loop (store → onBlocksChange → setState → prop → useEffect → store).
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSerializedRef = useRef<string>(JSON.stringify(initialBlocks))

  const handleBlocksChange = useCallback(
    (next: BlockInstance[]) => {
      const serialized = JSON.stringify(next)
      if (serialized === lastSerializedRef.current) return
      lastSerializedRef.current = serialized

      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(async () => {
        useBuilderStore.getState().setSaveStatus({ status: "saving" })
        try {
          const result = await syncProductLandingBlocks(
            product.id,
            next.map((b) => ({
              id: b.id,
              // Cast to satisfy the action's narrower LandingBlockType union; the
              // Prisma enum is the canonical source — values are always compatible.
              type: b.type as Parameters<typeof syncProductLandingBlocks>[1][number]["type"],
              position: b.position,
              content: b.content as unknown,
              sourceTemplateBlockId: b.sourceTemplateBlockId ?? null,
              detached: b.detached ?? false,
            }))
          )

          if (result.success) {
            // Reconcile temp ids with real cuids in the store
            if (Object.keys(result.tmpToReal).length > 0) {
              const current = useBuilderStore.getState().blocks
              const reconciled = current.map((b) =>
                result.tmpToReal[b.id] ? { ...b, id: result.tmpToReal[b.id] } : b
              )
              useBuilderStore.getState().setBlocks(reconciled)
              lastSerializedRef.current = JSON.stringify(reconciled)
            }
            useBuilderStore.getState().setSaveStatus({ status: "saved", at: Date.now() })
            setTimeout(() => {
              const s = useBuilderStore.getState().saveStatus
              if (s.status === "saved") useBuilderStore.getState().setSaveStatus({ status: "idle" })
            }, 2000)
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error al guardar"
          useBuilderStore.getState().setSaveStatus({ status: "error", message })
          toast.error(`Error al guardar: ${message}`)
        }
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [product.id]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <PageBuilder
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
  )
}

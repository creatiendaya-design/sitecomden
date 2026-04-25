"use client"

import { useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { PageBuilder } from "@/components/admin/page-builder/PageBuilder"
import { useBuilderStore } from "@/components/admin/page-builder/store"
import { savePageBlocks } from "@/actions/pages"
import { PagePicker } from "./PagePicker"
import type { BlockInstance } from "@/lib/blocks/types"

interface PageBuilderShellProps {
  page: {
    id: string
    slug: string
    title: string
  }
  initialBlocks: BlockInstance[]
}

const AUTOSAVE_DEBOUNCE_MS = 600

export function PageBuilderShell({
  page,
  initialBlocks,
}: PageBuilderShellProps) {
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
          await savePageBlocks(
            page.id,
            next.map((b) => ({
              id: b.id,
              type: b.type as Parameters<
                typeof savePageBlocks
              >[1][number]["type"],
              position: b.position,
              content: b.content as unknown,
            })),
          )
          useBuilderStore
            .getState()
            .setSaveStatus({ status: "saved", at: Date.now() })
          setTimeout(() => {
            const s = useBuilderStore.getState().saveStatus
            if (s.status === "saved") {
              useBuilderStore.getState().setSaveStatus({ status: "idle" })
            }
          }, 2000)
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Error al guardar"
          useBuilderStore
            .getState()
            .setSaveStatus({ status: "error", message })
          toast.error(`Error al guardar: ${message}`)
        }
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [page.id],
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
      scope="page"
      context={{ type: "page", page }}
      title={page.title}
      backHref="/admin/paginas"
      headerExtra={<PagePicker currentPageId={page.id} />}
    />
  )
}

"use client"

import { useCallback, useEffect, useMemo } from "react"
import { PageBuilder } from "@/components/admin/page-builder/PageBuilder"
import { useBuilderStore } from "@/components/admin/page-builder/store"
import type { BlockInstance } from "@/lib/blocks/types"

interface Props {
  template: {
    id: string
    name: string
  }
  initialBlocks: BlockInstance[]
}

/**
 * Shell that hosts the PageBuilder for editing a LandingTemplate.
 *
 * Differences vs. ProductLandingBuilder:
 *  - scope="page": registry hides product-only blocks (RELATED_PRODUCTS).
 *  - explicit-save model: changes accumulate in the store; the topbar's
 *    "Guardar y propagar" button (Task 9) flushes them in one transaction.
 *    No per-edit autosave.
 */
export function TemplateBuilderShell({ template, initialBlocks }: Props) {
  // No-op: in template mode, edits stay in the store. Task 9 wires saving
  // explicitly via the topbar "Guardar y propagar" button.
  const handleBlocksChange = useCallback((_next: BlockInstance[]) => {
    // Intentional no-op for explicit-save mode.
  }, [])

  // Hydrate template editor state on mount (editor mode + original snapshot).
  useEffect(() => {
    useBuilderStore.getState().setEditorMode("template")
    useBuilderStore.getState().setOriginalSnapshot(initialBlocks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const actions = useMemo(
    () => ({
      onSaveTemplate: () => {
        // Task 9 wires this.
      },
      onDiscardDraft: () => {
        // Task 10 wires this.
      },
    }),
    [],
  )

  return (
    <PageBuilder
      blocks={initialBlocks}
      onBlocksChange={handleBlocksChange}
      scope="page"
      context={{ type: "template", template }}
      actions={actions}
      title={template.name}
      backHref="/admin/landing-plantillas"
    />
  )
}

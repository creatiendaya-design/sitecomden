"use client"

import { useCallback } from "react"
import { PageBuilder } from "@/components/admin/page-builder/PageBuilder"
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
 *
 * The store-level wiring (originalSnapshot, pendingChangeCount, the topbar's
 * conditional save UI) is added in Task 7. For now this shell mounts the
 * builder with `onBlocksChange` as a no-op so edits stay in the store but
 * don't trigger any persistence.
 */
export function TemplateBuilderShell({ template, initialBlocks }: Props) {
  // No-op: in template mode, edits stay in the store. Task 9 wires saving
  // explicitly via the topbar "Guardar y propagar" button.
  const handleBlocksChange = useCallback((_next: BlockInstance[]) => {
    // Intentional no-op for explicit-save mode.
  }, [])

  return (
    <PageBuilder
      blocks={initialBlocks}
      onBlocksChange={handleBlocksChange}
      scope="page"
      context={{ type: "template", template }}
      title={template.name}
      backHref="/admin/landing-plantillas"
    />
  )
}

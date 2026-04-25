"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PageBuilder } from "@/components/admin/page-builder/PageBuilder"
import { useBuilderStore } from "@/components/admin/page-builder/store"
import { DraftProtection } from "@/components/admin/page-builder/DraftProtection"
import { saveTemplateBlocks } from "@/actions/landing-templates"
import { SaveAndPropagateDialog } from "./SaveAndPropagateDialog"
import type { BlockInstance } from "@/lib/blocks/types"

interface Props {
  template: {
    id: string
    name: string
  }
  initialBlocks: BlockInstance[]
  userId: string
  persistedAt: number
}

/**
 * Shell that hosts the PageBuilder for editing a LandingTemplate.
 *
 * Differences vs. ProductLandingBuilder:
 *  - scope="page": registry hides product-only blocks (RELATED_PRODUCTS).
 *  - explicit-save model: changes accumulate in the store; the topbar's
 *    "Guardar y propagar" button flushes them in one transaction.
 *    No per-edit autosave.
 *  - DraftProtection handles localStorage backups, recover modal,
 *    beforeunload warning and the discard-changes confirm.
 */
export function TemplateBuilderShell({
  template,
  initialBlocks,
  userId,
  persistedAt,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  // Snapshot of current blocks captured when opening the save dialog so its
  // diff summary is stable even if the admin keeps editing.
  const [saveSnapshot, setSaveSnapshot] = useState<BlockInstance[]>([])

  // No-op: in template mode, edits stay in the store. Saving is triggered
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

  const openSaveDialog = useCallback(() => {
    if (isPending) return
    setSaveSnapshot(useBuilderStore.getState().blocks)
    setShowSaveDialog(true)
  }, [isPending])

  const confirmSave = useCallback(() => {
    if (isPending) return
    const blocks = saveSnapshot
    startTransition(async () => {
      try {
        await saveTemplateBlocks(
          template.id,
          blocks.map((b) => ({
            id: b.id,
            type: b.type,
            position: b.position,
            content: b.content,
          })),
        )
        // Clear the localStorage backup — persisted state is now current.
        try {
          localStorage.removeItem(`template-draft-${template.id}-${userId}`)
        } catch {
          // ignore
        }
        toast.success("Plantilla guardada. Cambios propagados.")
        setShowSaveDialog(false)
        router.refresh()
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al guardar"
        toast.error(msg)
      }
    })
  }, [isPending, router, saveSnapshot, template.id, userId])

  const actions = useMemo(
    () => ({
      onSaveTemplate: openSaveDialog,
      onDiscardDraft: () => setShowDiscardConfirm(true),
    }),
    [openSaveDialog],
  )

  return (
    <>
      <PageBuilder
        blocks={initialBlocks}
        onBlocksChange={handleBlocksChange}
        scope="page"
        context={{ type: "template", template }}
        actions={actions}
        title={template.name}
        backHref="/admin/landing-plantillas"
      />
      <DraftProtection
        templateId={template.id}
        userId={userId}
        persistedAt={persistedAt}
        showDiscardConfirm={showDiscardConfirm}
        onCloseDiscardConfirm={() => setShowDiscardConfirm(false)}
      />
      <SaveAndPropagateDialog
        templateId={template.id}
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        original={initialBlocks}
        current={saveSnapshot}
        onConfirm={confirmSave}
        pending={isPending}
      />
    </>
  )
}

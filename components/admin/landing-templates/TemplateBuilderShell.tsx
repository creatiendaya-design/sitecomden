"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PageBuilder } from "@/components/admin/page-builder/PageBuilder"
import { useBuilderStore } from "@/components/admin/page-builder/store"
import { DraftProtection } from "@/components/admin/page-builder/DraftProtection"
import { saveTemplateBlocksVersioned } from "@/actions/landing-templates"
import { useVersionAwareSave } from "@/components/admin/concurrency/use-version-aware-save"
import { ConflictDialog } from "@/components/admin/concurrency/ConflictDialog"
import { ColorSchemesProvider } from "@/components/admin/customizer/color-schemes-context"
import { SaveAndPropagateDialog } from "./SaveAndPropagateDialog"
import { TemplatePicker } from "./TemplatePicker"
import type { BlockInstance } from "@/lib/blocks/types"
import type { ColorSchemeArray } from "@/lib/themes/color-schemes"

interface Props {
  template: {
    id: string
    name: string
    /** Plan 18 — optimistic-locking version of the LandingTemplate row. */
    version: number
  }
  initialBlocks: BlockInstance[]
  userId: string
  persistedAt: number
  /**
   * Active theme's color schemes. Powers the Estilo tab's "Esquema del
   * tema" picker. Templates aren't bound to a theme, so we read the active
   * theme's schemes — they resolve correctly at storefront render time
   * because product landings paint under that same active theme. Empty
   * (or single-entry) → the picker hides itself.
   */
  colorSchemes: ColorSchemeArray
  /**
   * Active theme's wrapper class (`theme-<id>`) and stylesheet, so the canvas
   * previews the chosen color scheme live — same CSS the storefront serves.
   * Empty when there's no active theme (canvas renders without theme colors,
   * as before).
   */
  themeClassName: string
  themeCss: string
}

interface TemplateBlockPayload {
  id: string
  type: BlockInstance["type"]
  position: number
  content: BlockInstance["content"]
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
  colorSchemes,
  themeClassName,
  themeCss,
}: Props) {
  const router = useRouter()
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  // Snapshot of current blocks captured when opening the save dialog so its
  // diff summary is stable even if the admin keeps editing.
  const [saveSnapshot, setSaveSnapshot] = useState<BlockInstance[]>([])

  // Drop the localStorage draft backup — the persisted state is now current.
  const clearDraftBackup = useCallback(() => {
    try {
      localStorage.removeItem(`template-draft-${template.id}-${userId}`)
    } catch {
      // ignore
    }
  }, [template.id, userId])

  // Plan 18 — optimistic locking. Saving the template guards on the parent
  // row's `version`; a concurrent admin save surfaces a ConflictDialog
  // (reload vs. force) instead of silently clobbering their work.
  const saveBlocks = useVersionAwareSave<TemplateBlockPayload[], { id: string; version: number }>({
    action: (expectedVersion, payload) =>
      saveTemplateBlocksVersioned(template.id, expectedVersion, payload),
    initialVersion: template.version,
    onSuccess: () => {
      clearDraftBackup()
      toast.success("Plantilla guardada. Cambios propagados.")
      setShowSaveDialog(false)
      router.refresh()
    },
    onReload: () => {
      // Discard local changes: refreshing re-renders the server component,
      // PageBuilder re-syncs its store from the fresh blocks prop.
      clearDraftBackup()
      setShowSaveDialog(false)
      router.refresh()
    },
    onError: (message) => {
      toast.error(message)
    },
  })
  const { saving } = saveBlocks.state

  // No-op: in template mode, edits stay in the store. Saving is triggered
  // explicitly via the topbar "Guardar y propagar" button.
  const handleBlocksChange = useCallback((_next: BlockInstance[]) => {
    // Intentional no-op for explicit-save mode.
  }, [])

  // Hydrate template editor state on mount, and re-sync the baseline whenever
  // the server sends a fresh snapshot. After "Guardar y propagar" we call
  // router.refresh(), which re-renders the server component with a NEW
  // initialBlocks reference (real ids for just-created blocks). PageBuilder
  // already re-syncs `blocks` from that new reference; we must also reset
  // `originalSnapshot` here or it stays frozen at the page-load state and the
  // "N cambios pendientes" badge never returns to 0 after saving.
  useEffect(() => {
    useBuilderStore.getState().setEditorMode("template")
    useBuilderStore.getState().setOriginalSnapshot(initialBlocks)
  }, [initialBlocks])

  const openSaveDialog = useCallback(() => {
    if (saving) return
    setSaveSnapshot(useBuilderStore.getState().blocks)
    setShowSaveDialog(true)
  }, [saving])

  const confirmSave = useCallback(() => {
    if (saving) return
    const payload: TemplateBlockPayload[] = saveSnapshot.map((b) => ({
      id: b.id,
      type: b.type,
      position: b.position,
      content: b.content,
    }))
    void saveBlocks.save(payload)
  }, [saving, saveBlocks, saveSnapshot])

  const actions = useMemo(
    () => ({
      onSaveTemplate: openSaveDialog,
      onDiscardDraft: () => setShowDiscardConfirm(true),
    }),
    [openSaveDialog],
  )

  const builder = (
    <PageBuilder
      blocks={initialBlocks}
      onBlocksChange={handleBlocksChange}
      scope="page"
      context={{ type: "template", template }}
      actions={actions}
      title={template.name}
      backHref="/admin/landing-plantillas/biblioteca"
      headerExtra={<TemplatePicker currentTemplateId={template.id} />}
    />
  )

  return (
    <>
      {/* ColorSchemesProvider feeds the active theme's schemes to the
          page-builder StyleTab so its "Esquema del tema" picker can populate
          (it hides itself when the context is empty / has <2 schemes). */}
      <ColorSchemesProvider schemes={colorSchemes}>
        {/* Storefront theme CSS, scoped to `.theme-<id>`, so the canvas
            resolves `var(--theme-*)` and `[data-color-scheme]` overrides
            live — recoloring blocks exactly like the product page will.
            The `.theme-<id>` wrapper uses `display: contents` so it adds no
            layout box; it only carries the CSS custom properties down the
            tree. Falls back to the bare builder when there's no active
            theme (nothing to preview). */}
        {themeCss ? (
          <>
            <style dangerouslySetInnerHTML={{ __html: themeCss }} />
            <div className={cn(themeClassName, "contents")}>{builder}</div>
          </>
        ) : (
          builder
        )}
      </ColorSchemesProvider>
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
        pending={saving}
      />
      <ConflictDialog
        open={saveBlocks.state.hasConflict}
        onOpenChange={(next) => {
          if (!next) saveBlocks.dismissConflict()
        }}
        onReload={saveBlocks.acceptServerCopy}
        onForce={() => {
          void saveBlocks.forceOverwrite()
        }}
        resourceLabel="esta plantilla"
      />
    </>
  )
}

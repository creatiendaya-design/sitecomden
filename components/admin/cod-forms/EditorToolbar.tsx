"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Settings, Loader2, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCodFormEditor } from "./store"
import { updateTemplate } from "@/actions/cod-form-templates"
import { templateUpdateSchema } from "@/lib/cod-forms/schema"
import PostSubmitActionPopover from "./PostSubmitActionPopover"

const SAVE_DEBOUNCE_MS = 600

type PageOpt = { id: string; slug: string; title: string }

export default function EditorToolbar({ pages }: { pages: PageOpt[] }) {
  // Subscribe to individual fields so toolbar re-renders only when they
  // change. Subscribing to the whole state via useCodFormEditor() (no
  // selector) triggered an infinite loop: the auto-save effect calls
  // setSaveStatus("saving") -> state ref changes -> effect re-runs ->
  // setSaveStatus("saving") -> ... To break the cycle, the snapshot below
  // does NOT include saveStatus, and we only depend on snapshotJson + id.
  const id = useCodFormEditor((s) => s.id)
  const name = useCodFormEditor((s) => s.name)
  const buttonText = useCodFormEditor((s) => s.buttonText)
  const buttonStyle = useCodFormEditor((s) => s.buttonStyle)
  const postSubmitAction = useCodFormEditor((s) => s.postSubmitAction)
  const thankYouTitle = useCodFormEditor((s) => s.thankYouTitle)
  const thankYouMessage = useCodFormEditor((s) => s.thankYouMessage)
  const whatsappNumber = useCodFormEditor((s) => s.whatsappNumber)
  const whatsappMessage = useCodFormEditor((s) => s.whatsappMessage)
  const thankYouPageId = useCodFormEditor((s) => s.thankYouPageId)
  const blocks = useCodFormEditor((s) => s.blocks)
  const shippingRateIds = useCodFormEditor((s) => s.shippingRateIds)
  const saveStatus = useCodFormEditor((s) => s.saveStatus)
  const setSaveStatus = useCodFormEditor((s) => s.setSaveStatus)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>("")

  const snapshotJson = JSON.stringify({
    name,
    buttonText,
    buttonStyle,
    postSubmitAction,
    thankYouTitle,
    thankYouMessage,
    whatsappNumber,
    whatsappMessage,
    thankYouPageId,
    blocks,
    shippingRateIds,
  })

  useEffect(() => {
    // Skip until the store has been hydrated. The toolbar mounts with the
    // store's empty initial state (id=""); without this guard, the effect
    // would set lastSavedRef to that empty snapshot, then fire a spurious
    // "save" the moment hydrate replaces the state with real data — which
    // in StrictMode dev mode gets cancelled by the unmount cleanup,
    // leaving saveStatus stuck on "saving" forever.
    if (!id) return

    if (!lastSavedRef.current) {
      lastSavedRef.current = snapshotJson
      return
    }
    if (snapshotJson === lastSavedRef.current) return

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSaveStatus("saving")
    const localSnapshot = snapshotJson
    timeoutRef.current = setTimeout(async () => {
      timeoutRef.current = null
      const parsed = templateUpdateSchema.safeParse({
        name,
        buttonText,
        buttonStyle,
        postSubmitAction,
        thankYouTitle,
        thankYouMessage,
        whatsappNumber,
        whatsappMessage,
        thankYouPageId,
        blocks: blocks.map((b, idx) => ({
          ...b,
          position: idx,
        })),
        shippingRateIds,
      })
      if (!parsed.success) {
        console.error("[cod-forms] auto-save validation failed:", parsed.error.issues)
        setSaveStatus("error")
        return
      }
      try {
        await updateTemplate(id, parsed.data)
        lastSavedRef.current = localSnapshot
        setSaveStatus("saved")
      } catch (e) {
        console.error("[cod-forms] auto-save error:", e)
        setSaveStatus("error")
      }
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotJson, id])

  // Auto-fade "Guardado" back to "idle" after 2 seconds so consecutive saves
  // don't look like an endless saving loop.
  useEffect(() => {
    if (saveStatus !== "saved") return
    const t = setTimeout(() => setSaveStatus("idle"), 2000)
    return () => clearTimeout(t)
  }, [saveStatus, setSaveStatus])

  return (
    <header className="flex items-center gap-1.5 sm:gap-3 border-b px-2 sm:px-4 py-2">
      <Link href="/admin/formularios-cod" className="shrink-0">
        <Button variant="ghost" size="sm" className="px-2 sm:px-3" aria-label="Volver">
          <ArrowLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Volver</span>
        </Button>
      </Link>
      <Input
        value={name}
        onChange={(e) => useCodFormEditor.getState().setName(e.target.value)}
        className="min-w-0 flex-1 sm:flex-none sm:max-w-xs font-medium h-9"
        aria-label="Nombre de la plantilla"
      />
      <PostSubmitActionPopover pages={pages}>
        <Button
          variant="ghost"
          size="sm"
          className="px-2 sm:px-3 shrink-0"
          aria-label="Acción al confirmar"
        >
          <Settings className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Acción al confirmar</span>
        </Button>
      </PostSubmitActionPopover>
      <div className="ml-auto flex items-center text-xs text-muted-foreground gap-1 shrink-0">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="hidden sm:inline">Guardando...</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <Check className="h-3.5 w-3.5 text-green-600" />
            <span className="hidden sm:inline">Guardado</span>
          </>
        )}
        {saveStatus === "error" && (
          <span className="text-red-600 text-[11px] sm:text-xs">Error</span>
        )}
      </div>
    </header>
  )
}

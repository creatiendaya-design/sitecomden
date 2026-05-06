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
  const state = useCodFormEditor()
  const setSaveStatus = useCodFormEditor((s) => s.setSaveStatus)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>("")

  // Snapshot of fields that should trigger auto-save.
  const snapshotJson = JSON.stringify({
    name: state.name,
    buttonText: state.buttonText,
    buttonStyle: state.buttonStyle,
    postSubmitAction: state.postSubmitAction,
    thankYouTitle: state.thankYouTitle,
    thankYouMessage: state.thankYouMessage,
    whatsappNumber: state.whatsappNumber,
    whatsappMessage: state.whatsappMessage,
    thankYouPageId: state.thankYouPageId,
    blocks: state.blocks,
  })

  useEffect(() => {
    // Skip the initial hydration "save".
    if (!lastSavedRef.current) {
      lastSavedRef.current = snapshotJson
      return
    }
    if (snapshotJson === lastSavedRef.current) return
    if (!state.id) return

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSaveStatus("saving")
    timeoutRef.current = setTimeout(async () => {
      const parsed = templateUpdateSchema.safeParse({
        name: state.name,
        buttonText: state.buttonText,
        buttonStyle: state.buttonStyle,
        postSubmitAction: state.postSubmitAction,
        thankYouTitle: state.thankYouTitle,
        thankYouMessage: state.thankYouMessage,
        whatsappNumber: state.whatsappNumber,
        whatsappMessage: state.whatsappMessage,
        thankYouPageId: state.thankYouPageId,
        blocks: state.blocks.map((b, idx) => ({
          ...b,
          position: idx,
        })),
      })
      if (!parsed.success) {
        setSaveStatus("error")
        return
      }
      try {
        await updateTemplate(state.id, parsed.data)
        lastSavedRef.current = snapshotJson
        setSaveStatus("saved")
      } catch {
        setSaveStatus("error")
      }
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [snapshotJson, state, setSaveStatus])

  return (
    <header className="flex items-center gap-3 border-b px-4 py-2">
      <Link href="/admin/formularios-cod">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
      </Link>
      <Input
        value={state.name}
        onChange={(e) => useCodFormEditor.getState().setName(e.target.value)}
        className="max-w-xs font-medium"
      />
      <PostSubmitActionPopover pages={pages}>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          Acción al confirmar
        </Button>
      </PostSubmitActionPopover>
      <div className="ml-auto flex items-center text-xs text-muted-foreground gap-1">
        {state.saveStatus === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Guardando...
          </>
        )}
        {state.saveStatus === "saved" && (
          <>
            <Check className="h-3 w-3 text-green-600" />
            Guardado
          </>
        )}
        {state.saveStatus === "error" && (
          <span className="text-red-600">Error al guardar</span>
        )}
      </div>
    </header>
  )
}

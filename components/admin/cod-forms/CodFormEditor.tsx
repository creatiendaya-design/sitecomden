"use client"

import { useEffect } from "react"
import EditorToolbar from "./EditorToolbar"
import ButtonStyleEditor from "./ButtonStyleEditor"
import BlocksList from "./BlocksList"
import PreviewPanel from "./PreviewPanel"
import { useCodFormEditor } from "./store"
import type { CodFormTemplateData } from "@/lib/cod-forms/types"

type PageOpt = { id: string; slug: string; title: string }

export default function CodFormEditor({
  template,
  pages,
}: {
  template: CodFormTemplateData
  pages: PageOpt[]
}) {
  const hydrate = useCodFormEditor((s) => s.hydrate)

  useEffect(() => {
    hydrate(template)
  }, [template, hydrate])

  return (
    <div className="flex h-screen flex-col bg-background">
      <EditorToolbar pages={pages} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/2 overflow-y-auto border-r p-4 space-y-4">
          <ButtonStyleEditor />
          <BlocksList />
        </aside>
        <main className="w-1/2 overflow-y-auto p-4 bg-muted/20">
          <PreviewPanel />
        </main>
      </div>
    </div>
  )
}

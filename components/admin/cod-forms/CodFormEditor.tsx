"use client"

import { useEffect, useRef } from "react"
import EditorToolbar from "./EditorToolbar"
import ButtonStyleEditor from "./ButtonStyleEditor"
import BlocksList from "./BlocksList"
import PreviewPanel from "./PreviewPanel"
import AssignedProductsTab from "./AssignedProductsTab"
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
  const hydratedFor = useRef<string | null>(null)

  useEffect(() => {
    // Hydrate only the FIRST time we receive a given template id. Server
    // actions that call revalidatePath cause Next.js to re-run this server
    // component and pass a fresh `template` prop reference (with the same
    // data); without this guard, hydrate would replace the local store
    // state on every save, the auto-save effect would treat the rehydrated
    // snapshot as a "change" (Postgres jsonb does not preserve key order),
    // and we get an infinite save loop.
    if (hydratedFor.current === template.id) return
    hydratedFor.current = template.id
    hydrate(template)
  }, [template, hydrate])

  return (
    <div className="flex h-screen flex-col bg-background">
      <EditorToolbar pages={pages} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/2 overflow-y-auto border-r p-4 space-y-4">
          <ButtonStyleEditor />
          <BlocksList />
          <AssignedProductsTab templateId={template.id} />
        </aside>
        <main className="w-1/2 overflow-y-auto p-4 bg-muted/20">
          <PreviewPanel />
        </main>
      </div>
    </div>
  )
}

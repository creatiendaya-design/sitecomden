"use client"

import { useEffect, useRef, useState } from "react"
import { Pencil, Eye } from "lucide-react"
import EditorToolbar from "./EditorToolbar"
import ButtonStyleEditor from "./ButtonStyleEditor"
import BlocksList from "./BlocksList"
import PreviewPanel from "./PreviewPanel"
import AssignedProductsTab from "./AssignedProductsTab"
import ShippingRatesPanel, {
  type AvailableShippingRate,
} from "./ShippingRatesPanel"
import { useCodFormEditor } from "./store"
import type { CodFormTemplateData } from "@/lib/cod-forms/types"
import type { ShippingOption } from "@/components/shop/cod-form/blocks/ShippingOptionsBlock"

type PageOpt = { id: string; slug: string; title: string }
type MobileTab = "edit" | "preview"

export default function CodFormEditor({
  template,
  pages,
  shippingOptions,
  availableShippingRates,
}: {
  template: CodFormTemplateData
  pages: PageOpt[]
  shippingOptions: ShippingOption[]
  availableShippingRates: AvailableShippingRate[]
}) {
  const hydrate = useCodFormEditor((s) => s.hydrate)
  const hydratedFor = useRef<string | null>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit")

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
    <div className="flex h-[100dvh] flex-col bg-background">
      <EditorToolbar pages={pages} />

      {/* Mobile-only tab switcher — both panels stay mounted to preserve state */}
      <div
        role="tablist"
        aria-label="Editor / Vista previa"
        className="md:hidden flex border-b bg-card sticky top-0 z-10"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "edit"}
          onClick={() => setMobileTab("edit")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === "edit"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground border-b-2 border-transparent"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editor
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "preview"}
          onClick={() => setMobileTab("preview")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
            mobileTab === "preview"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground border-b-2 border-transparent"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          Vista previa
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`w-full md:w-1/2 overflow-y-auto md:border-r p-3 md:p-4 space-y-3 md:space-y-4 ${
            mobileTab === "edit" ? "" : "hidden md:block"
          }`}
        >
          <ButtonStyleEditor />
          <BlocksList />
          <ShippingRatesPanel rates={availableShippingRates} />
          <AssignedProductsTab templateId={template.id} />
        </aside>
        <main
          className={`w-full md:w-1/2 overflow-y-auto bg-white text-slate-900 ${
            mobileTab === "preview" ? "" : "hidden md:block"
          }`}
        >
          <PreviewPanel shippingOptions={shippingOptions} />
        </main>
      </div>
    </div>
  )
}

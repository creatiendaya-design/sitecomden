"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { LinkPicker } from "./LinkPicker"

export interface DraftItem {
  id: string
  parentId: string | null
  position: number
  label: string
  linkType: string
  targetId: string | null
  externalUrl: string | null
  openInNewTab: boolean
}

interface PageOption {
  id: string
  title: string
  slug: string
}
interface CategoryOption {
  id: string
  name: string
  slug: string
}

interface Props {
  item: DraftItem
  pages: PageOption[]
  categories: CategoryOption[]
  onSave: (next: DraftItem) => void
  onClose: () => void
}

/**
 * Edit Sheet for a single menu item. Now matches Shopify's UX:
 * the link type and destination are merged into a single LinkPicker.
 * Hierarchy ("Hacer hijo de") is intentionally omitted; it will be
 * handled via cross-parent drag-and-drop in a future iteration.
 */
export function MenuItemSheet({
  item,
  pages,
  categories,
  onSave,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<DraftItem>(item)

  const update = <K extends keyof DraftItem>(key: K, value: DraftItem[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleLinkChange = (next: {
    linkType: string
    targetId: string | null
    externalUrl: string | null
  }) => {
    setDraft((prev) => ({
      ...prev,
      linkType: next.linkType,
      targetId: next.targetId,
      externalUrl: next.externalUrl,
    }))
  }

  const handleSave = () => {
    if (!draft.label.trim()) return
    onSave({ ...draft, label: draft.label.trim() })
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Editar item</SheetTitle>
          <SheetDescription>
            Cambiá la etiqueta y el destino del item del menú.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-label">
              Etiqueta <span className="text-destructive">*</span>
            </Label>
            <Input
              id="item-label"
              value={draft.label}
              onChange={(e) => update("label", e.target.value)}
              maxLength={120}
            />
          </div>

          <LinkPicker
            linkType={draft.linkType}
            targetId={draft.targetId}
            externalUrl={draft.externalUrl}
            pages={pages}
            categories={categories}
            onChange={handleLinkChange}
          />

          <div className="flex items-center gap-3 rounded-md border p-3">
            <Switch
              id="item-newtab"
              checked={draft.openInNewTab}
              onCheckedChange={(v) => update("openInNewTab", v)}
            />
            <Label htmlFor="item-newtab" className="text-sm">
              Abrir en nueva pestaña
            </Label>
          </div>
        </div>

        <SheetFooter className="border-t p-4 flex flex-row justify-end gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!draft.label.trim()}>
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

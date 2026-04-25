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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LinkTargetPicker } from "./LinkTargetPicker"

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
  allItems: DraftItem[]
  pages: PageOption[]
  categories: CategoryOption[]
  onSave: (next: DraftItem) => void
  onClose: () => void
}

const NONE_PARENT_VALUE = "__root__"

const LINK_TYPES: { value: string; label: string }[] = [
  { value: "HOME", label: "Inicio" },
  { value: "PRODUCTS_INDEX", label: "Todos los productos" },
  { value: "COLLECTIONS_INDEX", label: "Todas las categorías" },
  { value: "PAGE", label: "Página" },
  { value: "PRODUCT", label: "Producto" },
  { value: "CATEGORY", label: "Categoría" },
  { value: "EXTERNAL_URL", label: "URL externa" },
]

export function MenuItemSheet({
  item,
  allItems,
  pages,
  categories,
  onSave,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<DraftItem>(item)

  // Items that could be valid parents: roots that are NOT this item itself
  // and that have no parent of their own (max depth 2).
  const possibleParents = allItems.filter(
    (i) => i.parentId === null && i.id !== item.id,
  )

  // If THIS item already has children, it can't be moved to a child position.
  const itemHasChildren = allItems.some((i) => i.parentId === item.id)

  const update = <K extends keyof DraftItem>(key: K, value: DraftItem[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (!draft.label.trim()) return
    onSave({ ...draft, label: draft.label.trim() })
  }

  const handleLinkTypeChange = (next: string) => {
    // Reset target fields when changing link type.
    setDraft((prev) => ({
      ...prev,
      linkType: next,
      targetId: null,
      externalUrl: null,
    }))
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Editar item</SheetTitle>
          <SheetDescription>
            Cambiá la etiqueta, el destino y otras opciones del item del menú.
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

          <div className="space-y-2">
            <Label htmlFor="item-link-type">Tipo de enlace</Label>
            <Select value={draft.linkType} onValueChange={handleLinkTypeChange}>
              <SelectTrigger id="item-link-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <LinkTargetPicker
            linkType={draft.linkType}
            targetId={draft.targetId}
            externalUrl={draft.externalUrl}
            pages={pages}
            categories={categories}
            onTargetIdChange={(v) => update("targetId", v)}
            onExternalUrlChange={(v) => update("externalUrl", v)}
          />

          {!itemHasChildren && possibleParents.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="item-parent">Hacer hijo de</Label>
              <Select
                value={draft.parentId ?? NONE_PARENT_VALUE}
                onValueChange={(v) =>
                  update("parentId", v === NONE_PARENT_VALUE ? null : v)
                }
              >
                <SelectTrigger id="item-parent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_PARENT_VALUE}>
                    (Item de nivel raíz)
                  </SelectItem>
                  {possibleParents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

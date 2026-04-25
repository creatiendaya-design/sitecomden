"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  linkType: string
  targetId: string | null
  externalUrl: string | null
  pages: PageOption[]
  categories: CategoryOption[]
  onTargetIdChange: (v: string | null) => void
  onExternalUrlChange: (v: string | null) => void
}

export function LinkTargetPicker({
  linkType,
  targetId,
  externalUrl,
  pages,
  categories,
  onTargetIdChange,
  onExternalUrlChange,
}: Props) {
  if (
    linkType === "HOME" ||
    linkType === "PRODUCTS_INDEX" ||
    linkType === "COLLECTIONS_INDEX"
  ) {
    return (
      <p className="text-xs text-muted-foreground">
        Este tipo de enlace no requiere seleccionar un destino.
      </p>
    )
  }

  if (linkType === "EXTERNAL_URL") {
    return (
      <div className="space-y-2">
        <Label htmlFor="item-external">URL</Label>
        <Input
          id="item-external"
          value={externalUrl ?? ""}
          onChange={(e) => onExternalUrlChange(e.target.value || null)}
          placeholder="https://ejemplo.com"
        />
      </div>
    )
  }

  if (linkType === "PAGE") {
    return (
      <div className="space-y-2">
        <Label htmlFor="item-target">Página</Label>
        <Select
          value={targetId ?? ""}
          onValueChange={(v) => onTargetIdChange(v || null)}
        >
          <SelectTrigger id="item-target">
            <SelectValue placeholder="Seleccioná una página" />
          </SelectTrigger>
          <SelectContent>
            {pages.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                No hay páginas activas
              </div>
            ) : (
              pages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}{" "}
                  <span className="text-muted-foreground">/{p.slug}</span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (linkType === "CATEGORY") {
    return (
      <div className="space-y-2">
        <Label htmlFor="item-target">Categoría</Label>
        <Select
          value={targetId ?? ""}
          onValueChange={(v) => onTargetIdChange(v || null)}
        >
          <SelectTrigger id="item-target">
            <SelectValue placeholder="Seleccioná una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                No hay categorías activas
              </div>
            ) : (
              categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (linkType === "PRODUCT") {
    // For v1, product is a free-text id. The existing ProductPickerField is
    // schema-form-shaped and reusing it here is overkill. Show a hint.
    return (
      <div className="space-y-2">
        <Label htmlFor="item-target">ID del producto</Label>
        <Input
          id="item-target"
          value={targetId ?? ""}
          onChange={(e) => onTargetIdChange(e.target.value || null)}
          placeholder="Pegá el ID del producto"
        />
        <p className="text-xs text-muted-foreground">
          Encontrá el ID en la URL del producto en el admin
          (/admin/productos/[id]).
        </p>
      </div>
    )
  }

  return null
}

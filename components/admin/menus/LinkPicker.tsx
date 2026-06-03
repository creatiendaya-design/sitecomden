"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"
import {
  searchProductsForPicker,
  type RelatedProductCard,
} from "@/actions/related-products"
import { MenuProductPicker } from "./MenuProductPicker"

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

interface LinkPickerValue {
  linkType: string
  targetId: string | null
  externalUrl: string | null
}

interface Props {
  linkType: string
  targetId: string | null
  externalUrl: string | null
  pages: PageOption[]
  categories: CategoryOption[]
  onChange: (next: LinkPickerValue) => void
}

const SHORTCUTS: { value: string; label: string }[] = [
  { value: "HOME", label: "Página de inicio" },
  { value: "PRODUCTS_INDEX", label: "Todos los productos" },
  { value: "COLLECTIONS_INDEX", label: "Todas las colecciones" },
  // NOTE: "Búsqueda" omitted — el storefront aún no tiene página dedicada
  // de búsqueda. Cuando exista, agregar un linkType `SEARCH` distinto.
]

const TYPES: { value: string; label: string }[] = [
  { value: "PAGE", label: "Página específica" },
  { value: "CATEGORY", label: "Categoría específica" },
  { value: "PRODUCT", label: "Producto específico" },
  { value: "EXTERNAL_URL", label: "URL externa" },
]

/**
 * Shopify-style unified link picker. The primary Select chooses both the
 * "type" of link and (for shortcuts) the destination at once. When a typed
 * option is selected, a secondary widget appears for picking the target.
 */
export function LinkPicker({
  linkType,
  targetId,
  externalUrl,
  pages,
  categories,
  onChange,
}: Props) {
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] =
    useState<Pick<RelatedProductCard, "id" | "name" | "mainImage"> | null>(null)

  // Hydrate the selected product card when targetId is set on mount/change.
  useEffect(() => {
    if (linkType !== "PRODUCT" || !targetId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProduct(null)
      return
    }
    if (selectedProduct?.id === targetId) return
    let cancelled = false
    searchProductsForPicker("", 100)
      .then((rows) => {
        if (cancelled) return
        const found = rows.find((r) => r.id === targetId)
        if (found) {
          setSelectedProduct({
            id: found.id,
            name: found.name,
            mainImage: found.mainImage,
          })
        }
      })
      .catch(() => {
        // Non-fatal: the button will fall back to "Producto seleccionado".
      })
    return () => {
      cancelled = true
    }
  }, [linkType, targetId, selectedProduct?.id])

  const handlePrimaryChange = (uiValue: string) => {
    onChange({ linkType: uiValue, targetId: null, externalUrl: null })
    setSelectedProduct(null)
  }

  const handleTargetChange = (id: string | null) => {
    onChange({ linkType, targetId: id, externalUrl: null })
  }

  const handleExternalUrl = (url: string) => {
    onChange({ linkType, targetId: null, externalUrl: url || null })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="item-link">Enlace</Label>
        <Select value={linkType} onValueChange={handlePrimaryChange}>
          <SelectTrigger id="item-link">
            <SelectValue placeholder="Elegí un enlace" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Atajos</SelectLabel>
              {SHORTCUTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Tipos</SelectLabel>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {linkType === "PAGE" ? (
        <div className="space-y-2">
          <Label htmlFor="item-target-page">Página</Label>
          <Select
            value={targetId ?? ""}
            onValueChange={(v) => handleTargetChange(v || null)}
          >
            <SelectTrigger id="item-target-page">
              <SelectValue placeholder="Seleccioná una página" />
            </SelectTrigger>
            <SelectContent>
              {pages.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Sin páginas activas
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
      ) : null}

      {linkType === "CATEGORY" ? (
        <div className="space-y-2">
          <Label htmlFor="item-target-category">Categoría</Label>
          <Select
            value={targetId ?? ""}
            onValueChange={(v) => handleTargetChange(v || null)}
          >
            <SelectTrigger id="item-target-category">
              <SelectValue placeholder="Seleccioná una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Sin categorías activas
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
      ) : null}

      {linkType === "PRODUCT" ? (
        <div className="space-y-2">
          <Label>Producto</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start h-auto py-2"
            onClick={() => setProductPickerOpen(true)}
          >
            {selectedProduct ? (
              <span className="flex items-center gap-2 min-w-0">
                <span className="relative w-8 h-8 shrink-0 rounded overflow-hidden bg-muted">
                  {selectedProduct.mainImage ? (
                    <Image
                      src={selectedProduct.mainImage}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </span>
                <span className="text-sm truncate">{selectedProduct.name}</span>
              </span>
            ) : targetId ? (
              <span className="flex items-center gap-2 text-sm">
                <Search className="h-3.5 w-3.5" />
                Producto seleccionado (cambiar)
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm">
                <Search className="h-3.5 w-3.5" />
                Seleccionar producto
              </span>
            )}
          </Button>
          <MenuProductPicker
            currentId={targetId}
            open={productPickerOpen}
            onOpenChange={setProductPickerOpen}
            onSelect={(p) => {
              setSelectedProduct(p)
              onChange({
                linkType: "PRODUCT",
                targetId: p.id,
                externalUrl: null,
              })
            }}
          />
        </div>
      ) : null}

      {linkType === "EXTERNAL_URL" ? (
        <div className="space-y-2">
          <Label htmlFor="item-external">URL</Label>
          <Input
            id="item-external"
            value={externalUrl ?? ""}
            onChange={(e) => handleExternalUrl(e.target.value)}
            placeholder="https://ejemplo.com"
          />
        </div>
      ) : null}
    </div>
  )
}

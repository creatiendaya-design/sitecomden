"use client"

import { useEffect, useState } from "react"
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
import { Search, X } from "lucide-react"
import {
  searchProductsForPicker,
  type RelatedProductCard,
} from "@/actions/related-products"
import type { BlockContentV2 } from "@/lib/blocks/types"
import { toast } from "sonner"

interface AutoFilters {
  source: "same-category" | "same-tags" | "best-sellers" | "recently-added"
  limit: number
  excludeCurrentProduct: boolean
}

interface Data {
  title?: string
  mode: "manual" | "auto"
  manualProductIds?: string[]
  autoFilters?: AutoFilters
  displayType: "carousel" | "grid"
  columnsDesktop: 3 | 4 | 5
  columnsMobile: 1 | 2
  showPrice: boolean
  showRating: boolean
  showAddToCart: boolean
}

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

export function RelatedProductsContentForm({ content, onChange }: Props) {
  const data = content.data as unknown as Data

  const patch = (delta: Partial<Data>) =>
    onChange({
      ...content,
      data: { ...data, ...delta } as unknown as Record<string, unknown>,
    })

  const defaultAutoFilters: AutoFilters = {
    source: "same-category",
    limit: 4,
    excludeCurrentProduct: true,
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Título</Label>
        <Input
          value={data.title ?? ""}
          onChange={(e) => patch({ title: e.target.value })}
          className="mt-1 text-sm"
        />
      </div>

      <div>
        <Label className="text-xs">Modo</Label>
        <Select
          value={data.mode ?? "auto"}
          onValueChange={(v) => patch({ mode: v as Data["mode"] })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automático (filtros)</SelectItem>
            <SelectItem value="manual">Manual (elegir productos)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.mode === "auto" ? (
        <>
          <div>
            <Label className="text-xs">Fuente</Label>
            <Select
              value={data.autoFilters?.source ?? "same-category"}
              onValueChange={(v) =>
                patch({
                  autoFilters: {
                    ...(data.autoFilters ?? defaultAutoFilters),
                    source: v as AutoFilters["source"],
                  },
                })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="same-category">Misma categoría</SelectItem>
                <SelectItem value="same-tags">
                  Comparten todas las categorías
                </SelectItem>
                <SelectItem value="best-sellers">
                  Más vendidos (90 días)
                </SelectItem>
                <SelectItem value="recently-added">Más recientes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Cantidad (1-12)</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={data.autoFilters?.limit ?? 4}
              onChange={(e) =>
                patch({
                  autoFilters: {
                    ...(data.autoFilters ?? defaultAutoFilters),
                    limit: Math.min(12, Math.max(1, Number(e.target.value) || 4)),
                  },
                })
              }
              className="mt-1 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 py-2">
            <Switch
              checked={data.autoFilters?.excludeCurrentProduct ?? true}
              onCheckedChange={(v) =>
                patch({
                  autoFilters: {
                    ...(data.autoFilters ?? defaultAutoFilters),
                    excludeCurrentProduct: v,
                  },
                })
              }
            />
            <Label className="text-xs">Excluir el producto actual</Label>
          </div>
        </>
      ) : (
        <ManualProductPicker
          selectedIds={data.manualProductIds ?? []}
          onChange={(ids) => patch({ manualProductIds: ids })}
        />
      )}

      <div className="pt-2 border-t">
        <Label className="text-xs font-semibold">Display</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label className="text-[10px]">Columnas desktop</Label>
            <Select
              value={String(data.columnsDesktop ?? 4)}
              onValueChange={(v) =>
                patch({ columnsDesktop: Number(v) as 3 | 4 | 5 })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Columnas mobile</Label>
            <Select
              value={String(data.columnsMobile ?? 2)}
              onValueChange={(v) =>
                patch({ columnsMobile: Number(v) as 1 | 2 })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 py-1">
        <Switch
          checked={data.showPrice ?? true}
          onCheckedChange={(v) => patch({ showPrice: v })}
        />
        <Label className="text-xs">Mostrar precio</Label>
      </div>
    </div>
  )
}

function ManualProductPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<RelatedProductCard[]>([])
  const [selected, setSelected] = useState<RelatedProductCard[]>([])
  const [loading, setLoading] = useState(false)

  // Load selected product details on mount and when selectedIds change externally
  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelected([])
      return
    }
    searchProductsForPicker("", 100)
      .then((rows) => setSelected(rows.filter((r) => selectedIds.includes(r.id))))
      .catch(() => {})
  }, [selectedIds])

  const runSearch = async (q: string) => {
    setLoading(true)
    try {
      const rows = await searchProductsForPicker(q, 20)
      setResults(rows)
    } catch {
      toast.error("Error al buscar productos")
    } finally {
      setLoading(false)
    }
  }

  const add = (p: RelatedProductCard) => {
    if (selectedIds.includes(p.id)) return
    onChange([...selectedIds, p.id])
  }

  const remove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id))
  }

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">Buscar productos</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
            placeholder="Nombre o slug"
            className="text-sm h-8"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => runSearch(query)}
            disabled={loading}
          >
            <Search className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="max-h-40 overflow-auto border rounded-md p-1">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => add(r)}
              className="w-full text-left px-2 py-1 text-xs hover:bg-muted rounded flex items-center gap-2"
              disabled={selectedIds.includes(r.id)}
            >
              <span className="flex-1 truncate">{r.name}</span>
              <span className="text-muted-foreground">
                {selectedIds.includes(r.id) ? "Agregado" : "+"}
              </span>
            </button>
          ))}
        </div>
      )}

      <div>
        <Label className="text-[10px] text-muted-foreground">
          Seleccionados ({selected.length})
        </Label>
        <div className="space-y-1 mt-1">
          {selected.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 text-xs border rounded-md p-1.5"
            >
              <span className="flex-1 truncate">{p.name}</span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

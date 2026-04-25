"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { searchProductsForPicker, type RelatedProductCard } from "@/actions/related-products"
import { toast } from "sonner"
import type { ProductPickerFieldDef } from "../types"

interface Props {
  field: ProductPickerFieldDef
  value: unknown
  onChange: (v: string[] | string | undefined) => void
}

export function ProductPickerField({ field, value, onChange }: Props) {
  const multiple = field.multiple ?? true
  const selectedIds = multiple
    ? (Array.isArray(value) ? (value as string[]) : [])
    : (typeof value === "string" ? [value] : [])

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<RelatedProductCard[]>([])
  const [selected, setSelected] = useState<RelatedProductCard[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelected([])
      return
    }
    searchProductsForPicker("", 100)
      .then((rows) => setSelected(rows.filter((r) => selectedIds.includes(r.id))))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.join(",")])

  const runSearch = async () => {
    setLoading(true)
    try {
      const rows = await searchProductsForPicker(query, 20)
      setResults(rows)
    } catch {
      toast.error("Error al buscar productos")
    } finally {
      setLoading(false)
    }
  }

  const addOne = (p: RelatedProductCard) => {
    if (multiple) {
      if (selectedIds.includes(p.id)) return
      onChange([...selectedIds, p.id])
    } else {
      onChange(p.id)
    }
  }

  const removeOne = (id: string) => {
    if (multiple) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange(undefined)
    }
  }

  return (
    <div className="space-y-2">
      {field.label && <Label className="text-xs">{field.label}</Label>}

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder={field.placeholder ?? "Nombre o slug"}
          className="text-sm h-8"
        />
        <Button type="button" size="sm" onClick={runSearch} disabled={loading}>
          <Search className="h-3 w-3" />
        </Button>
      </div>

      {results.length > 0 && (
        <div className="max-h-40 overflow-auto border rounded-md p-1">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => addOne(r)}
              disabled={selectedIds.includes(r.id)}
              className="w-full text-left px-2 py-1 text-xs hover:bg-muted rounded flex items-center gap-2"
            >
              <span className="flex-1 truncate">{r.name}</span>
              <span className="text-muted-foreground">{selectedIds.includes(r.id) ? "Agregado" : "+"}</span>
            </button>
          ))}
        </div>
      )}

      <div>
        <Label className="text-[10px] text-muted-foreground">
          Seleccionados ({selected.length}{multiple ? "" : selected.length > 0 ? " / 1" : ""})
        </Label>
        <div className="space-y-1 mt-1">
          {selected.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs border rounded-md p-1.5">
              <span className="flex-1 truncate">{p.name}</span>
              <button type="button" onClick={() => removeOne(p.id)} className="text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

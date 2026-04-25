"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, X, Loader2 } from "lucide-react"
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
  const selectedIds: string[] = multiple
    ? (Array.isArray(value) ? (value as string[]) : [])
    : (typeof value === "string" ? [value] : [])

  // Hydrate selected product cards (image, name, price) for the chips display.
  const [selected, setSelected] = useState<RelatedProductCard[]>([])
  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelected([])
      return
    }
    let cancelled = false
    searchProductsForPicker("", 100)
      .then((rows) => {
        if (cancelled) return
        const byId = new Map(rows.map((r) => [r.id, r]))
        setSelected(selectedIds.map((id) => byId.get(id)).filter((r): r is RelatedProductCard => Boolean(r)))
      })
      .catch((err) => {
        if (cancelled) return
        console.error("ProductPickerField hydrate error:", err)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.join(",")])

  return (
    <div className="space-y-2">
      {field.label && <Label className="text-xs">{field.label}</Label>}

      {selected.length > 0 && (
        <div className="space-y-1.5">
          {selected.map((p) => (
            <SelectedChip
              key={p.id}
              product={p}
              onRemove={() => {
                if (multiple) onChange(selectedIds.filter((x) => x !== p.id))
                else onChange(undefined)
              }}
            />
          ))}
        </div>
      )}

      <PickerDialog
        multiple={multiple}
        selectedIds={selectedIds}
        onApply={(nextIds) => {
          if (multiple) onChange(nextIds)
          else onChange(nextIds[0])
        }}
      />

      {field.helpText && (
        <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  )
}

function SelectedChip({ product, onRemove }: { product: RelatedProductCard; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 border rounded-md p-1.5 bg-card">
      <div className="relative w-8 h-8 shrink-0 rounded overflow-hidden bg-muted">
        {product.mainImage ? (
          <Image src={product.mainImage} alt="" fill className="object-cover" unoptimized />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{product.name}</p>
        <p className="text-[10px] text-muted-foreground">S/ {product.price.toFixed(2)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive p-1"
        aria-label={`Quitar ${product.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function PickerDialog({
  multiple,
  selectedIds,
  onApply,
}: {
  multiple: boolean
  selectedIds: string[]
  onApply: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<RelatedProductCard[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())

  // When the dialog opens, sync local pending selection with current value
  // and fetch initial results.
  useEffect(() => {
    if (!open) return
    setPending(new Set(selectedIds))
    setQuery("")
    let cancelled = false
    setLoading(true)
    searchProductsForPicker("", 30)
      .then((rows) => {
        if (cancelled) return
        setResults(rows)
      })
      .catch(() => {
        if (cancelled) return
        toast.error("Error al cargar productos")
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Debounced live search while the dialog is open.
  useEffect(() => {
    if (!open) return
    const handle = setTimeout(() => {
      let cancelled = false
      setLoading(true)
      searchProductsForPicker(query, 30)
        .then((rows) => {
          if (cancelled) return
          setResults(rows)
        })
        .catch(() => {
          if (cancelled) return
          toast.error("Error al buscar")
        })
        .finally(() => {
          if (cancelled) return
          setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [query, open])

  const togglePending = (id: string) => {
    setPending((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!multiple) next.clear()
        next.add(id)
      }
      return next
    })
  }

  const handleApply = () => {
    onApply(Array.from(pending))
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full">
          <Plus className="h-3 w-3 mr-1" />
          {selectedIds.length > 0 ? "Cambiar selección" : "Seleccionar productos"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Seleccionar productos</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o slug…"
            className="pl-8"
            autoFocus
          />
        </div>

        <div className="max-h-[400px] overflow-auto border rounded-md">
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              {query ? "No hay productos que coincidan." : "No hay productos."}
            </p>
          ) : (
            <ul className="divide-y">
              {results.map((p) => {
                const checked = pending.has(p.id)
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => togglePending(p.id)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-muted text-left"
                    >
                      <Checkbox checked={checked} className="pointer-events-none" />
                      <div className="relative w-10 h-10 shrink-0 rounded overflow-hidden bg-muted">
                        {p.mainImage ? (
                          <Image src={p.mainImage} alt="" fill className="object-cover" unoptimized />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          S/ {p.price.toFixed(2)}
                          {p.compareAtPrice ? (
                            <span className="ml-2 line-through opacity-60">
                              S/ {p.compareAtPrice.toFixed(2)}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {pending.size} {pending.size === 1 ? "seleccionado" : "seleccionados"}
            {!multiple && pending.size > 1 ? " (solo se aplicará uno)" : ""}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleApply}>
              Listo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

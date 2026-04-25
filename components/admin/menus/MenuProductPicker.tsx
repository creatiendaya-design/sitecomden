"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Loader2 } from "lucide-react"
import {
  searchProductsForPicker,
  type RelatedProductCard,
} from "@/actions/related-products"
import { toast } from "sonner"

export interface MenuProductPickerProps {
  /** Currently selected id, if any. */
  currentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (product: {
    id: string
    name: string
    mainImage: string | null
  }) => void
}

/**
 * Single-select product picker dialog tailored for the menu editor.
 * Mirrors the dialog pattern from `ProductPickerField` but skips the
 * multi-select chip display and applies the selection immediately on click.
 */
export function MenuProductPicker({
  currentId,
  open,
  onOpenChange,
  onSelect,
}: MenuProductPickerProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<RelatedProductCard[]>([])
  const [loading, setLoading] = useState(false)

  // On open, reset the query and pre-load with an empty search.
  useEffect(() => {
    if (!open) return
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

  const handlePick = (product: RelatedProductCard) => {
    onSelect({
      id: product.id,
      name: product.name,
      mainImage: product.mainImage,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Seleccionar producto</DialogTitle>
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
                const isCurrent = p.id === currentId
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(p)}
                      className={`w-full flex items-center gap-3 p-2 text-left hover:bg-muted ${
                        isCurrent ? "bg-muted/60" : ""
                      }`}
                    >
                      <div className="relative w-10 h-10 shrink-0 rounded overflow-hidden bg-muted">
                        {p.mainImage ? (
                          <Image
                            src={p.mainImage}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          S/ {p.price.toFixed(2)}
                          {p.compareAtPrice ? (
                            <span className="ml-2 line-through opacity-60">
                              S/ {p.compareAtPrice.toFixed(2)}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Actual
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

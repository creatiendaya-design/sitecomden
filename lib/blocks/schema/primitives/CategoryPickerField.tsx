"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CategoryPickerFieldDef } from "../types"

interface CategoryOption {
  id: string
  name: string
  slug: string
  productCount: number
}

interface Props {
  field: CategoryPickerFieldDef
  value: unknown
  onChange: (next: string | null) => void
}

const NONE = "__none__"

/**
 * Shopify-style "pick a collection" dropdown. Loads existing Category rows from
 * `/api/admin/categories/list-for-picker` and stores the selected id (or null).
 * Mirrors `MenuPickerField`.
 */
export function CategoryPickerField({ field, value, onChange }: Props) {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/categories/list-for-picker")
      .then((r) => r.json())
      .then((data: { categories?: CategoryOption[] }) => {
        if (cancelled) return
        setCategories(Array.isArray(data.categories) ? data.categories : [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stringValue =
    typeof value === "string" && value.length > 0 ? value : NONE
  const handleChange = (next: string) => {
    onChange(next === NONE ? null : next)
  }

  const emptyLabel = field.emptyLabel ?? "Selecciona una colección"

  return (
    <div className="space-y-1">
      {field.label && (
        <Label className="text-xs mb-1 block">{field.label}</Label>
      )}
      <Select
        value={stringValue}
        onValueChange={handleChange}
        disabled={loading}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={loading ? "Cargando…" : emptyLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{emptyLabel}</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}{" "}
              <span className="text-muted-foreground">
                ({c.productCount})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">
          {field.helpText}
        </p>
      )}
    </div>
  )
}

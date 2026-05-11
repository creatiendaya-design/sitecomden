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
import type { MenuPickerFieldDef } from "../types"

interface MenuOption {
  id: string
  title: string
  slug: string
}

interface Props {
  field: MenuPickerFieldDef
  value: unknown
  onChange: (next: string | null) => void
}

const NONE = "__none__"

export function MenuPickerField({ field, value, onChange }: Props) {
  const [menus, setMenus] = useState<MenuOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/menus/list-for-picker")
      .then((r) => r.json())
      .then((data: { menus?: MenuOption[] }) => {
        if (cancelled) return
        setMenus(Array.isArray(data.menus) ? data.menus : [])
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

  const stringValue = typeof value === "string" && value.length > 0 ? value : NONE
  const handleChange = (next: string) => {
    onChange(next === NONE ? null : next)
  }

  return (
    <div className="space-y-1">
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <Select value={stringValue} onValueChange={handleChange} disabled={loading}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue
            placeholder={loading ? "Cargando…" : (field.emptyLabel ?? "Sin asignar")}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            {field.emptyLabel ?? "Sin asignar (default)"}
          </SelectItem>
          {menus.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.title}{" "}
              <span className="text-muted-foreground">/{m.slug}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}

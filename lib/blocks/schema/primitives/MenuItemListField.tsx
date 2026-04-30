"use client"

import { useCallback } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { MenuItemListFieldDef } from "../types"

export interface MenuLink {
  label: string
  href: string
  openInNewTab: boolean
}

interface Props {
  field: MenuItemListFieldDef
  value: unknown
  onChange: (next: MenuLink[]) => void
}

export function MenuItemListField({ field, value, onChange }: Props) {
  const links: MenuLink[] = Array.isArray(value) ? (value as MenuLink[]) : []
  const maxLinks = field.maxLinks ?? 20

  const update = useCallback(
    (idx: number, patch: Partial<MenuLink>) => {
      const next = links.map((l, i) => (i === idx ? { ...l, ...patch } : l))
      onChange(next)
    },
    [links, onChange],
  )

  const add = useCallback(() => {
    if (links.length >= maxLinks) return
    onChange([...links, { label: "", href: "", openInNewTab: false }])
  }, [links, maxLinks, onChange])

  const remove = useCallback(
    (idx: number) => {
      onChange(links.filter((_, i) => i !== idx))
    },
    [links, onChange],
  )

  const move = useCallback(
    (idx: number, dir: -1 | 1) => {
      const target = idx + dir
      if (target < 0 || target >= links.length) return
      const next = [...links]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      onChange(next)
    },
    [links, onChange],
  )

  return (
    <div className="space-y-2">
      {field.label && <Label className="text-xs">{field.label}</Label>}
      {links.length === 0 && (
        <p className="text-xs text-muted-foreground">Sin enlaces todavía.</p>
      )}
      {links.map((link, idx) => (
        <div key={idx} className="rounded-md border p-2 space-y-2 bg-muted/20">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-30"
              onClick={() => move(idx, -1)}
              aria-label="Mover arriba"
              disabled={idx === 0}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <Input
              value={link.label}
              placeholder="Etiqueta"
              onChange={(e) => update(idx, { label: e.target.value })}
              className="h-8 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => remove(idx)}
              aria-label="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input
            value={link.href}
            placeholder="https://… o /ruta"
            onChange={(e) => update(idx, { href: e.target.value })}
            className="h-8 text-sm"
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id={`new-tab-${idx}`}
              checked={link.openInNewTab}
              onCheckedChange={(v) => update(idx, { openInNewTab: v === true })}
            />
            <Label htmlFor={`new-tab-${idx}`} className="text-xs">
              Abrir en nueva pestaña
            </Label>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={add}
        disabled={links.length >= maxLinks}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Agregar enlace
      </Button>
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  )
}

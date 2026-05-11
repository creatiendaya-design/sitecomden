"use client"

import { useCallback } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { MultiSelectFieldDef } from "../types"

interface Props {
  field: MultiSelectFieldDef
  value: unknown
  onChange: (next: string[]) => void
}

export function MultiSelectField({ field, value, onChange }: Props) {
  const selected: string[] = Array.isArray(value)
    ? (value as unknown[]).filter((v): v is string => typeof v === "string")
    : []

  const toggle = useCallback(
    (val: string) => {
      const next = selected.includes(val)
        ? selected.filter((v) => v !== val)
        : [...selected, val]
      onChange(next)
    },
    [selected, onChange],
  )

  return (
    <div className="space-y-2">
      {field.label && <Label className="text-xs">{field.label}</Label>}
      <div className="space-y-1.5">
        {field.options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <Checkbox
              id={`${field.key}-${opt.value}`}
              checked={selected.includes(opt.value)}
              onCheckedChange={() => toggle(opt.value)}
            />
            <Label
              htmlFor={`${field.key}-${opt.value}`}
              className="text-xs cursor-pointer"
            >
              {opt.label}
            </Label>
          </div>
        ))}
      </div>
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  )
}

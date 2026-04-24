"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { NumberFieldDef } from "../types"

interface Props {
  field: NumberFieldDef
  value: unknown
  onChange: (v: number | undefined) => void
}

export function NumberField({ field, value, onChange }: Props) {
  const num = typeof value === "number" ? value : undefined
  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <Input
        type="number"
        value={num ?? ""}
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder}
        onChange={(e) => {
          const v = e.target.value === "" ? undefined : Number(e.target.value)
          if (v === undefined || Number.isNaN(v)) {
            onChange(undefined)
            return
          }
          const clamped =
            field.min !== undefined && v < field.min ? field.min :
            field.max !== undefined && v > field.max ? field.max : v
          onChange(clamped)
        }}
        className="text-sm"
      />
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}

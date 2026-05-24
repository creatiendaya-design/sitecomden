"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { NumberFieldDef } from "../types"
import { useDebouncedCommit } from "../use-debounced-commit"

interface Props {
  field: NumberFieldDef
  value: unknown
  onChange: (v: number | undefined) => void
}

const COMMIT_DEBOUNCE_MS = 0

export function NumberField({ field, value, onChange }: Props) {
  const initial = typeof value === "number" ? String(value) : ""
  // Use a string mirror so the user can type freely (intermediate states
  // like "" or "-" don't get coerced and bounce the cursor).
  const { local, set, flush } = useDebouncedCommit<string>(
    initial,
    (raw) => {
      if (raw === "") {
        onChange(undefined)
        return
      }
      const v = Number(raw)
      if (Number.isNaN(v)) {
        onChange(undefined)
        return
      }
      const clamped =
        field.min !== undefined && v < field.min
          ? field.min
          : field.max !== undefined && v > field.max
            ? field.max
            : v
      onChange(clamped)
    },
    COMMIT_DEBOUNCE_MS,
  )

  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <Input
        type="number"
        value={local}
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder}
        onChange={(e) => set(e.target.value)}
        onBlur={flush}
        className="text-sm"
      />
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}

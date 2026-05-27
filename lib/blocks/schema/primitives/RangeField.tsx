"use client"

import { Label } from "@/components/ui/label"
import type { RangeFieldDef } from "../types"

interface Props {
  field: RangeFieldDef
  value: unknown
  onChange: (v: number) => void
}

/**
 * Shopify-style range slider. Visually consists of:
 *   <Label>                       <current value with unit>
 *   [================o==========]
 *   (optional helpText)
 *
 * The store always receives a clamped number — never `undefined` — because
 * a range with no value would render the thumb at min, which would silently
 * change the rendered output. Callers that need an "unset" state should use
 * NumberField instead.
 */
export function RangeField({ field, value, onChange }: Props) {
  const fallback = field.defaultValue ?? field.min
  const current =
    typeof value === "number" && Number.isFinite(value)
      ? clamp(value, field.min, field.max)
      : fallback

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        {field.label && (
          <Label className="text-xs">{field.label}</Label>
        )}
        <span className="text-[11px] tabular-nums text-muted-foreground font-medium">
          {current}
          {field.unit ? ` ${field.unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={current}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (Number.isFinite(next)) onChange(clamp(next, field.min, field.max))
        }}
        className="w-full h-1.5 appearance-none bg-muted rounded-full accent-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min
  if (n > max) return max
  return n
}

"use client"

import { cn } from "@/lib/utils"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue, TextSize, TextWeight } from "@/lib/blocks/types"

const SIZE_OPTIONS: TextSize[] = ["sm", "base", "lg", "xl"]
const SIZE_LABELS: Record<TextSize, string> = { sm: "S", base: "M", lg: "L", xl: "XL" }

const WEIGHT_OPTIONS: TextWeight[] = ["regular", "medium", "semibold", "bold"]
const WEIGHT_LABELS: Record<TextWeight, string> = {
  regular: "Reg", medium: "Med", semibold: "Semi", bold: "Bold",
}

interface Props {
  size: DeviceValue<TextSize> | undefined
  weight: DeviceValue<TextWeight> | undefined
  onSizeChange: (v: DeviceValue<TextSize> | undefined) => void
  onWeightChange: (v: DeviceValue<TextWeight> | undefined) => void
}

export function TypographyControl({ size, weight, onSizeChange, onWeightChange }: Props) {
  return (
    <div className="space-y-3">
      <DeviceOverrideWrapper
        label="Tamaño de texto"
        value={size}
        onChange={onSizeChange}
        render={(v, setV) => (
          <Row options={SIZE_OPTIONS} labels={SIZE_LABELS} current={v} onChange={setV} />
        )}
      />
      <DeviceOverrideWrapper
        label="Peso de texto"
        value={weight}
        onChange={onWeightChange}
        render={(v, setV) => (
          <Row options={WEIGHT_OPTIONS} labels={WEIGHT_LABELS} current={v} onChange={setV} />
        )}
      />
    </div>
  )
}

function Row<T extends string>({
  options, labels, current, onChange,
}: {
  options: T[]
  labels: Record<T, string>
  current: T | undefined
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border bg-background p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded transition-colors",
            current === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={current === opt}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  )
}

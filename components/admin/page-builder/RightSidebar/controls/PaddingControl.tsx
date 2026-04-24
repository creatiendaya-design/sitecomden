"use client"

import { cn } from "@/lib/utils"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue, PaddingSize } from "@/lib/blocks/types"

const OPTIONS: PaddingSize[] = ["none", "sm", "md", "lg", "xl"]
const LABELS: Record<PaddingSize, string> = {
  none: "—",
  sm: "S",
  md: "M",
  lg: "L",
  xl: "XL",
}

interface PaddingControlProps {
  value: DeviceValue<PaddingSize> | undefined
  onChange: (next: DeviceValue<PaddingSize> | undefined) => void
}

export function PaddingControl({ value, onChange }: PaddingControlProps) {
  return (
    <DeviceOverrideWrapper
      label="Padding vertical"
      value={value}
      onChange={onChange}
      render={(v, setV) => (
        <div className="inline-flex rounded-md border bg-background p-0.5">
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setV(opt)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded transition-colors",
                v === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={v === opt}
              title={`Padding ${opt}`}
            >
              {LABELS[opt]}
            </button>
          ))}
        </div>
      )}
    />
  )
}

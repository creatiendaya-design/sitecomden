"use client"

import { AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue, Alignment } from "@/lib/blocks/types"

const OPTIONS: { value: Alignment; Icon: typeof AlignLeft; label: string }[] = [
  { value: "left", Icon: AlignLeft, label: "Izquierda" },
  { value: "center", Icon: AlignCenter, label: "Centro" },
  { value: "right", Icon: AlignRight, label: "Derecha" },
]

interface AlignmentControlProps {
  value: DeviceValue<Alignment> | undefined
  onChange: (next: DeviceValue<Alignment> | undefined) => void
}

export function AlignmentControl({ value, onChange }: AlignmentControlProps) {
  return (
    <DeviceOverrideWrapper
      label="Alineación"
      value={value}
      onChange={onChange}
      render={(v, setV) => (
        <div className="inline-flex rounded-md border bg-background p-0.5">
          {OPTIONS.map(({ value: opt, Icon, label }) => (
            <button
              key={opt}
              type="button"
              onClick={() => setV(opt)}
              className={cn(
                "p-1.5 rounded transition-colors",
                v === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={v === opt}
              aria-label={label}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
    />
  )
}

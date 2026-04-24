"use client"

import { cn } from "@/lib/utils"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue, ContainerWidth } from "@/lib/blocks/types"

const OPTIONS: { value: ContainerWidth; label: string }[] = [
  { value: "narrow", label: "Angosto" },
  { value: "normal", label: "Normal" },
  { value: "full", label: "Full" },
]

interface ContainerWidthControlProps {
  value: DeviceValue<ContainerWidth> | undefined
  onChange: (next: DeviceValue<ContainerWidth> | undefined) => void
}

export function ContainerWidthControl({ value, onChange }: ContainerWidthControlProps) {
  return (
    <DeviceOverrideWrapper
      label="Ancho del contenedor"
      value={value}
      onChange={onChange}
      render={(v, setV) => (
        <div className="inline-flex rounded-md border bg-background p-0.5">
          {OPTIONS.map(({ value: opt, label }) => (
            <button
              key={opt}
              type="button"
              onClick={() => setV(opt)}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded transition-colors",
                v === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={v === opt}
              title={label}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    />
  )
}

"use client"

import { Input } from "@/components/ui/input"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue } from "@/lib/blocks/types"

interface ColorControlProps {
  label: string
  value: DeviceValue<string> | undefined
  onChange: (next: DeviceValue<string> | undefined) => void
}

export function ColorControl({ label, value, onChange }: ColorControlProps) {
  return (
    <DeviceOverrideWrapper
      label={label}
      value={value}
      onChange={onChange}
      render={(v, setV) => (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={v ?? "#ffffff"}
            onChange={(e) => setV(e.target.value)}
            className="h-8 w-10 rounded border cursor-pointer p-0.5"
            aria-label={`${label} color picker`}
          />
          <Input
            value={v ?? ""}
            onChange={(e) => setV(e.target.value || undefined)}
            placeholder="#000000"
            className="text-xs h-8 font-mono flex-1"
          />
        </div>
      )}
    />
  )
}

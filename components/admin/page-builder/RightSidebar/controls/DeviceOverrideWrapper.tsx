"use client"

import { Monitor, Plus, Smartphone, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"
import type { DeviceValue } from "@/lib/blocks/types"

interface DeviceOverrideWrapperProps<T> {
  label: string
  value: DeviceValue<T> | undefined
  onChange: (next: DeviceValue<T> | undefined) => void
  /**
   * Render function that produces the concrete input for a single value.
   * Receives the current T value and a setter. Receives `deviceHint` so the
   * control can emphasize the row visually when the canvas toggle is on that
   * device (see Task 7 for how the PaddingControl uses this).
   */
  render: (value: T | undefined, onValueChange: (v: T | undefined) => void, deviceHint?: "desktop" | "mobile") => ReactNode
}

/**
 * Opt-in per-device override wrapper. Behavior:
 *
 *  - If the value is a primitive (or absent): render ONE row with the
 *    `render()` prop, plus a small "+ Override 📱" button that splits the
 *    value into { desktop, mobile }.
 *
 *  - If the value is already split into { desktop, mobile }: render TWO rows
 *    (🖥️ Desktop and 📱 Mobile), each with the same `render()` prop.
 *    Includes a "✕ Quitar override" button that collapses back to a single
 *    value (picks desktop's value as the new shared value).
 */
export function DeviceOverrideWrapper<T>({
  label,
  value,
  onChange,
  render,
}: DeviceOverrideWrapperProps<T>) {
  const isSplit = isDeviceValue(value)

  if (!isSplit) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1 px-1.5"
            onClick={() => {
              // Promote the current flat value to a device-split value
              const current = value as T | undefined
              onChange({ desktop: current, mobile: current })
            }}
            aria-label="Agregar override mobile"
            title="Override por dispositivo"
          >
            <Plus className="h-3 w-3" />
            Override mobile
          </Button>
        </div>
        {render(value as T | undefined, (v) => onChange(v))}
      </div>
    )
  }

  const split = value as { desktop?: T; mobile?: T }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-1.5 text-destructive hover:text-destructive"
          onClick={() => {
            // Collapse back to a flat value — keep the desktop side
            onChange(split.desktop)
          }}
          aria-label="Quitar override"
          title="Quitar override"
        >
          <X className="h-3 w-3" />
          Quitar
        </Button>
      </div>
      <div className="space-y-2">
        <DeviceRow icon="desktop">
          {render(split.desktop, (v) => onChange({ ...split, desktop: v }), "desktop")}
        </DeviceRow>
        <DeviceRow icon="mobile">
          {render(split.mobile, (v) => onChange({ ...split, mobile: v }), "mobile")}
        </DeviceRow>
      </div>
    </div>
  )
}

function DeviceRow({ icon, children }: { icon: "desktop" | "mobile"; children: ReactNode }) {
  const Icon = icon === "desktop" ? Monitor : Smartphone
  const label = icon === "desktop" ? "Desktop" : "Mobile"
  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center gap-1 pt-2 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] font-medium w-10">{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function isDeviceValue(v: unknown): v is { desktop?: unknown; mobile?: unknown } {
  if (v === null || v === undefined) return false
  if (typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return "desktop" in o || "mobile" in o
}

"use client"

import { ColorControl } from "@/components/admin/page-builder/RightSidebar/controls/ColorControl"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { ColorFieldDef } from "../types"
import type { DeviceValue } from "@/lib/blocks/types"

interface Props {
  field: ColorFieldDef
  value: unknown
  onChange: (v: DeviceValue<string> | string | undefined) => void
}

export function ColorField({ field, value, onChange }: Props) {
  if (field.deviceOverride) {
    return (
      <ColorControl
        label={field.label ?? ""}
        value={value as DeviceValue<string> | undefined}
        onChange={onChange}
      />
    )
  }
  const str = typeof value === "string" ? value : ""
  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={str || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded border cursor-pointer p-0.5"
        />
        <Input
          value={str}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="#000000"
          className="text-xs h-8 font-mono flex-1"
        />
      </div>
    </div>
  )
}

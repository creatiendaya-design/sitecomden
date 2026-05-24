"use client"

import { ColorControl } from "@/components/admin/page-builder/RightSidebar/controls/ColorControl"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { ColorFieldDef } from "../types"
import type { DeviceValue } from "@/lib/blocks/types"
import { useDebouncedCommit } from "../use-debounced-commit"

interface Props {
  field: ColorFieldDef
  value: unknown
  onChange: (v: DeviceValue<string> | string | undefined) => void
}

const COMMIT_DEBOUNCE_MS = 0

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
  return (
    <FlatColorField
      label={field.label}
      value={typeof value === "string" ? value : ""}
      onChange={(v) => onChange(v)}
    />
  )
}

function FlatColorField({
  label,
  value,
  onChange,
}: {
  label?: string
  value: string
  onChange: (v: string | undefined) => void
}) {
  const { local, set, flush } = useDebouncedCommit<string>(
    value,
    (next) => onChange(next || undefined),
    COMMIT_DEBOUNCE_MS,
  )
  return (
    <div>
      {label && <Label className="text-xs mb-1 block">{label}</Label>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={local || "#ffffff"}
          onChange={(e) => set(e.target.value)}
          onBlur={flush}
          className="h-8 w-10 rounded border cursor-pointer p-0.5"
        />
        <Input
          value={local}
          onChange={(e) => set(e.target.value)}
          onBlur={flush}
          placeholder="#000000"
          className="text-xs h-8 font-mono flex-1"
        />
      </div>
    </div>
  )
}

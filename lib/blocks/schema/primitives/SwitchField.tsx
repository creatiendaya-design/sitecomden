"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { SwitchFieldDef } from "../types"

interface Props {
  field: SwitchFieldDef
  value: unknown
  onChange: (v: boolean) => void
}

export function SwitchField({ field, value, onChange }: Props) {
  const bool = value === true
  return (
    <div className="flex items-center gap-2">
      <Switch checked={bool} onCheckedChange={onChange} />
      <Label className="text-xs">{field.label}</Label>
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground ml-auto">{field.helpText}</p>
      )}
    </div>
  )
}

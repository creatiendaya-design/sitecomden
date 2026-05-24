"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DeviceOverrideWrapper } from "@/components/admin/page-builder/RightSidebar/controls/DeviceOverrideWrapper"
import type { SelectFieldDef } from "../types"
import type { DeviceValue } from "@/lib/blocks/types"

type SelectValueType = string | number

interface Props {
  field: SelectFieldDef
  value: unknown
  onChange: (v: SelectValueType | DeviceValue<SelectValueType> | undefined) => void
}

export function SelectField({ field, value, onChange }: Props) {
  if (field.deviceOverride) {
    return (
      <DeviceOverrideWrapper<SelectValueType>
        label={field.label ?? ""}
        value={value as DeviceValue<SelectValueType> | undefined}
        onChange={(v) => onChange(v)}
        render={(v, setV) => (
          <SelectRow
            options={field.options}
            value={v}
            onChange={setV}
          />
        )}
      />
    )
  }
  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <SelectRow
        options={field.options}
        value={value as SelectValueType | undefined}
        onChange={(v) => onChange(v)}
      />
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}

function SelectRow({
  options,
  value,
  onChange,
}: {
  options: SelectFieldDef["options"]
  value: SelectValueType | undefined
  onChange: (v: SelectValueType | undefined) => void
}) {
  const str = value === undefined || value === null ? "" : String(value)
  return (
    <Select
      value={str}
      onValueChange={(v) => {
        const opt = options.find((o) => String(o.value) === v)
        onChange(opt ? opt.value : v)
      }}
    >
      <SelectTrigger className="text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={String(o.value)} value={String(o.value)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

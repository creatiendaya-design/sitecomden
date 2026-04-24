"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { SelectFieldDef } from "../types"

interface Props {
  field: SelectFieldDef
  value: unknown
  onChange: (v: string | number) => void
}

export function SelectField({ field, value, onChange }: Props) {
  const str = value === undefined || value === null ? "" : String(value)
  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <Select
        value={str}
        onValueChange={(v) => {
          // Preserve original type (number vs string) by looking up in options
          const opt = field.options.find((o) => String(o.value) === v)
          onChange(opt ? opt.value : v)
        }}
      >
        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {field.options.map((o) => (
            <SelectItem key={String(o.value)} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}

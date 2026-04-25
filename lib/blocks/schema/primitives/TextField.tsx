"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { TextFieldDef, TextAreaFieldDef } from "../types"

interface Props {
  field: TextFieldDef | TextAreaFieldDef
  value: unknown
  onChange: (v: string | undefined) => void
}

export function TextField({ field, value, onChange }: Props) {
  const str = typeof value === "string" ? value : ""
  const common = {
    value: str,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value || undefined),
    placeholder: field.placeholder,
  }

  return (
    <div>
      {field.label && (
        <Label className="text-xs mb-1 block">{field.label}</Label>
      )}
      {field.type === "textarea" ? (
        <Textarea {...common} rows={(field as TextAreaFieldDef).rows ?? 3} className="text-sm" />
      ) : (
        <Input
          {...common}
          maxLength={(field as TextFieldDef).maxLength}
          className="text-sm"
        />
      )}
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}

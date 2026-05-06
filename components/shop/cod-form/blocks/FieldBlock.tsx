// components/shop/cod-form/blocks/FieldBlock.tsx
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CodFormBlockType, FieldContent } from "@/lib/cod-forms/types"

const TEXTAREA_TYPES: CodFormBlockType[] = [
  "FIELD_REFERENCE",
  "FIELD_NOTES",
]

const HTML_INPUT_TYPE: Partial<Record<CodFormBlockType, string>> = {
  FIELD_EMAIL: "email",
  FIELD_PHONE: "tel",
  FIELD_DNI: "text",
}

export default function FieldBlock({
  type,
  content,
  required,
  value,
  errorMessage,
  onChange,
}: {
  type: CodFormBlockType
  content: FieldContent
  required: boolean
  value: string
  errorMessage: string | null
  onChange: (v: string) => void
}) {
  const isTextarea = TEXTAREA_TYPES.includes(type)
  const inputType = HTML_INPUT_TYPE[type] ?? "text"

  return (
    <div className="space-y-1">
      {!content.hideLabel && (
        <Label className="text-xs">
          {content.label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
      )}
      {isTextarea ? (
        <Textarea
          placeholder={content.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <Input
          type={inputType}
          placeholder={content.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
    </div>
  )
}

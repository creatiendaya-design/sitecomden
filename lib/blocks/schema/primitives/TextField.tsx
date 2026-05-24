"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { TextFieldDef, TextAreaFieldDef } from "../types"
import { useDebouncedCommit } from "../use-debounced-commit"

interface Props {
  field: TextFieldDef | TextAreaFieldDef
  value: unknown
  onChange: (v: string | undefined) => void
}

// 0ms: text changes commit synchronously to the store. The live preview
// covers style props (live CSS overrides), and for text/data props the
// background autosave still persists — but the in-memory store update
// keeps the form inputs in sync immediately.
const COMMIT_DEBOUNCE_MS = 0

export function TextField({ field, value, onChange }: Props) {
  const initial = typeof value === "string" ? value : ""
  const { local, set, flush } = useDebouncedCommit<string>(
    initial,
    (v) => onChange(v || undefined),
    COMMIT_DEBOUNCE_MS,
  )

  return (
    <div>
      {field.label && (
        <Label className="text-xs mb-1 block">{field.label}</Label>
      )}
      {field.type === "textarea" ? (
        <Textarea
          value={local}
          onChange={(e) => set(e.target.value)}
          onBlur={flush}
          placeholder={field.placeholder}
          rows={(field as TextAreaFieldDef).rows ?? 3}
          className="text-sm"
        />
      ) : (
        <Input
          value={local}
          onChange={(e) => set(e.target.value)}
          onBlur={flush}
          placeholder={field.placeholder}
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

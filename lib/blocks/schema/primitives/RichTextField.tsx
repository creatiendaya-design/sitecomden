"use client"

import dynamic from "next/dynamic"
import { Label } from "@/components/ui/label"
import type { RichTextFieldDef } from "../types"

const RichTextEditor = dynamic(
  () => import("@/components/admin/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-24 animate-pulse bg-muted rounded" /> }
)

interface Props {
  field: RichTextFieldDef
  value: unknown
  onChange: (html: string) => void
}

export function RichTextField({ field, value, onChange }: Props) {
  const html = typeof value === "string" ? value : ""
  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <RichTextEditor content={html} onChange={onChange} placeholder={field.placeholder} />
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}

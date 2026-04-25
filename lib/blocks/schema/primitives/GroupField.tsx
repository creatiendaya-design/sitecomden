"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { GroupFieldDef } from "../types"
import { SchemaForm } from "@/components/admin/page-builder/forms/SchemaForm"

interface Props {
  field: GroupFieldDef
  value: unknown
  onChange: (v: Record<string, unknown>) => void
}

export function GroupField({ field, value, onChange }: Props) {
  const collapsible = field.collapsible ?? true
  const [open, setOpen] = useState(field.defaultOpen ?? true)
  const obj = (typeof value === "object" && value !== null) ? value as Record<string, unknown> : {}

  const body = (
    <div className="space-y-3">
      <SchemaForm schema={field.schema} value={obj} onChange={onChange} />
    </div>
  )

  if (!collapsible) {
    return (
      <div className="pl-3 border-l-2 border-muted">
        {field.label && <Label className="text-xs font-semibold mb-2 block">{field.label}</Label>}
        {body}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/50"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span className="text-xs font-medium">{field.label}</span>
      </button>
      {open && <div className={cn("p-3 pt-0 border-t")}>{body}</div>}
    </div>
  )
}

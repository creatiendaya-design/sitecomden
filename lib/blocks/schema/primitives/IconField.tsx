"use client"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import * as LucideIcons from "lucide-react"
import type { ComponentType } from "react"
import type { IconFieldDef } from "../types"

interface Props {
  field: IconFieldDef
  value: unknown
  onChange: (name: string) => void
}

export function IconField({ field, value, onChange }: Props) {
  const current = typeof value === "string" ? value : ""
  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      <div className="flex flex-wrap gap-1">
        {field.curated.map((name) => {
          const Icon = (LucideIcons as unknown as Record<string, ComponentType<{ className?: string }>>)[name]
          if (!Icon) return null
          const active = current === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={cn(
                "p-2 rounded border transition-colors",
                active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-transparent",
              )}
              title={name}
              aria-label={name}
            >
              <Icon className="h-4 w-4" />
            </button>
          )
        })}
      </div>
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.helpText}</p>
      )}
    </div>
  )
}

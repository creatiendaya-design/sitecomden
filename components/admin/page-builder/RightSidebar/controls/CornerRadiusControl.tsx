"use client"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import type { CornerRadius } from "@/lib/blocks/types"

const OPTIONS: { value: CornerRadius; label: string }[] = [
  { value: "none", label: "Ninguno" },
  { value: "sm", label: "Sm" },
  { value: "md", label: "Md" },
  { value: "lg", label: "Lg" },
]

interface Props {
  value: CornerRadius | undefined
  onChange: (next: CornerRadius) => void
}

export function CornerRadiusControl({ value, onChange }: Props) {
  return (
    <PillGroup label="Radio de esquinas">
      {OPTIONS.map(({ value: opt, label }) => (
        <PillButton key={opt} active={value === opt} onClick={() => onChange(opt)} label={label} />
      ))}
    </PillGroup>
  )
}

// ───── shared primitives (used by all 4 controls in Task 8) ─────

export function PillGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 block">
        {label}
      </Label>
      <div className="inline-flex rounded-md border bg-background p-0.5">{children}</div>
    </div>
  )
}

export function PillButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 text-xs font-medium rounded transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      aria-pressed={active}
      title={label}
    >
      {label}
    </button>
  )
}

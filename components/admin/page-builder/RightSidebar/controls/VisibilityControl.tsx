"use client"

import { PillGroup, PillButton } from "./CornerRadiusControl"
import type { Visibility } from "@/lib/blocks/types"

const OPTIONS: { value: Visibility; label: string }[] = [
  { value: "always", label: "Siempre" },
  { value: "mobile-only", label: "Solo mobile" },
  { value: "desktop-only", label: "Solo desktop" },
  { value: "hidden", label: "Oculto" },
]

interface Props {
  value: Visibility | undefined
  onChange: (next: Visibility) => void
}

export function VisibilityControl({ value, onChange }: Props) {
  const v = value ?? "always"
  return (
    <PillGroup label="Visibilidad">
      {OPTIONS.map(({ value: opt, label }) => (
        <PillButton key={opt} active={v === opt} onClick={() => onChange(opt)} label={label} />
      ))}
    </PillGroup>
  )
}

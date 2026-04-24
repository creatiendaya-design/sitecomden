"use client"

import { PillGroup, PillButton } from "./CornerRadiusControl"
import type { BorderStyle } from "@/lib/blocks/types"

const OPTIONS: { value: BorderStyle; label: string }[] = [
  { value: "none", label: "Ninguno" },
  { value: "subtle", label: "Sutil" },
  { value: "strong", label: "Fuerte" },
]

interface Props {
  value: BorderStyle | undefined
  onChange: (next: BorderStyle) => void
}

export function BorderControl({ value, onChange }: Props) {
  return (
    <PillGroup label="Borde">
      {OPTIONS.map(({ value: opt, label }) => (
        <PillButton key={opt} active={value === opt} onClick={() => onChange(opt)} label={label} />
      ))}
    </PillGroup>
  )
}

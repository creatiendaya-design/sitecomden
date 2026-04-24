"use client"

import { PillGroup, PillButton } from "./CornerRadiusControl"
import type { ShadowStyle } from "@/lib/blocks/types"

const OPTIONS: { value: ShadowStyle; label: string }[] = [
  { value: "none", label: "Ninguno" },
  { value: "subtle", label: "Sutil" },
  { value: "strong", label: "Fuerte" },
]

interface Props {
  value: ShadowStyle | undefined
  onChange: (next: ShadowStyle) => void
}

export function ShadowControl({ value, onChange }: Props) {
  return (
    <PillGroup label="Sombra">
      {OPTIONS.map(({ value: opt, label }) => (
        <PillButton key={opt} active={value === opt} onClick={() => onChange(opt)} label={label} />
      ))}
    </PillGroup>
  )
}

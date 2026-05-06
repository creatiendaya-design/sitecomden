// components/shop/cod-form/blocks/SubmitButtonBlock.tsx
"use client"

import * as Lucide from "lucide-react"
import type { ComponentType } from "react"
import type { ButtonStyle } from "@/lib/cod-forms/types"

const SHADOW_CLASSES = [
  "shadow-none",
  "shadow-sm",
  "shadow-sm",
  "shadow",
  "shadow",
  "shadow-md",
  "shadow-md",
  "shadow-lg",
  "shadow-lg",
  "shadow-xl",
  "shadow-2xl",
]

const ANIMATION_CLASSES: Record<ButtonStyle["animation"], string> = {
  none: "",
  pulse: "animate-pulse",
  shake: "animate-bounce", // closest tailwind built-in
  bounce: "animate-bounce",
}

type LucideIcon = ComponentType<{ className?: string }>
const LucideIcons = Lucide as unknown as Record<string, LucideIcon | undefined>

export default function SubmitButtonBlock({
  text,
  style,
  disabled,
  onClick,
}: {
  text: string
  style: ButtonStyle
  disabled?: boolean
  onClick?: () => void
}) {
  const Icon: LucideIcon | null =
    style.icon && LucideIcons[style.icon] ? LucideIcons[style.icon]! : null

  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex flex-col items-center justify-center gap-1 px-4 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${SHADOW_CLASSES[Math.min(10, Math.max(0, style.shadow ?? 0))]} ${ANIMATION_CLASSES[style.animation]}`}
      style={{
        color: style.textColor,
        backgroundColor: style.bgColor,
        borderColor: style.borderColor,
        borderWidth: `${style.borderWidth}px`,
        borderStyle: style.borderWidth > 0 ? "solid" : "none",
        borderRadius: `${style.borderRadius}px`,
        fontSize: `${style.fontSize}px`,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
      }}
    >
      <span className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {text}
      </span>
      {style.subtitle && (
        <span className="text-xs opacity-80">{style.subtitle}</span>
      )}
    </button>
  )
}

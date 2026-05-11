import type { CSSProperties } from "react"
import type { BlockStyle } from "@/lib/blocks/types"
import { applyBlockStyle } from "@/lib/blocks/apply-style"

export interface ResolvedSectionStyle {
  className: string
  style: CSSProperties
  dataColorScheme?: string
}

/**
 * Adapter: ThemeSection.content.style -> wrapper props for the renderer.
 * Reuses lib/blocks/apply-style.ts so theme sections inherit the same
 * color-scheme + padding + visibility logic as landing blocks. Emits
 * data-color-scheme on the wrapper so the dynamic theme stylesheet can
 * rebind --theme-* custom properties per section.
 */
export function applyThemeSectionStyle(
  style: BlockStyle | undefined,
): ResolvedSectionStyle {
  if (!style) return { className: "", style: {} }
  const result = applyBlockStyle(style)
  return {
    className: result.className,
    style: result.style,
    dataColorScheme: style.colorSchemeId,
  }
}

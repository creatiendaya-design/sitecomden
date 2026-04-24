import type { CSSProperties } from "react"
import type { BlockStyle, PaddingSize, Alignment, ContainerWidth, CornerRadius, BorderStyle, ShadowStyle } from "./types"

/**
 * Takes a resolved (device-flattened) BlockStyle and returns the Tailwind
 * class names + inline CSS properties that a block renderer should apply
 * to its outer wrapper element.
 *
 * Renderers compose these with their own structural classes, e.g.
 *   const { className, style } = applyBlockStyle(resolved.style)
 *   return <section className={cn("my-structural-classes", className)} style={style}>
 *
 * The goal is a SINGLE source of truth for how Level 2 style values map
 * to CSS so all 12 blocks behave identically.
 */
export function applyBlockStyle(style: BlockStyle | undefined): {
  className: string
  style: CSSProperties
} {
  if (!style) return { className: "", style: {} }

  const classes: string[] = []
  const inline: CSSProperties = {}

  if (style.paddingY) classes.push(PADDING_CLASS[style.paddingY as PaddingSize])
  if (style.alignment) classes.push(ALIGNMENT_CLASS[style.alignment as Alignment])
  if (style.containerWidth) classes.push(CONTAINER_WIDTH_CLASS[style.containerWidth as ContainerWidth])
  if (style.cornerRadius) classes.push(CORNER_RADIUS_CLASS[style.cornerRadius])
  if (style.border) classes.push(BORDER_CLASS[style.border])
  if (style.shadow) classes.push(SHADOW_CLASS[style.shadow])

  // Colors always inline (arbitrary user input, not a pre-defined palette).
  // The helper receives resolved values, so DeviceValue is already flattened to string.
  if (typeof style.backgroundColor === "string") {
    inline.backgroundColor = style.backgroundColor
  }
  if (typeof style.textColor === "string") {
    inline.color = style.textColor
  }

  return { className: classes.filter(Boolean).join(" "), style: inline }
}

const PADDING_CLASS: Record<PaddingSize, string> = {
  none: "py-0",
  sm: "py-4 @md:py-6",
  md: "py-8 @md:py-10",
  lg: "py-12 @md:py-16",
  xl: "py-16 @md:py-24",
}

export const ALIGNMENT_CLASS: Record<Alignment, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

// Container width controls the max-width of an inner content wrapper.
// The renderer uses these to decide whether to add `max-w-*` on its inner
// content container (not on the block outer).
const CONTAINER_WIDTH_CLASS: Record<ContainerWidth, string> = {
  narrow: "[--landing-container:48rem]",  // ~768px
  normal: "[--landing-container:72rem]",  // ~1152px (default)
  full: "[--landing-container:100%]",
}

const CORNER_RADIUS_CLASS: Record<CornerRadius, string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-2xl",
}

const BORDER_CLASS: Record<BorderStyle, string> = {
  none: "border-0",
  subtle: "border border-black/5 dark:border-white/10",
  strong: "border-2 border-black/10 dark:border-white/20",
}

const SHADOW_CLASS: Record<ShadowStyle, string> = {
  none: "shadow-none",
  subtle: "shadow-sm",
  strong: "shadow-xl",
}

import type { CSSProperties } from "react"
import type { BlockStyle, PaddingSize, Alignment, ContainerWidth, CornerRadius, BorderStyle, ShadowStyle, TextSize, TextWeight, GradientDirection } from "./types"

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

  // Padding: prefer top/bottom split when set, else fall back to legacy paddingY.
  if (style.paddingTop) classes.push(PADDING_TOP_CLASS[style.paddingTop as PaddingSize])
  if (style.paddingBottom) classes.push(PADDING_BOTTOM_CLASS[style.paddingBottom as PaddingSize])
  if (!style.paddingTop && !style.paddingBottom && style.paddingY) {
    classes.push(PADDING_CLASS[style.paddingY as PaddingSize])
  }
  if (style.alignment) classes.push(ALIGNMENT_CLASS[style.alignment as Alignment])
  if (style.containerWidth) classes.push(CONTAINER_WIDTH_CLASS[style.containerWidth as ContainerWidth])
  if (style.cornerRadius) classes.push(CORNER_RADIUS_CLASS[style.cornerRadius])
  if (style.border) classes.push(BORDER_CLASS[style.border])
  if (style.shadow) classes.push(SHADOW_CLASS[style.shadow])

  // Typography
  if (style.textSize) classes.push(TEXT_SIZE_CLASS[style.textSize as TextSize])
  if (style.textWeight) classes.push(TEXT_WEIGHT_CLASS[style.textWeight as TextWeight])

  // Colors always inline (arbitrary user input, not a pre-defined palette).
  // The helper receives resolved values, so DeviceValue is already flattened to string.
  if (typeof style.backgroundColor === "string") {
    inline.backgroundColor = style.backgroundColor
  }
  if (typeof style.textColor === "string") {
    inline.color = style.textColor
  }

  // Gradient: overrides flat backgroundColor (gradient wins).
  if (style.backgroundGradient) {
    const g = style.backgroundGradient
    inline.backgroundImage = `linear-gradient(${gradientDirection(g.direction)}, ${g.from}, ${g.to})`
    // gradient overrides flat backgroundColor — clear it so both don't fight
    delete inline.backgroundColor
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

const PADDING_TOP_CLASS: Record<PaddingSize, string> = {
  none: "pt-0",
  sm: "pt-4 @md:pt-6",
  md: "pt-8 @md:pt-10",
  lg: "pt-12 @md:pt-16",
  xl: "pt-16 @md:pt-24",
}

const PADDING_BOTTOM_CLASS: Record<PaddingSize, string> = {
  none: "pb-0",
  sm: "pb-4 @md:pb-6",
  md: "pb-8 @md:pb-10",
  lg: "pb-12 @md:pb-16",
  xl: "pb-16 @md:pb-24",
}

const TEXT_SIZE_CLASS: Record<TextSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
}

const TEXT_WEIGHT_CLASS: Record<TextWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
}

function gradientDirection(d: GradientDirection): string {
  switch (d) {
    case "to-right": return "to right"
    case "to-left": return "to left"
    case "to-top": return "to top"
    case "to-bottom": return "to bottom"
    case "to-bottom-right": return "to bottom right"
    case "to-bottom-left": return "to bottom left"
  }
}

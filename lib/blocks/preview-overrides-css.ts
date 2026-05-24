import type {
  Alignment,
  BackgroundGradient,
  BlockStyle,
  BorderStyle,
  ContainerWidth,
  CornerRadius,
  DeviceValue,
  GradientDirection,
  PaddingSize,
  ShadowStyle,
  TextSize,
  TextWeight,
} from "./types"
import { resolveColorValue } from "./apply-style"

export interface PreviewTarget {
  /** Stable id of the element being overridden. Becomes the `data-preview-target`
   *  attribute value on the storefront wrapper (e.g. `section:abc123`). */
  target: string
  /** Raw style zone — same shape consumed by applyBlockStyle. */
  style: BlockStyle | undefined
}

/**
 * Build a CSS string that overrides the full BlockStyle live in the
 * customizer iframe. Used by `useLivePreviewOverrides` to bypass the
 * autosave + server round-trip: the parent computes this CSS on every
 * Zustand mutation and writes it into a `<style>` tag inside the
 * (same-origin) iframe document — the storefront paints with the new
 * values before the server has even acknowledged the save.
 *
 * Covers everything applyBlockStyle emits (colors, padding, alignment,
 * borders, shadow, typography, gradient, container width) including
 * per-device DeviceValue splits.
 *
 * Specificity strategy: each rule uses `[data-preview-target="..."]` +
 * `!important`. Attribute selectors have higher specificity than the
 * single class names applyBlockStyle emits, and `!important` wins over
 * the inline styles baked into the SSR output — so the live override is
 * guaranteed to paint over whatever the server rendered moments ago.
 *
 * Selector duality: emits both `[data-preview-target="X"]` and
 * `[data-preview-target="X"] > *` because the attribute lives on the
 * wrapper for theme sections (wrapper paints the bg) and on an outer
 * wrapper for page-builder blocks (the actual block element — the first
 * child — paints the bg).
 */
export function buildPreviewOverridesCss(targets: PreviewTarget[]): string {
  const baseRules: string[] = []
  const mobileRules: string[] = []

  for (const { target, style } of targets) {
    if (!style) continue
    const decls = styleToDeclarations(style)
    if (decls.base.length === 0 && decls.mobile.length === 0) continue

    const attr = escapeAttr(target)
    const selector = `[data-preview-target="${attr}"], [data-preview-target="${attr}"] > *`

    if (decls.base.length > 0) {
      baseRules.push(`${selector} { ${decls.base.join("; ")}; }`)
    }
    if (decls.mobile.length > 0) {
      mobileRules.push(`${selector} { ${decls.mobile.join("; ")}; }`)
    }
  }

  let css = baseRules.join("\n")
  if (mobileRules.length > 0) {
    css += `\n@media (max-width: 767px) {\n${mobileRules.join("\n")}\n}`
  }
  return css
}

/**
 * Translate a BlockStyle into two buckets of CSS declarations: `base`
 * (always-applied desktop defaults) and `mobile` (overrides under
 * 768px). Each declaration is a full `prop: value !important` string.
 *
 * Mirrors applyBlockStyle's resolution rules so what the admin sees in
 * the live preview matches what the SSR will paint after the autosave
 * round-trip completes.
 */
function styleToDeclarations(
  style: BlockStyle,
): { base: string[]; mobile: string[] } {
  const base: string[] = []
  const mobile: string[] = []

  // ----- Background color (skipped when gradient is set) -----
  if (!style.backgroundGradient) {
    const bg = resolveColorValue(style.backgroundColor)
    if (bg.shared !== undefined) {
      base.push(`background-color: ${cssValue(bg.shared)} !important`)
    }
    if (bg.mobile !== undefined && bg.mobile !== bg.shared) {
      mobile.push(`background-color: ${cssValue(bg.mobile)} !important`)
    }
  }

  // ----- Text color -----
  const text = resolveColorValue(style.textColor)
  if (text.shared !== undefined) {
    base.push(`color: ${cssValue(text.shared)} !important`)
  }
  if (text.mobile !== undefined && text.mobile !== text.shared) {
    mobile.push(`color: ${cssValue(text.mobile)} !important`)
  }

  // ----- Gradient -----
  if (style.backgroundGradient) {
    base.push(
      `background-image: ${gradientCss(style.backgroundGradient)} !important`,
    )
  }

  // ----- Padding (top/bottom split takes precedence over legacy paddingY) -----
  const usesTopBottom = !!style.paddingTop || !!style.paddingBottom
  if (usesTopBottom) {
    addDevice(
      style.paddingTop,
      base,
      mobile,
      (v) => `padding-top: ${PADDING_REM[v as PaddingSize]} !important`,
    )
    addDevice(
      style.paddingBottom,
      base,
      mobile,
      (v) => `padding-bottom: ${PADDING_REM[v as PaddingSize]} !important`,
    )
  } else if (style.paddingY) {
    addDevice(
      style.paddingY,
      base,
      mobile,
      (v) =>
        `padding-top: ${PADDING_REM[v as PaddingSize]} !important; padding-bottom: ${PADDING_REM[v as PaddingSize]} !important`,
    )
  }

  // ----- Alignment -----
  addDevice(
    style.alignment,
    base,
    mobile,
    (v) => `text-align: ${ALIGNMENT_CSS[v as Alignment]} !important`,
  )

  // ----- Container width — applied as the custom property the inner
  //       content wrapper reads via Tailwind's [--landing-container:...] -----
  addDevice(
    style.containerWidth,
    base,
    mobile,
    (v) => `--landing-container: ${CONTAINER_WIDTH_CSS[v as ContainerWidth]}`,
  )

  // ----- Corner radius (not device-aware) -----
  if (style.cornerRadius) {
    base.push(
      `border-radius: ${CORNER_RADIUS_REM[style.cornerRadius]} !important`,
    )
  }

  // ----- Border (not device-aware) — emits border shorthand + color -----
  if (style.border) {
    const b = BORDER_CSS[style.border]
    if (b) base.push(`border: ${b} !important`)
  }

  // ----- Shadow (not device-aware) -----
  if (style.shadow) {
    base.push(`box-shadow: ${SHADOW_CSS[style.shadow]} !important`)
  }

  // ----- Typography -----
  addDevice(
    style.textSize,
    base,
    mobile,
    (v) => `font-size: ${TEXT_SIZE_REM[v as TextSize]} !important`,
  )
  addDevice(
    style.textWeight,
    base,
    mobile,
    (v) => `font-weight: ${TEXT_WEIGHT_CSS[v as TextWeight]} !important`,
  )

  return { base, mobile }
}

/**
 * Append a DeviceValue<T> as a CSS declaration into base / mobile
 * buckets. `toDecl(value)` builds the actual declaration string. If
 * desktop and mobile collapse to the same value, we only emit a base
 * declaration (no mobile override needed).
 */
function addDevice<T extends string>(
  value: DeviceValue<T> | undefined,
  base: string[],
  mobile: string[],
  toDecl: (v: T) => string,
) {
  if (value === undefined || value === null) return
  if (typeof value !== "object") {
    base.push(toDecl(value as T))
    return
  }
  const obj = value as { desktop?: T; mobile?: T }
  const sharedVal = obj.desktop ?? obj.mobile
  const mobileVal = obj.mobile ?? obj.desktop
  if (sharedVal !== undefined) base.push(toDecl(sharedVal))
  if (mobileVal !== undefined && mobileVal !== sharedVal) {
    mobile.push(toDecl(mobileVal))
  }
}

/** Tailwind padding sizes mirrored as concrete rem values. */
const PADDING_REM: Record<PaddingSize, string> = {
  none: "0",
  sm: "1rem",
  md: "2rem",
  lg: "3rem",
  xl: "4rem",
}

const ALIGNMENT_CSS: Record<Alignment, string> = {
  left: "left",
  center: "center",
  right: "right",
}

const CONTAINER_WIDTH_CSS: Record<ContainerWidth, string> = {
  narrow: "48rem",
  normal: "72rem",
  full: "100%",
}

const CORNER_RADIUS_REM: Record<CornerRadius, string> = {
  none: "0",
  sm: "0.375rem",
  md: "0.5rem",
  lg: "1rem",
}

const BORDER_CSS: Record<BorderStyle, string> = {
  none: "0",
  subtle: "1px solid rgba(0, 0, 0, 0.05)",
  strong: "2px solid rgba(0, 0, 0, 0.1)",
}

const SHADOW_CSS: Record<ShadowStyle, string> = {
  none: "none",
  subtle: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  strong:
    "0 25px 50px -12px rgb(0 0 0 / 0.25)",
}

const TEXT_SIZE_REM: Record<TextSize, string> = {
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
}

const TEXT_WEIGHT_CSS: Record<TextWeight, string> = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
}

function gradientCss(g: BackgroundGradient): string {
  return `linear-gradient(${gradientDirection(g.direction)}, ${cssValue(g.from)}, ${cssValue(g.to)})`
}

function gradientDirection(d: GradientDirection): string {
  switch (d) {
    case "to-right":
      return "to right"
    case "to-left":
      return "to left"
    case "to-top":
      return "to top"
    case "to-bottom":
      return "to bottom"
    case "to-bottom-right":
      return "to bottom right"
    case "to-bottom-left":
      return "to bottom left"
  }
}

/**
 * Escape characters that would break out of an attribute selector. Target
 * ids are short alphanumeric strings (cuid / uuid), so this is mostly
 * defensive — but cheap to do, and prevents accidental selector injection
 * if a future caller passes user-controlled data.
 */
function escapeAttr(value: string): string {
  return value.replace(/["\\]/g, "\\$&")
}

/**
 * Strip CSS punctuation that would break out of a declaration. Colors
 * and other values come from user input — most are safe (hex / rgb /
 * named) but a stray `;` or `}` would corrupt the rule.
 */
function cssValue(value: string): string {
  return value.replace(/[;{}]/g, "")
}

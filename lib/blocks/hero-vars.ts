import type { CSSProperties } from "react"
import type {
  HeroBlockContent,
  HeroContentAlignment,
  HeroCornerRadius,
  HeroCtaVariant,
  HeroImageFit,
  HeroImagePosition,
  HeroMinHeight,
  HeroOverlayStyle,
} from "@/lib/types/landing-blocks"
import type { DeviceValue } from "./types"
import { resolveForDevice } from "./resolve"

/**
 * Hero block — single source of truth for "data → visuals".
 *
 * Both the SSR renderer (`components/shop/templates/blocks/HeroBlock.tsx`)
 * AND the customizer's live-preview hook (`useLivePreviewOverrides`) call
 * this function. The renderer applies the result on first paint; the hook
 * patches the same CSS vars + data attrs on the wrapper element each time
 * the admin tweaks a field, so changes appear instantly without waiting
 * for autosave to round-trip.
 *
 * Every visual aspect is expressed as a CSS custom property on the wrapper
 * (or a data attribute when boolean/enum semantics are clearer). The
 * descendants (img, overlay, content container, CTA) read those vars from
 * inline `var(...)` references or attribute selectors — nothing else needs
 * to know about the data shape.
 */
export interface HeroLiveStyles {
  /** CSS custom properties + raw layout props to set inline on the wrapper. */
  vars: Record<string, string>
  /** Data attributes for selector-based hooks (overlay on/off, CTA variant). */
  attrs: Record<string, string>
}

export function deriveHeroLiveStyles(
  data: Partial<HeroBlockContent>,
): HeroLiveStyles {
  const fitDesktop = pickDevice<HeroImageFit>(data.imageFit, "desktop") ?? "cover"
  const fitMobile = pickDevice<HeroImageFit>(data.imageFit, "mobile") ?? fitDesktop

  const posDesktop =
    pickDevice<HeroImagePosition>(data.imagePosition, "desktop") ?? "center"
  const posMobile =
    pickDevice<HeroImagePosition>(data.imagePosition, "mobile") ?? posDesktop

  const heightDesktop =
    pickDevice<HeroMinHeight>(data.minHeight, "desktop") ?? "md"
  const heightMobile =
    pickDevice<HeroMinHeight>(data.minHeight, "mobile") ?? heightDesktop

  const alignDesktop =
    pickDevice<HeroContentAlignment>(data.contentAlignment, "desktop") ?? "center"
  const alignMobile =
    pickDevice<HeroContentAlignment>(data.contentAlignment, "mobile") ?? alignDesktop

  const radius: HeroCornerRadius = data.cornerRadius ?? "none"
  const ctaVariant: HeroCtaVariant = data.ctaVariant ?? "solid"

  const overlayEnabled = data.overlayEnabled !== false
  const overlayStyle: HeroOverlayStyle = data.overlayStyle ?? "gradient-bottom"
  const overlayColor = (data.overlayColor as string) ?? "#000000"
  const overlayOpacity =
    typeof data.overlayOpacity === "number" ? data.overlayOpacity : 45

  const overlayCss = overlayEnabled
    ? composeOverlay(overlayStyle, overlayColor, overlayOpacity)
    : "none"

  const ctaTheme = CTA_VARIANT_THEME[ctaVariant]

  return {
    vars: {
      "--hero-img-fit": fitDesktop,
      "--hero-img-fit-mobile": fitMobile,
      "--hero-img-position": positionToCss(posDesktop),
      "--hero-img-position-mobile": positionToCss(posMobile),
      "--hero-min-height-desktop": MIN_HEIGHT_VH[heightDesktop].desktop,
      "--hero-min-height-mobile": MIN_HEIGHT_VH[heightMobile].mobile,
      "--hero-radius": CORNER_RADIUS_CSS[radius],
      "--hero-align-items": ALIGN_TO_FLEX[alignDesktop].items,
      "--hero-justify-content": ALIGN_TO_FLEX[alignDesktop].justify,
      "--hero-text-align": alignDesktop,
      "--hero-align-items-mobile": ALIGN_TO_FLEX[alignMobile].items,
      "--hero-justify-content-mobile": ALIGN_TO_FLEX[alignMobile].justify,
      "--hero-text-align-mobile": alignMobile,
      "--hero-overlay": overlayCss,
      "--hero-cta-bg": ctaTheme.bg,
      "--hero-cta-color": ctaTheme.color,
      "--hero-cta-border": ctaTheme.border,
      "--hero-cta-backdrop": ctaTheme.backdrop,
    },
    attrs: {
      "data-overlay-enabled": overlayEnabled ? "true" : "false",
      "data-cta-variant": ctaVariant,
      // When EITHER side (desktop or mobile) is "adapt", switch into
      // image-driven layout. Mixing "adapt" with a fixed height for the
      // other viewport is uncommon enough that we don't try to handle
      // it asymmetrically — admins picking "adapt" want the image to
      // dictate height on both sides.
      "data-image-mode":
        heightDesktop === "adapt" || heightMobile === "adapt"
          ? "adapt"
          : "fixed",
    },
  }
}

/**
 * Merge derived CSS vars into a React inline-style object. Convenience so
 * the SSR renderer can spread our vars without manual typing of the index
 * signature acrobatics.
 */
export function applyHeroVarsToStyle(
  base: CSSProperties,
  styles: HeroLiveStyles,
): CSSProperties {
  // Cast through Record so TS allows the custom `--hero-*` keys.
  return { ...base, ...(styles.vars as unknown as CSSProperties) }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Composers                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function composeOverlay(
  style: HeroOverlayStyle,
  color: string,
  opacityPct: number,
): string {
  const opacity = clamp(opacityPct, 0, 100) / 100
  const c = toRgba(color, opacity)
  const t = toRgba(color, 0)
  switch (style) {
    case "solid":
      return c
    case "gradient-bottom":
      return `linear-gradient(to top, ${c} 0%, ${t} 80%)`
    case "gradient-top":
      return `linear-gradient(to bottom, ${c} 0%, ${t} 80%)`
    case "gradient-radial":
      return `radial-gradient(120% 100% at 50% 50%, ${t} 0%, ${c} 100%)`
    default:
      return c
  }
}

function pickDevice<T>(
  value: DeviceValue<T> | undefined,
  device: "desktop" | "mobile",
): T | undefined {
  return resolveForDevice<T>(value, device)
}

function positionToCss(p: HeroImagePosition): string {
  switch (p) {
    case "top-left":
      return "top left"
    case "top-right":
      return "top right"
    case "bottom-left":
      return "bottom left"
    case "bottom-right":
      return "bottom right"
    default:
      return p
  }
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

function toRgba(input: string, alpha: number): string {
  if (typeof input === "string" && input.startsWith("#")) {
    let hex = input.slice(1)
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("")
    }
    if (hex.length === 6) {
      const n = parseInt(hex, 16)
      if (!Number.isNaN(n)) {
        const r = (n >> 16) & 255
        const g = (n >> 8) & 255
        const b = n & 255
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      }
    }
  }
  // Modern color-mix fallback for non-hex inputs.
  return `color-mix(in srgb, ${input} ${Math.round(alpha * 100)}%, transparent)`
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Lookups                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const MIN_HEIGHT_VH: Record<HeroMinHeight, { desktop: string; mobile: string }> = {
  // "adapt" lets the image dictate the height via a CSS attribute selector
  // (data-image-mode="adapt") — these vars are unused in that case but
  // need a safe fallback for consistency.
  adapt: { desktop: "auto", mobile: "auto" },
  sm: { desktop: "40vh", mobile: "30vh" },
  md: { desktop: "60vh", mobile: "40vh" },
  lg: { desktop: "75vh", mobile: "55vh" },
  xl: { desktop: "90vh", mobile: "70vh" },
  screen: { desktop: "100vh", mobile: "100vh" },
}

const CORNER_RADIUS_CSS: Record<HeroCornerRadius, string> = {
  none: "0px",
  sm: "0.375rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "2rem",
  full: "3rem",
}

const ALIGN_TO_FLEX: Record<
  HeroContentAlignment,
  { items: string; justify: string }
> = {
  left: { items: "flex-start", justify: "flex-start" },
  center: { items: "center", justify: "center" },
  right: { items: "flex-end", justify: "flex-end" },
}

const CTA_VARIANT_THEME: Record<
  HeroCtaVariant,
  { bg: string; color: string; border: string; backdrop: string }
> = {
  solid: {
    bg: "#ffffff",
    color: "#0f172a",
    border: "transparent",
    backdrop: "none",
  },
  outline: {
    bg: "transparent",
    color: "#ffffff",
    border: "rgba(255,255,255,0.7)",
    backdrop: "none",
  },
  glass: {
    bg: "rgba(255,255,255,0.15)",
    color: "#ffffff",
    border: "rgba(255,255,255,0.3)",
    backdrop: "blur(12px)",
  },
}

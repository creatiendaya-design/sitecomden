import type { LandingBlockType } from "@prisma/client"

/**
 * A value that may be either a single shared value, or a split value with
 * distinct desktop and mobile overrides. Used for style and media fields.
 */
export type DeviceValue<T> = T | { desktop?: T; mobile?: T }

export type Device = "desktop" | "mobile"

/**
 * The v2 content shape for every block type. Lives inside
 * `LandingBlock.content` and `TemplateBlock.content` as JSON.
 *
 * Three zones:
 *  - data:  shared text/content (never per-device)
 *  - style: visual configuration (some fields may use DeviceValue)
 *  - media: images/videos (always DeviceValue even when single value)
 */
export interface BlockContentV2 {
  data: Record<string, unknown>
  style: BlockStyle
  media: BlockMedia
  /** Optional anchor id for deep-linking: /productos/<slug>#<anchorId> */
  anchorId?: string
  /** Internal admin-only notes, never rendered on storefront. */
  internalNotes?: string
}

export interface BlockStyle {
  backgroundColor?: DeviceValue<string>
  textColor?: DeviceValue<string>
  paddingY?: DeviceValue<PaddingSize>
  /** When set, replaces `paddingY` for the top side. Backward-compat: blocks
   *  that only have `paddingY` use it for both sides via applyBlockStyle. */
  paddingTop?: DeviceValue<PaddingSize>
  /** When set, replaces `paddingY` for the bottom side. */
  paddingBottom?: DeviceValue<PaddingSize>
  alignment?: DeviceValue<Alignment>
  containerWidth?: DeviceValue<ContainerWidth>
  cornerRadius?: CornerRadius
  border?: BorderStyle
  shadow?: ShadowStyle
  visibility?: Visibility
  textSize?: DeviceValue<TextSize>
  textWeight?: DeviceValue<TextWeight>
  /** Linear gradient. Overrides `backgroundColor` when both are set. */
  backgroundGradient?: BackgroundGradient
}

export interface BlockMedia {
  image?: { desktop?: string; mobile?: string }
  bgImage?: { desktop?: string; mobile?: string }
  bgOverlay?: { desktop?: string; mobile?: string }
  // Block-specific media fields can be added here via module augmentation
}

export type PaddingSize = "none" | "sm" | "md" | "lg" | "xl"
export type Alignment = "left" | "center" | "right"
export type ContainerWidth = "narrow" | "normal" | "full"
export type CornerRadius = "none" | "sm" | "md" | "lg"
export type BorderStyle = "none" | "subtle" | "strong"
export type ShadowStyle = "none" | "subtle" | "strong"
export type Visibility = "always" | "mobile-only" | "desktop-only" | "hidden"
export type TextSize = "sm" | "base" | "lg" | "xl"
export type TextWeight = "regular" | "medium" | "semibold" | "bold"

export interface BackgroundGradient {
  from: string                         // hex/rgb
  to: string                           // hex/rgb
  direction: GradientDirection
}

export type GradientDirection =
  | "to-right"
  | "to-left"
  | "to-bottom"
  | "to-top"
  | "to-bottom-right"
  | "to-bottom-left"

/**
 * Block scope — used by the registry to filter which blocks can be added
 * in a given builder context.
 *
 *  - universal: can be added in any context (product, page, template, category, cart)
 *  - product:   only when BuilderContext is a product (e.g. RELATED_PRODUCTS)
 *  - category:  only when BuilderContext is a category (e.g. PRODUCT_GRID)
 */
export type BlockScope = "universal" | "product" | "category"

export type BlockCategory =
  | "content"
  | "media"
  | "social-proof"
  | "visual"
  | "commerce"

export { type LandingBlockType }

/**
 * Shape of a block instance as held in the Zustand store and passed
 * around the editor. Matches Prisma's LandingBlock row.
 */
export interface BlockInstance {
  id: string
  type: LandingBlockType
  position: number
  content: BlockContentV2
  // Sync metadata
  sourceTemplateBlockId?: string | null
  detached?: boolean
  /** Where this block's content is sourced from at render time:
   *   - "template": served directly from a TemplateBlock (no LandingBlock row)
   *   - "detached": LandingBlock override of a TemplateBlock (locally edited)
   *   - "local":   pure-local LandingBlock (not tied to any template)
   *  Set by the resolver in resolve-product-blocks.ts. Defaults to "local". */
  origin?: "template" | "detached" | "local"
}

/**
 * Declares which style-tab sections apply to a block type. Each field is
 * opt-out (default true) EXCEPT `bgImage` which is opt-in (default false) —
 * most blocks should not show "Imagen de fondo" as a control.
 *
 * A block type sets `styleSupport` in its BlockDefinition (registry) to hide
 * irrelevant sections from the Style tab.
 */
export interface BlockStyleSupport {
  backgroundColor?: boolean        // default: true
  textColor?: boolean              // default: true
  padding?: boolean                // default: true
  alignment?: boolean              // default: true
  containerWidth?: boolean         // default: true
  cornerRadius?: boolean           // default: true
  border?: boolean                 // default: true
  shadow?: boolean                 // default: true
  visibility?: boolean             // default: true
  bgImage?: boolean                // default: FALSE (opt-in — only HERO uses it today)
  paddingTopBottom?: boolean       // default: true. When false, only the legacy `paddingY` (Plan 2 control) is shown.
  /** Default: FALSE (opt-in). Existing blocks hardcode text-* / font-* on
   *  their internal headings/buttons, so wrapper-level utilities can't win
   *  the cascade and the control would feel broken to admins. Block authors
   *  must opt in once they've made their internals respond to the wrapper. */
  typography?: boolean
  gradient?: boolean                // default: false (opt-in — most blocks won't expose gradients).
}

/** Normalize a partial BlockStyleSupport to a fully-populated record. */
export function resolveStyleSupport(partial: Partial<BlockStyleSupport> | undefined): Required<BlockStyleSupport> {
  return {
    backgroundColor: partial?.backgroundColor ?? true,
    textColor: partial?.textColor ?? true,
    padding: partial?.padding ?? true,
    alignment: partial?.alignment ?? true,
    containerWidth: partial?.containerWidth ?? true,
    cornerRadius: partial?.cornerRadius ?? true,
    border: partial?.border ?? true,
    shadow: partial?.shadow ?? true,
    visibility: partial?.visibility ?? true,
    bgImage: partial?.bgImage ?? false,
    paddingTopBottom: partial?.paddingTopBottom ?? true,
    typography: partial?.typography ?? false,
    gradient: partial?.gradient ?? false,
  }
}

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
}

export interface BlockStyle {
  backgroundColor?: DeviceValue<string>
  textColor?: DeviceValue<string>
  paddingY?: DeviceValue<PaddingSize>
  alignment?: DeviceValue<Alignment>
  containerWidth?: DeviceValue<ContainerWidth>
  cornerRadius?: CornerRadius
  border?: BorderStyle
  shadow?: ShadowStyle
  visibility?: Visibility
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
export type Visibility = "always" | "mobile-only" | "desktop-only"

/**
 * Block scope — used by the registry to filter which blocks can be added
 * in a given builder context.
 *
 *  - universal: can be added in any context (product, page, template)
 *  - product:   can only be added when BuilderContext is a product
 */
export type BlockScope = "universal" | "product"

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
  // Sync metadata (populated in Plan 3; harmless here)
  sourceTemplateBlockId?: string | null
  detached?: boolean
}

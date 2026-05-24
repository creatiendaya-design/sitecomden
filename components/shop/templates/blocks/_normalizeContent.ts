import type { BlockContentV2, BlockStyle, BlockMedia } from "@/lib/blocks/types"

/**
 * Detect if a content object is in v2 shape (has { data, style, media } keys).
 * v1 content has flat fields (title, bgImage, cards, etc.) at the top level.
 */
export function isV2Content(content: unknown): content is BlockContentV2 {
  return (
    typeof content === "object" &&
    content !== null &&
    "data" in content &&
    "style" in content &&
    "media" in content
  )
}

function flattenV2Content(content: BlockContentV2, blockType: string): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...(content.data as Record<string, unknown>) }

  // Block-specific media flattening
  if (blockType === "HERO") {
    // Pick desktop image as the default single value for v1 compatibility
    const bgImage = content.media.bgImage?.desktop ?? content.media.bgImage?.mobile
    if (bgImage) flat.bgImage = bgImage
    // Legacy fallback only — the new HERO schema stores `overlayColor` on
    // `content.data` directly, which already lives in `flat` via the spread
    // above. Don't overwrite it when the admin has already set a value.
    if (flat.overlayColor === undefined) {
      const bgOverlay = content.media.bgOverlay?.desktop ?? content.media.bgOverlay?.mobile
      if (bgOverlay) flat.overlayColor = bgOverlay
    }
  }

  return flat
}

/**
 * Convenience: given any content (v1 or v2) and a block type, return a flat
 * object the legacy renderer can destructure.
 */
export function readContent<T = Record<string, unknown>>(content: unknown, blockType: string): T {
  if (isV2Content(content)) return flattenV2Content(content, blockType) as T
  return (content ?? {}) as T
}

/**
 * Returns the Level 2 style and media zones from v2 content. For legacy
 * v1 blocks (flat content without style/media), returns empty shapes so
 * renderers can still call applyBlockStyle without null checks.
 */
export function readStyleAndMedia(content: unknown): { style: BlockStyle; media: BlockMedia } {
  if (isV2Content(content)) {
    return { style: content.style, media: content.media }
  }
  return { style: {}, media: {} }
}

import type { BlockContentV2 } from "@/lib/blocks/types"

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

/**
 * Normalize content to a flat shape the legacy renderers expect.
 *
 * - v1 (already flat): return as-is
 * - v2: flatten by merging data + select media fields. The caller
 *   decides which media fields are relevant (depends on block type).
 *
 * For the bilingual reader pattern used in Plan 1, we flatten v2 to the v1
 * field names so the existing render logic does not need to change.
 *
 * Plan 2 replaces this with direct v2-aware renderers.
 */
export function flattenV2Content(content: BlockContentV2, blockType: string): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...(content.data as Record<string, unknown>) }

  // Block-specific media flattening
  if (blockType === "HERO") {
    // Pick desktop image as the default single value for v1 compatibility
    const bgImage = content.media.bgImage?.desktop ?? content.media.bgImage?.mobile
    if (bgImage) flat.bgImage = bgImage
    const bgOverlay = content.media.bgOverlay?.desktop ?? content.media.bgOverlay?.mobile
    if (bgOverlay) flat.overlayColor = bgOverlay
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

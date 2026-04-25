import type { LandingBlockType } from "@prisma/client"

interface BlockLike {
  type: LandingBlockType | string
  content: unknown
}

/**
 * Find the first usable image URL across an ordered block list. Used to
 * auto-fill a template card's preview when no manual thumbnail was uploaded.
 *
 * Lookup order per block (skipping anything empty / non-string):
 *  - HERO        → media.bgImage.{desktop|mobile}
 *  - IMAGE_TEXT  → media.image.{desktop|mobile}
 *  - GALLERY     → data.images[0] (string OR { url })
 *  - VIDEO       → data.videos[0].thumbnail OR oEmbed-style external URL
 *  - everything else → ignored
 *
 * Returns the first hit, or null if no block in the list has an image.
 */
export function extractPreviewImage(blocks: BlockLike[]): string | null {
  for (const b of blocks) {
    const content = b.content as Record<string, unknown> | null
    if (!content) continue
    const data = (content.data as Record<string, unknown> | undefined) ?? {}
    const media = (content.media as Record<string, unknown> | undefined) ?? {}

    if (b.type === "HERO") {
      const bg = media.bgImage as { desktop?: string; mobile?: string } | undefined
      const url = bg?.desktop || bg?.mobile
      if (url) return url
    }

    if (b.type === "IMAGE_TEXT") {
      const img = media.image as { desktop?: string; mobile?: string } | undefined
      const url = img?.desktop || img?.mobile
      if (url) return url
    }

    if (b.type === "GALLERY") {
      const images = data.images as unknown
      if (Array.isArray(images) && images.length > 0) {
        const first = images[0]
        if (typeof first === "string" && first) return first
        if (first && typeof first === "object" && "url" in first) {
          const url = (first as { url?: string }).url
          if (url) return url
        }
      }
    }

    if (b.type === "VIDEO") {
      const videos = data.videos as unknown
      if (Array.isArray(videos) && videos.length > 0) {
        const first = videos[0] as { thumbnail?: string } | undefined
        if (first?.thumbnail) return first.thumbnail
      }
    }
  }
  return null
}

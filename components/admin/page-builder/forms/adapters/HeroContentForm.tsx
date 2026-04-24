"use client"

import dynamic from "next/dynamic"
import type { BlockContentV2 } from "@/lib/blocks/types"

const HeroBlockForm = dynamic(
  () => import("@/components/admin/landing-builder/block-forms/HeroBlockForm"),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-muted rounded" /> }
)

interface HeroContentFormProps {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

/**
 * Adapter: bridge v1 legacy HeroBlockForm to v2 content shape.
 *
 * Legacy form expects flat { title, subtitle, bgImage, overlayColor, ctaText }.
 * v2 stores text in `data` and images in `media.bgImage.{desktop,mobile}`.
 *
 * When the admin changes the legacy form, we update v2 by writing:
 *   - text fields into content.data
 *   - bgImage into both desktop AND mobile slots (per-device override is
 *     handled separately in the right panel's Media section in Plan 2)
 */
export function HeroContentForm({ content, onChange }: HeroContentFormProps) {
  const flatV1 = {
    title: (content.data.title as string) ?? "",
    subtitle: (content.data.subtitle as string) ?? "",
    ctaText: (content.data.ctaText as string) ?? "",
    bgImage: content.media.bgImage?.desktop ?? "",
    overlayColor: content.media.bgOverlay?.desktop ?? "rgba(0,0,0,0.3)",
  }

  const handleFlatChange = (updated: typeof flatV1) => {
    onChange({
      data: {
        ...content.data,
        title: updated.title,
        subtitle: updated.subtitle,
        ctaText: updated.ctaText,
      },
      style: content.style,
      media: {
        ...content.media,
        bgImage: updated.bgImage
          ? { desktop: updated.bgImage, mobile: updated.bgImage }
          : undefined,
        bgOverlay: { desktop: updated.overlayColor, mobile: updated.overlayColor },
      },
    })
  }

  return <HeroBlockForm content={flatV1 as any} onChange={handleFlatChange as any} />
}

import Image from "next/image"
import Link from "next/link"
import { applyBlockStyle } from "@/lib/blocks/apply-style"
import type { BlockStyle } from "@/lib/blocks/types"
import { SubBlockWrapper } from "../../_helpers"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"

interface Props {
  block: ResolvedThemeSectionBlock
}

interface ImageBlockContent {
  image?: string
  /** Max width in px. Native aspect ratio is preserved via height: auto. */
  width?: number
  alt?: string
  /** Optional link target; when present the image becomes clickable. */
  href?: string
  alignment?: "left" | "center" | "right"
  style?: BlockStyle
}

const ALIGN_CLASS: Record<NonNullable<ImageBlockContent["alignment"]>, string> = {
  left: "items-start",
  center: "items-center",
  right: "items-end",
}

/**
 * IMAGE sub-block. Primary use case is a brand logo at the start of a
 * footer column (see RENOHEAL reference shared by the user). The
 * admin-configurable `width` is enforced as a CSS max-width on the
 * <img> wrapper so the image scales down on narrow viewports but never
 * exceeds the configured size.
 *
 * Renders nothing when no image is set so empty blocks don't reserve
 * space in the grid.
 */
export function ImageBlock({ block }: Props) {
  const data = block.content as ImageBlockContent
  const {
    className: styleClass,
    style: resolvedStyle,
  } = applyBlockStyle(data.style)
  const colorSchemeId = data.style?.colorSchemeId
  const alignment = data.alignment ?? "left"
  const width = clampWidth(data.width)

  if (!data.image) return null

  const imgEl = (
    <Image
      src={data.image}
      alt={data.alt ?? ""}
      // Intrinsic dims for Next/Image's optimization sizing; the actual
      // display width is controlled by the inline style below so the
      // admin's pick wins.
      width={width}
      height={width}
      sizes={`${width}px`}
      style={{ width: `${width}px`, height: "auto", maxWidth: "100%" }}
      className="object-contain"
    />
  )

  return (
    <SubBlockWrapper
      block={block}
      colorScheme={colorSchemeId}
      className={`flex flex-col ${ALIGN_CLASS[alignment]} ${styleClass}`}
      style={resolvedStyle}
    >
      {data.href ? (
        <Link href={data.href} aria-label={data.alt || undefined}>
          {imgEl}
        </Link>
      ) : (
        imgEl
      )}
    </SubBlockWrapper>
  )
}

function clampWidth(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 150
  return Math.min(600, Math.max(40, Math.round(value)))
}

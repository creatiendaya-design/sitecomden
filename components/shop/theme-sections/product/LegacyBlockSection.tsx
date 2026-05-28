import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import type {
  BlockContentV2,
  BlockMedia,
  BlockStyle,
  LandingBlockType,
} from "@/lib/blocks/types"
import { resolveContentForDevice } from "@/lib/blocks/resolve"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { cn } from "@/lib/utils"
import HeroBlock from "@/components/shop/templates/blocks/HeroBlock"
import GalleryBlock from "@/components/shop/templates/blocks/GalleryBlock"
import TestimonialsBlock from "@/components/shop/templates/blocks/TestimonialsBlock"
import VideoBlock from "@/components/shop/templates/blocks/VideoBlock"
import TickerBlock from "@/components/shop/templates/blocks/TickerBlock"
import TrustBadgesBlock from "@/components/shop/templates/blocks/TrustBadgesBlock"
import RichTextBlock from "@/components/shop/templates/blocks/RichTextBlock"
import FaqBlock from "@/components/shop/templates/blocks/FaqBlock"
import ImageTextBlock from "@/components/shop/templates/blocks/ImageTextBlock"
import IconTextBlock from "@/components/shop/templates/blocks/IconTextBlock"
import RelatedProductsBlockEditorWrapper from "@/components/shop/templates/blocks/RelatedProductsBlockEditorWrapper"
import ComparisonBlock from "@/components/shop/templates/blocks/ComparisonBlock"
import FriendlyBlock from "@/components/shop/templates/blocks/FriendlyBlock"
import CarouselBlock from "@/components/shop/templates/blocks/CarouselBlock"
import BannerTopTextBlock from "@/components/shop/templates/blocks/BannerTopTextBlock"
import PorcentajeUnoBlock from "@/components/shop/templates/blocks/PorcentajeUnoBlock"
import FaqTwoBlock from "@/components/shop/templates/blocks/FaqTwoBlock"
import type { TickerBlockContent } from "@/lib/types/landing-blocks"

interface LegacyBlockSectionProps {
  section: ResolvedThemeSection
  /** Plumbed through so the RELATED_PRODUCTS adapter can scope its query
   *  to the current product page, matching what LandingBlockRenderer does
   *  when the same block lives inside a per-product landing template. */
  currentProductId: string
}

/**
 * Shopify-style adapter that renders any universal page-builder block as
 * a PRODUCT-group theme section. The section's `content` carries the
 * wrapped block's `BlockContentV2` (data/style/media) plus a `blockType`
 * discriminator.
 *
 * The outer wrapper emits `data-preview-target="section:<id>"` (not
 * `block:`) so the customizer's selection and delete handlers — which
 * key off the theme-sections store, not the page-builder store — find
 * the right draft. The live-preview hook in
 * `useLivePreviewOverrides.ts` treats LEGACY_BLOCK section targets like
 * `block:` targets (colorEl = firstElementChild, content text sync
 * reads `s.content.data` instead of `s.content`) so style/text edits
 * repaint without an autosave round-trip.
 */
export function LegacyBlockSection({
  section,
  currentProductId,
}: LegacyBlockSectionProps) {
  const blockType = section.content.blockType as LandingBlockType | undefined
  if (!blockType) return null

  // Reconstruct BlockContentV2 from the section's flat content envelope.
  // `getThemedSections` already device-flattened `content.style`, but it
  // doesn't recurse into `content.media`, so we run the block resolver
  // once here to flatten both consistently — same path the page-builder
  // takes when rendering inside a per-product landing.
  const blockContent: BlockContentV2 = {
    data: (section.content.data as Record<string, unknown>) ?? {},
    style: (section.content.style as BlockStyle) ?? {},
    media: (section.content.media as BlockMedia) ?? {},
  }
  const resolved = resolveContentForDevice(blockContent, "desktop")

  // We still want section-level wrapper styling (padding, alignment,
  // color-scheme rebind) to apply — `applyThemeSectionStyle` reuses the
  // same BlockStyle → className/style pipeline as the page-builder, so
  // there's no functional drift between rendering this block as a
  // section vs. as a landing block.
  const { className: styleClass, style: wrapperStyle, dataColorScheme } =
    applyThemeSectionStyle(resolved.style)

  const inner = renderBlock(blockType, resolved, currentProductId)
  if (inner === null) return null

  return (
    <div
      data-preview-target={`section:${section.id}`}
      data-color-scheme={dataColorScheme}
      className={cn(styleClass)}
      style={wrapperStyle}
    >
      {inner}
    </div>
  )
}

/**
 * Block-type → component dispatcher. Kept narrow to the universal scope —
 * RELATED_PRODUCTS gets `currentProductId` plumbed in, PRODUCT_GRID is
 * intentionally excluded (it belongs to the category template, not
 * product). Mirrors the page-builder's LandingBlockRenderer switch.
 */
function renderBlock(
  type: LandingBlockType,
  content: BlockContentV2,
  currentProductId: string,
): React.ReactNode {
  // The block renderers were authored against the v2 BlockContentV2 shape
  // typed as `any` in LandingBlockRenderer to dodge the per-block content
  // narrowing. Keeping the same `any` cast here — narrowing would mean
  // touching every block component, which is out of scope for this
  // adapter.
  const c = content as unknown as Parameters<typeof HeroBlock>[0]["content"]
  switch (type) {
    case "HERO":
      return <HeroBlock content={c} />
    case "GALLERY":
      return <GalleryBlock content={c as never} />
    case "TESTIMONIALS":
      return <TestimonialsBlock content={c as never} />
    case "VIDEO":
      return <VideoBlock content={c as never} />
    case "TICKER":
      return <TickerBlock content={c as unknown as TickerBlockContent} />
    case "TRUST_BADGES":
      return <TrustBadgesBlock content={c as never} />
    case "RICH_TEXT":
      return <RichTextBlock content={c as never} />
    case "FAQ":
      return <FaqBlock content={c as never} />
    case "IMAGE_TEXT":
      return <ImageTextBlock content={c as never} />
    case "ICON_TEXT":
      return <IconTextBlock content={c as never} />
    case "RELATED_PRODUCTS":
      return (
        <RelatedProductsBlockEditorWrapper
          content={c as never}
          currentProductId={currentProductId}
        />
      )
    case "COMPARISON":
      return <ComparisonBlock content={c as never} />
    case "FRIENDLY":
      return <FriendlyBlock content={c as never} />
    case "CAROUSEL":
      return <CarouselBlock content={c as never} />
    case "BANNER_TOP_TEXT":
      return <BannerTopTextBlock content={c as never} />
    case "PORCENTAJE_UNO":
      return <PorcentajeUnoBlock content={c as never} />
    case "FAQ_TWO":
      return <FaqTwoBlock content={c as never} />
    case "COLORS":
    case "PRODUCT_GRID":
      // COLORS is a legacy admin-only block (no storefront renderer);
      // PRODUCT_GRID belongs to the category template. Both are skipped
      // here so an admin can't accidentally drop them into a product.
      return null
    default:
      return null
  }
}

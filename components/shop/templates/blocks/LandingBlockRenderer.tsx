import type { LandingBlock, TickerBlockContent } from "@/lib/types/landing-blocks";
import HeroBlock from "./HeroBlock";
import BenefitsBlock from "./BenefitsBlock";
import GalleryBlock from "./GalleryBlock";
import TestimonialsBlock from "./TestimonialsBlock";
import VideoBlock from "./VideoBlock";
import ColorsBlock from "./ColorsBlock";
import TickerBlock from "./TickerBlock";
import TrustBadgesBlock from "./TrustBadgesBlock";
import RichTextBlock from "./RichTextBlock";
import FaqBlock from "./FaqBlock";
import ImageTextBlock from "./ImageTextBlock";
import RelatedProductsBlockEditorWrapper from "./RelatedProductsBlockEditorWrapper";
import ProductGridBlock from "./ProductGridBlock";

interface LandingBlockRendererProps {
  blocks: LandingBlock[];
  onCtaClick?: () => void;
  /** When rendering from a product page, the RELATED_PRODUCTS block uses
   *  this to fetch real recommendations. When absent (editor canvas), the
   *  block falls back to placeholder cards. */
  currentProductId?: string;
  /** When rendering from a category page (Plan 7.1), the PRODUCT_GRID
   *  block uses this to fetch the category's products server-side. */
  currentCategoryId?: string;
}

// Detect sticky flag across both content shapes:
//  - v1 flat: content.sticky
//  - v2 zoned: content.data.sticky
function isStickyTicker(b: LandingBlock): boolean {
  if (b.type !== "TICKER") return false;
  const c = b.content as Record<string, unknown>;
  if (c?.sticky === true) return true;
  const data = c?.data as Record<string, unknown> | undefined;
  return data?.sticky === true;
}

// Read the Visibility setting from the v2 style zone. Blocks created in v1
// (flat shape) have no style zone — treat them as "always" visible.
function getVisibility(b: LandingBlock): string {
  const c = b.content as Record<string, unknown>;
  const style = c?.style as Record<string, unknown> | undefined;
  return (style?.visibility as string) ?? "always";
}

function anchorIdOf(b: LandingBlock): string | undefined {
  const c = b.content as Record<string, unknown>;
  return (c?.anchorId as string | undefined) || undefined;
}

// Tailwind CSS classes that hide a block based on viewport breakpoint.
// Uses the `lg` breakpoint (1024px) to match the editor's Desktop/Mobile
// cutoff defined in lib/blocks/resolve.ts.
//  - "mobile-only": visible on mobile, hidden on desktop   → lg:hidden
//  - "desktop-only": visible on desktop, hidden on mobile → hidden lg:block
function getVisibilityClass(visibility: string): string {
  if (visibility === "mobile-only") return "lg:hidden";
  if (visibility === "desktop-only") return "hidden lg:block";
  return "";
}

export default function LandingBlockRenderer({ blocks, onCtaClick, currentProductId, currentCategoryId }: LandingBlockRendererProps) {
  // Skip blocks marked as fully hidden — they should not render on the
  // storefront at all. Device-specific visibility (mobile-only / desktop-only)
  // is applied as a Tailwind class on the wrapping div below.
  const visible = blocks.filter((b) => getVisibility(b) !== "hidden");

  // Sticky tickers render outside normal flow, at the top.
  const stickyTickers = visible.filter(isStickyTicker);
  const rest = visible.filter((b) => !isStickyTicker(b));

  return (
    <>
      {/*
        Group ALL sticky tickers in a single `position: sticky` wrapper so
        they stack vertically at the top of the page and stick together as
        the user scrolls. Rendering each in its own wrapper would trap
        sticky in a short containing block (no scroll range) and break the
        behavior. Order inside the stack respects the editor's position
        field (thanks to the stable sort of `visible`).
      */}
      {stickyTickers.length > 0 && (
        <div className="sticky top-0 z-40">
          {stickyTickers.map((block) => {
            const className = getVisibilityClass(getVisibility(block));
            return (
              <div key={block.id} id={anchorIdOf(block) || undefined} className={className || undefined}>
                <TickerBlock content={block.content as TickerBlockContent} sticky />
              </div>
            );
          })}
        </div>
      )}

      {rest.map((block) => {
        const c = block.content as any;
        const className = getVisibilityClass(getVisibility(block));
        let inner: React.ReactNode = null;
        switch (block.type) {
          case "HERO":
            inner = <HeroBlock content={c} onCtaClick={onCtaClick} />;
            break;
          case "BENEFITS":
            inner = <BenefitsBlock content={c} />;
            break;
          case "GALLERY":
            inner = <GalleryBlock content={c} onBuyClick={onCtaClick} />;
            break;
          case "TESTIMONIALS":
            inner = <TestimonialsBlock content={c} />;
            break;
          case "VIDEO":
            inner = <VideoBlock content={c} onBuyClick={onCtaClick} />;
            break;
          case "COLORS":
            inner = <ColorsBlock content={c} />;
            break;
          case "TICKER":
            inner = <TickerBlock content={c} />;
            break;
          case "TRUST_BADGES":
            inner = <TrustBadgesBlock content={c} />;
            break;
          case "RICH_TEXT":
            inner = <RichTextBlock content={c} />;
            break;
          case "FAQ":
            inner = <FaqBlock content={c} />;
            break;
          case "IMAGE_TEXT":
            inner = <ImageTextBlock content={c} onCtaClick={onCtaClick} />;
            break;
          case "RELATED_PRODUCTS":
            inner = <RelatedProductsBlockEditorWrapper content={c} currentProductId={currentProductId} />;
            break;
          case "PRODUCT_GRID":
            inner = <ProductGridBlock content={c} categoryId={currentCategoryId ?? null} />;
            break;
          default:
            return null;
        }

        return (
          <div key={block.id} id={anchorIdOf(block) || undefined} className={className || undefined}>
            {inner}
          </div>
        );
      })}
    </>
  );
}

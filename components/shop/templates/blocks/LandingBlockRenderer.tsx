import type { LandingBlock, TickerBlockContent } from "@/lib/types/landing-blocks";
import HeroBlock from "./HeroBlock";
import BenefitsBlock from "./BenefitsBlock";
import GalleryBlock from "./GalleryBlock";
import TestimonialsBlock from "./TestimonialsBlock";
import VideoBlock from "./VideoBlock";
import ColorsBlock from "./ColorsBlock";
import TickerBlock from "./TickerBlock";

interface LandingBlockRendererProps {
  blocks: LandingBlock[];
  onCtaClick?: () => void;
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

export default function LandingBlockRenderer({ blocks, onCtaClick }: LandingBlockRendererProps) {
  // Skip blocks marked as fully hidden — they should not render on the storefront
  // at all. Device-specific visibility (mobile-only / desktop-only) is handled
  // via CSS inside each individual block renderer.
  const visible = blocks.filter((b) => getVisibility(b) !== "hidden");

  // Sticky tickers render outside normal flow, at the top.
  const stickyTickers = visible.filter(isStickyTicker);
  const rest = visible.filter((b) => !isStickyTicker(b));

  return (
    <>
      {stickyTickers.map((block) => (
        <TickerBlock
          key={block.id}
          content={block.content as TickerBlockContent}
          sticky
        />
      ))}

      {rest.map((block) => {
        const c = block.content as any;
        switch (block.type) {
          case "HERO":
            return <HeroBlock key={block.id} content={c} onCtaClick={onCtaClick} />;
          case "BENEFITS":
            return <BenefitsBlock key={block.id} content={c} />;
          case "GALLERY":
            return <GalleryBlock key={block.id} content={c} onBuyClick={onCtaClick} />;
          case "TESTIMONIALS":
            return <TestimonialsBlock key={block.id} content={c} />;
          case "VIDEO":
            return <VideoBlock key={block.id} content={c} onBuyClick={onCtaClick} />;
          case "COLORS":
            return <ColorsBlock key={block.id} content={c} />;
          case "TICKER":
            return <TickerBlock key={block.id} content={c} />;
          default:
            return null;
        }
      })}
    </>
  );
}

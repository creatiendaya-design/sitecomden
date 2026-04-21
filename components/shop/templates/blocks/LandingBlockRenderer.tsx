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

export default function LandingBlockRenderer({ blocks, onCtaClick }: LandingBlockRendererProps) {
  // Sticky tickers render outside normal flow, at the top
  const stickyTickers = blocks.filter(
    (b) => b.type === "TICKER" && (b.content as TickerBlockContent).sticky
  );
  const rest = blocks.filter(
    (b) => !(b.type === "TICKER" && (b.content as TickerBlockContent).sticky)
  );

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

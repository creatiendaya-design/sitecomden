"use client";

import Image from "next/image";
import type { HeroBlockContent } from "@/lib/types/landing-blocks";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface HeroBlockProps {
  content: HeroBlockContent | unknown;
  onCtaClick?: () => void;
}

export default function HeroBlock({ content: rawContent, onCtaClick }: HeroBlockProps) {
  const content = readContent<HeroBlockContent>(rawContent, "HERO");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);
  const { title, subtitle, bgImage, overlayColor, ctaText } = content;

  return (
    <section
      className={cn(
        "relative min-h-[40vh] @md:min-h-[60vh] flex items-center justify-center overflow-hidden @container",
        styleClass,
      )}
      style={inlineStyle}
    >
      {bgImage ? (
        <Image
          src={bgImage}
          alt={title}
          fill
          className="object-cover"
          priority
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: overlayColor ?? "rgba(0,0,0,0.4)" }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-10 @md:py-20 text-center text-white">
        <h1 className="text-3xl @md:text-4xl @lg:text-5xl @xl:text-6xl font-bold mb-4 drop-shadow-lg">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base @md:text-lg @lg:text-xl max-w-2xl mx-auto mb-6 @md:mb-8 text-white/90 drop-shadow">
            {subtitle}
          </p>
        )}
        {ctaText && (
          <button
            onClick={onCtaClick}
            className="landing-cta-btn inline-flex items-center justify-center rounded-full px-6 @md:px-8 py-3 @md:py-4 text-base @md:text-lg font-semibold shadow-xl transition-transform hover:scale-105 active:scale-95"
          >
            {ctaText}
          </button>
        )}
      </div>
    </section>
  );
}

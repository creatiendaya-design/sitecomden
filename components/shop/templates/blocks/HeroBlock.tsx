"use client";

import Image from "next/image";
import type { HeroBlockContent } from "@/lib/types/landing-blocks";
import { readContent } from "./_normalizeContent";

interface HeroBlockProps {
  content: HeroBlockContent | unknown;
  onCtaClick?: () => void;
}

export default function HeroBlock({ content: rawContent, onCtaClick }: HeroBlockProps) {
  const content = readContent<HeroBlockContent>(rawContent, "HERO");
  const { title, subtitle, bgImage, overlayColor, ctaText } = content;

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
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
      <div className="relative z-10 container mx-auto px-4 py-20 text-center text-white">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-8 text-white/90 drop-shadow">
            {subtitle}
          </p>
        )}
        {ctaText && (
          <button
            onClick={onCtaClick}
            className="landing-cta-btn inline-flex items-center justify-center rounded-full px-8 py-4 text-lg font-semibold shadow-xl transition-transform hover:scale-105 active:scale-95"
          >
            {ctaText}
          </button>
        )}
      </div>
    </section>
  );
}

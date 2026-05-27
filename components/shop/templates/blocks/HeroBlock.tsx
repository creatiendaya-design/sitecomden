"use client";

import type { CSSProperties } from "react";
import type { HeroBlockContent } from "@/lib/types/landing-blocks";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";
import {
  applyHeroVarsToStyle,
  deriveHeroLiveStyles,
} from "@/lib/blocks/hero-vars";

interface HeroBlockProps {
  content: HeroBlockContent | unknown;
  onCtaClick?: () => void;
}

/**
 * HERO block — fully data-driven via CSS vars on the wrapper.
 *
 * The wrapper element emits every visual setting as a CSS custom property
 * (or data attribute). Descendants read those vars via rules in
 * globals.css — so the customizer's live-preview hook can patch the same
 * vars on the wrapper to repaint instantly, without needing the SSR to
 * re-render. See `lib/blocks/hero-vars.ts` for the data → vars derivation
 * (same function used by `useLivePreviewOverrides`).
 */
export default function HeroBlock({
  content: rawContent,
  onCtaClick,
}: HeroBlockProps) {
  const content = readContent<HeroBlockContent>(rawContent, "HERO");
  const { style: blockStyle, media } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } =
    applyBlockStyle(blockStyle);

  const { title, subtitle, ctaText, ctaHref, sectionHref } = content;
  const live = deriveHeroLiveStyles(content);

  // ─── Background image (per-viewport via <picture>) ────────────────────
  const v1Bg = (content as { bgImage?: string }).bgImage;
  const bgImageDesktop =
    media.bgImage?.desktop ?? media.bgImage?.mobile ?? v1Bg;
  const bgImageMobile =
    media.bgImage?.mobile ?? media.bgImage?.desktop ?? v1Bg;
  const hasImage = !!bgImageDesktop || !!bgImageMobile;

  // applyBlockStyle's colors/padding + our hero CSS vars on the wrapper.
  // Everything else (min-height, border-radius, object-fit, overlay,
  // alignment, CTA tokens) is applied by globals.css rules reading the
  // wrapper vars.
  const wrapperStyle: CSSProperties = applyHeroVarsToStyle(inlineStyle, live);

  return (
    <section
      className={cn(
        "hero-block relative flex overflow-hidden @container",
        styleClass,
      )}
      style={wrapperStyle}
      {...live.attrs}
    >
      {hasImage ? (
        <picture className="absolute inset-0 block">
          {bgImageDesktop && (
            <source media="(min-width: 768px)" srcSet={bgImageDesktop} />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bgImageMobile ?? bgImageDesktop}
            alt={title}
            className="hero-img absolute inset-0 h-full w-full"
            loading="eager"
          />
        </picture>
      ) : (
        // Fallback gradient when no image AND no admin-set bg.
        !blockStyle?.backgroundGradient &&
        !blockStyle?.backgroundColor && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
        )
      )}

      {/* Overlay — show/hide via data-overlay-enabled on the wrapper. */}
      <div className="hero-overlay pointer-events-none absolute inset-0" />

      {/* Soft vignette — hidden by CSS when overlay is on. */}
      {hasImage && (
        <div
          aria-hidden
          className="hero-vignette pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.25) 100%)",
          }}
        />
      )}

      {/* Section-wide link — when `sectionHref` is set, the entire hero
          becomes clickable. The CTA wrapper below uses `z-30` to stay
          independently clickable above this overlay. */}
      {sectionHref && (
        <a
          href={sectionHref}
          aria-label={title}
          className="hero-section-link absolute inset-0 z-20"
          tabIndex={-1}
        >
          <span className="sr-only">{title}</span>
        </a>
      )}

      <div
        className="hero-content relative z-10 mx-auto flex w-full flex-col gap-4 px-5 py-10 text-white @md:px-8 @md:py-20 @md:gap-6"
        style={{ maxWidth: "var(--landing-container, 72rem)" }}
      >
        <h1
          data-content-field="title"
          className={cn(
            "text-3xl font-bold leading-[1.1] tracking-tight",
            "drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]",
            "@md:text-5xl @lg:text-6xl @xl:text-7xl",
            "hero-anim-in",
          )}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            data-content-field="subtitle"
            className={cn(
              "max-w-2xl text-base text-white/90",
              "drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]",
              "@md:text-lg @lg:text-xl",
              "hero-anim-in hero-anim-delay-1",
            )}
          >
            {subtitle}
          </p>
        )}

        {ctaText && (
          <div className="hero-anim-in hero-anim-delay-2 relative z-30 pt-1 @md:pt-2">
            {renderCta({
              text: ctaText,
              href: ctaHref,
              onClick: onCtaClick,
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  CTA                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function renderCta({
  text,
  href,
  onClick,
}: {
  text: string;
  href?: string;
  onClick?: () => void;
}) {
  // CTA visuals come from `.hero-cta-btn` reading the wrapper's
  // --hero-cta-* vars (see globals.css). The button still needs the base
  // structural classes here for the hover translate / shadow.
  const shared = cn(
    "hero-cta-btn group relative inline-flex items-center justify-center gap-2",
    "rounded-full border-2 border-solid px-7 py-3.5 text-base font-semibold",
    "transition-all duration-200 ease-out",
    "shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)]",
    "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)]",
    "active:translate-y-0 active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
    "@md:px-8 @md:py-4 @md:text-lg",
  );
  const inner = (
    <>
      <span data-content-field="ctaText">{text}</span>
      <span
        aria-hidden
        className="inline-block transition-transform duration-200 group-hover:translate-x-0.5"
      >
        →
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} className={shared} onClick={onClick}>
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("landing-cta-btn", shared)}
    >
      {inner}
    </button>
  );
}

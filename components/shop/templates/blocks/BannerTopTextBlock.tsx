"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type {
  BannerTopTextBlockContent,
  BannerTopTextHeight,
  BannerTopTextCornerRadius,
  BannerTopTextCtaVariant,
} from "@/lib/types/landing-blocks";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface BannerTopTextBlockProps {
  content: BannerTopTextBlockContent | unknown;
}

const HEIGHT_CLASS: Record<BannerTopTextHeight, string> = {
  sm: "min-h-[260px] @md:min-h-[300px]",
  md: "min-h-[320px] @md:min-h-[380px]",
  lg: "min-h-[380px] @md:min-h-[460px]",
  xl: "min-h-[440px] @md:min-h-[560px]",
};

const RADIUS_CLASS: Record<BannerTopTextCornerRadius, string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
  "2xl": "rounded-[2.5rem]",
};

const CTA_VARIANT_CLASS: Record<BannerTopTextCtaVariant, string> = {
  solid:
    "bg-white text-[color:var(--btt-cta-text,#dc2626)] hover:bg-white/90",
  outline:
    "border-2 border-white text-white hover:bg-white/10",
  glass:
    "bg-white/15 backdrop-blur-md border border-white/30 text-white hover:bg-white/25",
};

export default function BannerTopTextBlock({ content: rawContent }: BannerTopTextBlockProps) {
  const data = readContent<BannerTopTextBlockContent>(rawContent, "BANNER_TOP_TEXT");
  const { style: blockStyle, media } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const image = media?.image as { desktop?: string; mobile?: string } | undefined;
  const imageDesktop = image?.desktop?.trim() || image?.mobile?.trim() || "";
  const imageMobile = image?.mobile?.trim() || imageDesktop;

  const mediaType = data.mediaType ?? "image";
  const mediaPosition = data.mediaPosition ?? "left";
  const height = data.height ?? "lg";
  const radius = data.cornerRadius ?? "none";
  const overlayStyle = data.overlayStyle ?? "gradient-bottom";
  const overlayOpacity = clamp(data.overlayOpacity ?? 35, 0, 100);
  const overlayColor = data.overlayColor ?? "#000000";

  const scrollItems = (data.scrollItems ?? []).filter(
    (it) => typeof it?.text === "string" && it.text.trim().length > 0,
  );
  const scrollDuration = clamp(data.scrollDurationSec ?? 18, 4, 120);
  const scrollDirection = data.scrollDirection ?? "up";
  const pauseOnHover = data.pauseOnHover ?? true;
  const italic = data.scrollItalic ?? true;
  const uppercase = data.scrollUppercase ?? true;
  const ghostOutline = data.scrollGhostOutline ?? false;

  const sectionStyle: CSSProperties = { ...inlineStyle };
  const cssVars: Array<[string, string | undefined]> = [
    ["--btt-overlay-color", overlayColor],
    ["--btt-overlay-opacity", `${overlayOpacity}%`],
    ["--btt-scroll-bg", data.scrollBgColor],
    ["--btt-scroll-text", data.scrollTextColor],
    ["--btt-scroll-ghost", data.scrollGhostTextColor],
    ["--marquee-vertical-speed", `${scrollDuration}s`],
  ];
  for (const [name, value] of cssVars) {
    if (value !== undefined && value !== "") {
      (sectionStyle as Record<string, string>)[name] = value;
    }
  }

  // Hide block entirely if there is nothing to render — keeps the storefront
  // clean when the admin clears every field.
  const hasMedia =
    (mediaType === "image" && (imageDesktop || imageMobile)) ||
    (mediaType === "video" && (data.videoUrl?.trim() ?? ""));
  const hasText =
    Boolean(data.heading) || Boolean(data.description) || Boolean(data.ctaLabel);
  const hasScroll = scrollItems.length > 0;
  if (!hasMedia && !hasText && !hasScroll) return null;

  const mediaOrderClass = mediaPosition === "right" ? "@lg:order-2" : "@lg:order-1";
  const scrollOrderClass = mediaPosition === "right" ? "@lg:order-1" : "@lg:order-2";

  return (
    <section
      className={cn("landing-section @container w-full", styleClass)}
      style={sectionStyle}
    >
      <div
        className={cn(
          "relative grid grid-cols-1 @lg:grid-cols-2 w-full overflow-hidden",
          HEIGHT_CLASS[height],
          RADIUS_CLASS[radius],
        )}
      >
        {/* ─── Media column ─────────────────────────────────────────── */}
        <div className={cn("relative w-full h-full min-h-[260px]", mediaOrderClass)}>
          <BannerMedia
            mediaType={mediaType}
            imageDesktop={imageDesktop}
            imageMobile={imageMobile}
            videoUrl={data.videoUrl}
            videoPoster={data.videoPoster}
            videoAutoplay={data.videoAutoplay ?? true}
            alt={data.mediaAlt ?? ""}
          />

          {overlayStyle !== "none" && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: overlayBackground(overlayStyle) }}
            />
          )}

          {(data.caption || data.heading || data.description || data.ctaLabel) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 @md:p-10">
              <div className="max-w-md w-full text-center text-white">
                {data.caption && (
                  <p
                    data-content-field="caption"
                    className="mb-2 text-[10px] @md:text-xs font-bold uppercase tracking-[0.22em] opacity-90"
                  >
                    {data.caption}
                  </p>
                )}
                {data.heading && (
                  <h2
                    data-content-field="heading"
                    className="mb-3 text-2xl @md:text-4xl @lg:text-5xl font-extrabold tracking-tight leading-tight drop-shadow-lg"
                  >
                    {data.heading}
                  </h2>
                )}
                {data.description && (
                  <p
                    data-content-field="description"
                    className="mb-5 text-sm @md:text-base leading-relaxed opacity-95 drop-shadow"
                  >
                    {data.description}
                  </p>
                )}
                {data.ctaLabel && (
                  <CtaButton
                    label={data.ctaLabel}
                    href={data.ctaHref}
                    variant={data.ctaVariant ?? "solid"}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Scrolling text column ───────────────────────────────── */}
        <div
          className={cn(
            "relative w-full h-full min-h-[260px] overflow-hidden",
            scrollOrderClass,
          )}
          style={{
            backgroundColor: "var(--btt-scroll-bg, #dc2626)",
            color: "var(--btt-scroll-text, #ffffff)",
          }}
        >
          {hasScroll ? (
            <VerticalScrollColumn
              items={scrollItems}
              direction={scrollDirection}
              pauseOnHover={pauseOnHover}
              italic={italic}
              uppercase={uppercase}
              ghostOutline={ghostOutline}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs opacity-70">
              Agrega frases para el scroll vertical
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface BannerMediaProps {
  mediaType: "image" | "video";
  imageDesktop: string;
  imageMobile: string;
  videoUrl?: string;
  videoPoster?: string;
  videoAutoplay: boolean;
  alt: string;
}

function BannerMedia({
  mediaType,
  imageDesktop,
  imageMobile,
  videoUrl,
  videoPoster,
  videoAutoplay,
  alt,
}: BannerMediaProps) {
  if (mediaType === "video") {
    const url = videoUrl?.trim();
    if (!url) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-xs text-muted-foreground">
          Sin video
        </div>
      );
    }
    return (
      <video
        src={url}
        poster={videoPoster || undefined}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay={videoAutoplay}
        muted
        loop
        playsInline
        preload={videoAutoplay ? "auto" : "metadata"}
        aria-label={alt || undefined}
      />
    );
  }

  if (!imageDesktop && !imageMobile) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-xs text-muted-foreground">
        Sin imagen
      </div>
    );
  }

  const showSeparateMobile = imageMobile && imageMobile !== imageDesktop;

  return (
    <>
      {showSeparateMobile && (
        <Image
          src={imageMobile}
          alt={alt}
          fill
          sizes="100vw"
          priority
          unoptimized
          className="object-cover @lg:hidden"
        />
      )}
      <Image
        src={imageDesktop || imageMobile}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        priority
        unoptimized
        className={cn(
          "object-cover",
          showSeparateMobile ? "hidden @lg:block" : "",
        )}
      />
    </>
  );
}

interface VerticalScrollColumnProps {
  items: { id: string; text: string }[];
  direction: "up" | "down";
  pauseOnHover: boolean;
  italic: boolean;
  uppercase: boolean;
  ghostOutline: boolean;
}

function VerticalScrollColumn({
  items,
  direction,
  pauseOnHover,
  italic,
  uppercase,
  ghostOutline,
}: VerticalScrollColumnProps) {
  // Duplicate the list so the second copy seamlessly takes over when the
  // first translates by -50%. The keyframe wraps the transform back to 0
  // and the loop is invisible.
  const animationClass =
    direction === "up" ? "animate-marquee-vertical-up" : "animate-marquee-vertical-down";

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        pauseOnHover && "marquee-vertical-paused",
      )}
      // Vertical gradient mask fades items at the top and bottom edges,
      // matching the reference (top items dimmed even before the ghost
      // color kicks in).
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
      }}
    >
      <ul
        className={cn(
          "flex flex-col items-center gap-3 @md:gap-4 will-change-transform select-none",
          "py-4",
          animationClass,
        )}
        aria-hidden="true"
      >
        {[0, 1].map((copy) => (
          <li key={copy} className="flex flex-col items-center gap-3 @md:gap-4">
            {items.map((item, i) => (
              <span
                key={`${copy}-${item.id}`}
                data-content-array={copy === 0 ? "scrollItems" : undefined}
                data-content-index={copy === 0 ? i : undefined}
                className={cn(
                  "block whitespace-nowrap px-4 text-2xl @md:text-3xl @lg:text-4xl font-extrabold leading-tight",
                  italic && "italic",
                  uppercase && "uppercase tracking-wide",
                  ghostOutline && "[-webkit-text-stroke:1px_currentColor] text-transparent",
                )}
              >
                <span data-content-field={copy === 0 ? "text" : undefined}>
                  {item.text}
                </span>
              </span>
            ))}
          </li>
        ))}
      </ul>

      {/* Overlay gradients restore the ghost color of the items at the
          fade edges, mimicking the reference's "outlined / dimmed" look
          for the top and bottom rows. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, var(--btt-scroll-bg, #dc2626) 0%, transparent 22%, transparent 78%, var(--btt-scroll-bg, #dc2626) 100%)",
        }}
      />
    </div>
  );
}

interface CtaButtonProps {
  label: string;
  href?: string;
  variant: BannerTopTextCtaVariant;
}

function CtaButton({ label, href, variant }: CtaButtonProps) {
  const className = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-2.5",
    "text-sm @md:text-base font-bold shadow-lg transition-transform",
    "hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
    CTA_VARIANT_CLASS[variant],
  );

  if (href) {
    return (
      <a
        href={href}
        data-content-field="ctaLabel"
        className={className}
        style={{
          "--btt-cta-text": "var(--btt-scroll-bg, #dc2626)",
        } as CSSProperties}
      >
        {label}
      </a>
    );
  }
  return (
    <button
      type="button"
      data-content-field="ctaLabel"
      className={className}
      style={{
        "--btt-cta-text": "var(--btt-scroll-bg, #dc2626)",
      } as CSSProperties}
    >
      {label}
    </button>
  );
}

function overlayBackground(style: NonNullable<BannerTopTextBlockContent["overlayStyle"]>): string {
  const base = "color-mix(in srgb, var(--btt-overlay-color, #000) var(--btt-overlay-opacity, 35%), transparent)";
  switch (style) {
    case "solid":
      return `linear-gradient(${base}, ${base})`;
    case "gradient-top":
      return `linear-gradient(to bottom, ${base}, transparent)`;
    case "gradient-bottom":
      return `linear-gradient(to top, ${base}, transparent)`;
    case "none":
    default:
      return "none";
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

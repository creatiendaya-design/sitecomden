"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon, Play, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CarouselBlockContent,
  CarouselSlide,
} from "@/lib/types/landing-blocks";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface CarouselBlockProps {
  content: CarouselBlockContent | unknown;
}

const ASPECT_CLASS: Record<NonNullable<CarouselBlockContent["aspectRatio"]>, string> = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  wide: "aspect-[21/9]",
  auto: "",
};

const RADIUS_CLASS: Record<NonNullable<CarouselBlockContent["slideRadius"]>, string> = {
  none: "rounded-none",
  sm: "rounded",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
  "2xl": "rounded-3xl",
};

export default function CarouselBlock({ content: rawContent }: CarouselBlockProps) {
  const data = readContent<CarouselBlockContent>(rawContent, "CAROUSEL");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const slides = useMemo(
    () => (Array.isArray(data.slides) ? data.slides.filter(hasShape) : []),
    [data.slides],
  );

  // Desktop view is fixed at 5 slides (capped by how many slides actually exist).
  // The stored `data.slidesPerViewDesktop` field is intentionally ignored so
  // blocks created with earlier defaults (where this was persisted as 1 or 3)
  // still render correctly without manual migration.
  const slidesPerViewDesktop = clamp(Math.min(5, Math.max(1, slides.length)), 1, 5) as 1 | 2 | 3 | 4 | 5;
  const slidesPerViewTablet = clamp(data.slidesPerViewTablet ?? 3, 1, 3) as 1 | 2 | 3;
  const slidesPerViewMobile = clamp(data.slidesPerViewMobile ?? 2, 1, 3) as 1 | 2 | 3;
  const autoplayMs = Number.isFinite(data.autoplayMs) ? Math.max(0, data.autoplayMs ?? 0) : 0;
  const loop = data.loop ?? true;
  const pauseOnHover = data.pauseOnHover ?? true;
  const transition = data.transition ?? "slide";
  const showArrows = data.showArrows ?? true;
  const arrowStyle = data.arrowStyle ?? "circle";
  const dotStyle = data.dotStyle ?? "dots";
  const aspectRatio = data.aspectRatio ?? "video";
  const gap = clamp(data.gap ?? 16, 0, 64);
  const slideRadius = data.slideRadius ?? "xl";
  const textOverlayEnabled = data.textOverlayEnabled ?? true;

  const sectionStyle: CSSProperties = { ...inlineStyle };
  const optionalVars: Array<[string, string | undefined]> = [
    ["--carousel-arrow-bg", data.arrowBgColor],
    ["--carousel-arrow-color", data.arrowColor],
    ["--carousel-dot-active", data.dotActiveColor],
    ["--carousel-dot-inactive", data.dotInactiveColor],
  ];
  for (const [name, value] of optionalVars) {
    if (value) (sectionStyle as Record<string, string>)[name] = value;
  }

  if (slides.length === 0 && !data.heading && !data.caption && !data.description) {
    return null;
  }

  return (
    <section
      className={cn("landing-section py-10 @md:py-14 @container", styleClass)}
      style={sectionStyle}
    >
      <div className="container mx-auto px-4">
        {(data.caption || data.heading || data.description) && (
          <header className="mx-auto mb-6 @md:mb-10 max-w-3xl text-center">
            {data.caption && (
              <p
                data-content-field="caption"
                className="mb-2 text-xs @md:text-sm font-bold uppercase tracking-[0.18em] opacity-80"
              >
                {data.caption}
              </p>
            )}
            {data.heading && (
              <h2
                data-content-field="heading"
                className="text-2xl @md:text-3xl @lg:text-4xl font-extrabold tracking-tight"
              >
                {data.heading}
              </h2>
            )}
            {data.description && (
              <p
                data-content-field="description"
                className="mt-3 text-sm @md:text-base opacity-80"
              >
                {data.description}
              </p>
            )}
          </header>
        )}

        {slides.length > 0 && (
          <Carousel
            slides={slides}
            slidesPerViewDesktop={slidesPerViewDesktop}
            slidesPerViewTablet={slidesPerViewTablet}
            slidesPerViewMobile={slidesPerViewMobile}
            autoplayMs={autoplayMs}
            loop={loop}
            pauseOnHover={pauseOnHover}
            transition={transition}
            showArrows={showArrows}
            arrowStyle={arrowStyle}
            dotStyle={dotStyle}
            aspectRatio={aspectRatio}
            gap={gap}
            slideRadius={slideRadius}
            textOverlayEnabled={textOverlayEnabled}
          />
        )}
      </div>
    </section>
  );
}

interface CarouselInnerProps {
  slides: CarouselSlide[];
  slidesPerViewDesktop: 1 | 2 | 3 | 4 | 5;
  slidesPerViewTablet: 1 | 2 | 3;
  slidesPerViewMobile: 1 | 2 | 3;
  autoplayMs: number;
  loop: boolean;
  pauseOnHover: boolean;
  transition: NonNullable<CarouselBlockContent["transition"]>;
  showArrows: boolean;
  arrowStyle: NonNullable<CarouselBlockContent["arrowStyle"]>;
  dotStyle: NonNullable<CarouselBlockContent["dotStyle"]>;
  aspectRatio: NonNullable<CarouselBlockContent["aspectRatio"]>;
  gap: number;
  slideRadius: NonNullable<CarouselBlockContent["slideRadius"]>;
  textOverlayEnabled: boolean;
}

function Carousel({
  slides,
  slidesPerViewDesktop,
  slidesPerViewTablet,
  slidesPerViewMobile,
  autoplayMs,
  loop,
  pauseOnHover,
  transition,
  showArrows,
  arrowStyle,
  dotStyle,
  aspectRatio,
  gap,
  slideRadius,
  textOverlayEnabled,
}: CarouselInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const perView = useResponsivePerView(containerRef, {
    desktop: slidesPerViewDesktop,
    tablet: slidesPerViewTablet,
    mobile: slidesPerViewMobile,
  });

  const total = slides.length;
  const maxIndex = Math.max(0, total - perView);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      if (loop) {
        const wrapped = ((next % total) + total) % total;
        setIndex(Math.min(wrapped, maxIndex));
      } else {
        setIndex(Math.max(0, Math.min(next, maxIndex)));
      }
    },
    [loop, maxIndex, total],
  );

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 > maxIndex) return loop ? 0 : i;
      return i + 1;
    });
  }, [loop, maxIndex]);

  const prev = useCallback(() => {
    setIndex((i) => {
      if (i - 1 < 0) return loop ? maxIndex : 0;
      return i - 1;
    });
  }, [loop, maxIndex]);

  useEffect(() => {
    if (autoplayMs <= 0) return;
    if (pauseOnHover && hovered) return;
    if (total <= perView && !loop) return;
    const id = window.setInterval(next, autoplayMs);
    return () => window.clearInterval(id);
  }, [autoplayMs, hovered, loop, next, pauseOnHover, perView, total]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = (e.touches[0]?.clientX ?? 0) - touchStartX.current;
  };
  const onTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > 40) {
      if (touchDeltaX.current < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  };

  const showControls = total > perView;
  const pages = total <= perView ? 1 : maxIndex + 1;
  const activePage = Math.min(index, pages - 1);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none focus:outline-none"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Carrusel"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKeyDown}
    >
      {transition === "fade" && perView === 1 ? (
        <FadeTrack
          slides={slides}
          index={index}
          aspectRatio={aspectRatio}
          slideRadius={slideRadius}
          textOverlayEnabled={textOverlayEnabled}
        />
      ) : (
        <SlideTrack
          slides={slides}
          index={index}
          perView={perView}
          gap={gap}
          aspectRatio={aspectRatio}
          slideRadius={slideRadius}
          textOverlayEnabled={textOverlayEnabled}
        />
      )}

      {showArrows && showControls && (
        <>
          <CarouselArrow
            direction="prev"
            style={arrowStyle}
            disabled={!loop && index === 0}
            onClick={prev}
          />
          <CarouselArrow
            direction="next"
            style={arrowStyle}
            disabled={!loop && index >= maxIndex}
            onClick={next}
          />
        </>
      )}

      {dotStyle !== "none" && pages > 1 && (
        <CarouselDots
          count={pages}
          activeIndex={activePage}
          variant={dotStyle}
          onSelect={goTo}
        />
      )}
    </div>
  );
}

interface SlideTrackProps {
  slides: CarouselSlide[];
  index: number;
  perView: number;
  gap: number;
  aspectRatio: NonNullable<CarouselBlockContent["aspectRatio"]>;
  slideRadius: NonNullable<CarouselBlockContent["slideRadius"]>;
  textOverlayEnabled: boolean;
}

function SlideTrack({
  slides,
  index,
  perView,
  gap,
  aspectRatio,
  slideRadius,
  textOverlayEnabled,
}: SlideTrackProps) {
  const trackStyle: CSSProperties = {
    transform: `translate3d(calc(${-index} * (100% / ${perView}) - ${
      index === 0 ? 0 : (gap * index) / perView
    }px), 0, 0)`,
    transition: "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
    gap: `${gap}px`,
  };

  return (
    <div className="overflow-hidden">
      <div className="flex w-full" style={trackStyle}>
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            data-content-array="slides"
            data-content-index={i}
            className="shrink-0"
            style={{ flex: `0 0 calc((100% - ${gap * (perView - 1)}px) / ${perView})` }}
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${slides.length}`}
          >
            <SlideMedia
              slide={slide}
              aspectRatio={aspectRatio}
              slideRadius={slideRadius}
              textOverlayEnabled={textOverlayEnabled}
              eager={i < perView + 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface FadeTrackProps {
  slides: CarouselSlide[];
  index: number;
  aspectRatio: NonNullable<CarouselBlockContent["aspectRatio"]>;
  slideRadius: NonNullable<CarouselBlockContent["slideRadius"]>;
  textOverlayEnabled: boolean;
}

function FadeTrack({
  slides,
  index,
  aspectRatio,
  slideRadius,
  textOverlayEnabled,
}: FadeTrackProps) {
  return (
    <div className={cn("relative", aspectRatio !== "auto" && ASPECT_CLASS[aspectRatio])}>
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={slide.id}
            data-content-array="slides"
            data-content-index={i}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-out",
              active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
            )}
            aria-hidden={!active}
            aria-roledescription="slide"
          >
            <SlideMedia
              slide={slide}
              aspectRatio="auto"
              slideRadius={slideRadius}
              textOverlayEnabled={textOverlayEnabled}
              fillParent
              eager={i === 0}
            />
          </div>
        );
      })}
    </div>
  );
}

interface SlideMediaProps {
  slide: CarouselSlide;
  aspectRatio: NonNullable<CarouselBlockContent["aspectRatio"]>;
  slideRadius: NonNullable<CarouselBlockContent["slideRadius"]>;
  textOverlayEnabled: boolean;
  eager?: boolean;
  fillParent?: boolean;
}

function SlideMedia({
  slide,
  aspectRatio,
  slideRadius,
  textOverlayEnabled,
  eager = false,
  fillParent = false,
}: SlideMediaProps) {
  const hasOverlay =
    textOverlayEnabled && (slide.title || slide.caption || slide.ctaLabel);

  const innerClass = cn(
    "group relative overflow-hidden bg-black/5",
    RADIUS_CLASS[slideRadius],
    fillParent ? "absolute inset-0" : "w-full",
    !fillParent && aspectRatio !== "auto" && ASPECT_CLASS[aspectRatio],
  );

  const Wrapper = slide.ctaHref && !slide.ctaLabel ? "a" : "div";
  const wrapperProps =
    Wrapper === "a"
      ? { href: slide.ctaHref, "aria-label": slide.alt || slide.title || "Slide" }
      : {};

  return (
    <Wrapper className={innerClass} {...wrapperProps}>
      <SlideAsset slide={slide} eager={eager} />

      {hasOverlay && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
      )}

      {(slide.title || slide.caption || slide.ctaLabel) && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-5 @md:p-7 text-white">
          {slide.caption && (
            <p
              data-content-field="caption"
              className="text-[10px] @md:text-xs font-bold uppercase tracking-[0.2em] opacity-90"
            >
              {slide.caption}
            </p>
          )}
          {slide.title && (
            <h3
              data-content-field="title"
              className="text-lg @md:text-2xl @lg:text-3xl font-extrabold leading-tight drop-shadow"
            >
              {slide.title}
            </h3>
          )}
          {slide.ctaLabel && slide.ctaHref && (
            <a
              href={slide.ctaHref}
              data-content-field="ctaLabel"
              className="pointer-events-auto mt-1 inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs @md:text-sm font-semibold text-black shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
            >
              {slide.ctaLabel}
            </a>
          )}
        </div>
      )}
    </Wrapper>
  );
}

function SlideAsset({ slide, eager }: { slide: CarouselSlide; eager: boolean }) {
  if (slide.type === "video") {
    return <SlideVideo slide={slide} eager={eager} />;
  }
  return <SlideImage slide={slide} eager={eager} />;
}

function SlideImage({ slide, eager }: { slide: CarouselSlide; eager: boolean }) {
  const desktop = slide.imageUrl?.trim();
  const mobile = slide.imageUrlMobile?.trim() || desktop;
  if (!desktop && !mobile) {
    return <EmptySlidePlaceholder />;
  }
  const url = desktop ?? mobile ?? "";

  return (
    <>
      {/* Mobile-first image (small viewports) */}
      {mobile && mobile !== desktop && (
        <Image
          src={mobile}
          alt={slide.alt ?? ""}
          fill
          sizes="100vw"
          loading={eager ? "eager" : "lazy"}
          priority={eager}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03] @md:hidden"
          unoptimized
        />
      )}
      <Image
        src={url}
        alt={slide.alt ?? ""}
        fill
        sizes="(min-width: 1024px) 80vw, 100vw"
        loading={eager ? "eager" : "lazy"}
        priority={eager}
        className={cn(
          "object-cover transition-transform duration-500 group-hover:scale-[1.03]",
          mobile && mobile !== desktop ? "hidden @md:block" : "",
        )}
        unoptimized
      />
    </>
  );
}

function SlideVideo({ slide, eager }: { slide: CarouselSlide; eager: boolean }) {
  const provider = slide.videoProvider ?? "upload";
  const url = slide.videoUrl?.trim();
  if (!url) {
    return <EmptySlidePlaceholder icon="video" />;
  }

  if (provider === "youtube" || provider === "vimeo") {
    const embed = getEmbedUrl(url, provider);
    return (
      <iframe
        src={embed}
        title={slide.alt ?? "Video"}
        loading={eager ? "eager" : "lazy"}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    );
  }

  return (
    <VideoPlayer
      url={url}
      poster={slide.videoPoster}
      alt={slide.alt}
      eager={eager}
    />
  );
}

function VideoPlayer({
  url,
  poster,
  alt,
  eager,
}: {
  url: string;
  poster?: string;
  alt?: string;
  eager: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const handleStart = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.play().then(() => setPlaying(true)).catch(() => undefined);
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        src={url}
        poster={poster}
        preload={eager ? "metadata" : "none"}
        playsInline
        muted
        loop
        aria-label={alt}
        className="absolute inset-0 h-full w-full object-cover"
        onClick={handleStart}
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <button
          type="button"
          onClick={handleStart}
          aria-label="Reproducir video"
          className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/15"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-xl">
            <Play className="h-6 w-6 translate-x-0.5 text-black" />
          </span>
        </button>
      )}
    </>
  );
}

function CarouselArrow({
  direction,
  style,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  style: NonNullable<CarouselBlockContent["arrowStyle"]>;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const base =
    "absolute top-1/2 z-20 -translate-y-1/2 flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80";
  const placement = direction === "prev" ? "left-2 @md:left-3" : "right-2 @md:right-3";
  const sizing =
    style === "minimal"
      ? "h-9 w-9"
      : "h-10 w-10 @md:h-12 @md:w-12";
  const variant =
    style === "circle"
      ? "rounded-full shadow-lg"
      : style === "square"
        ? "rounded-md shadow-md"
        : "rounded-full";

  const inlineStyle: CSSProperties = {};
  if (style !== "minimal") {
    inlineStyle.backgroundColor = "var(--carousel-arrow-bg, rgba(0,0,0,0.55))";
    inlineStyle.color = "var(--carousel-arrow-color, #ffffff)";
  } else {
    inlineStyle.color = "var(--carousel-arrow-color, #ffffff)";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Anterior" : "Siguiente"}
      style={inlineStyle}
      className={cn(
        base,
        placement,
        sizing,
        variant,
        "hover:scale-105 active:scale-95",
        disabled && "opacity-30 pointer-events-none",
      )}
    >
      <Icon className="h-5 w-5 @md:h-6 @md:w-6" strokeWidth={3} />
    </button>
  );
}

function CarouselDots({
  count,
  activeIndex,
  variant,
  onSelect,
}: {
  count: number;
  activeIndex: number;
  variant: "dots" | "bars";
  onSelect: (i: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => {
        const active = i === activeIndex;
        const base =
          "transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded-full";
        const shape =
          variant === "bars"
            ? cn("h-1.5", active ? "w-8" : "w-4")
            : cn("h-2", active ? "w-2.5" : "w-2");
        const inline: CSSProperties = {
          backgroundColor: active
            ? "var(--carousel-dot-active, currentColor)"
            : "var(--carousel-dot-inactive, rgba(0,0,0,0.25))",
        };
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Ir al slide ${i + 1}`}
            aria-current={active ? "true" : undefined}
            className={cn(base, shape)}
            style={inline}
          />
        );
      })}
    </div>
  );
}

/**
 * Two-tier responsive: anything under 640px (real phones) uses the mobile
 * count, anything ≥ 640px uses the desktop count exactly as the admin
 * configured it — no auto-degradation through an intermediate "tablet"
 * value. The legacy `slidesPerViewTablet` is accepted in the schema but
 * intentionally not consumed here, so the configured desktop value always
 * applies on any non-phone viewport.
 */
function useResponsivePerView(
  _ref: React.RefObject<HTMLElement | null>,
  config: { desktop: number; tablet: number; mobile: number },
) {
  const [perView, setPerView] = useState(config.desktop);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      const w = window.innerWidth;
      setPerView(w < 640 ? config.mobile : config.desktop);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [config.desktop, config.tablet, config.mobile]);
  return perView;
}

function EmptySlidePlaceholder({ icon = "image" }: { icon?: "image" | "video" }) {
  const Icon = icon === "video" ? Video : ImageIcon;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted/30 text-muted-foreground/70"
    >
      <Icon className="h-8 w-8 @md:h-10 @md:w-10" strokeWidth={1.5} />
    </div>
  );
}

/**
 * Keep slides that have at least an id, even when the admin hasn't uploaded
 * the media yet — we render an empty placeholder so the layout reflects the
 * configured slide count immediately. Filtering by media presence would hide
 * the just-added slides and make the editor look broken.
 */
function hasShape(slide: unknown): slide is CarouselSlide {
  if (!slide || typeof slide !== "object") return false;
  const s = slide as Partial<CarouselSlide>;
  return Boolean(s.id);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getEmbedUrl(url: string, provider: "youtube" | "vimeo"): string {
  if (provider === "youtube") {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1&playsinline=1`;
    }
    return url;
  }
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (match) {
    return `https://player.vimeo.com/video/${match[1]}?dnt=1&title=0&byline=0&portrait=0`;
  }
  return url;
}

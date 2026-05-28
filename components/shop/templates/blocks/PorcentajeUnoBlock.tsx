"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type {
  PorcentajeUnoBlockContent,
  PorcentajeUnoCurveStrength,
  PorcentajeUnoHotspot,
  PorcentajeUnoNumberWeight,
  PorcentajeUnoStat,
} from "@/lib/types/landing-blocks";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface PorcentajeUnoBlockProps {
  content: PorcentajeUnoBlockContent | unknown;
}

const CURVE_STRENGTH: Record<PorcentajeUnoCurveStrength, string> = {
  none: "0px",
  subtle: "24px",
  normal: "48px",
  strong: "80px",
};

const NUMBER_WEIGHT_CLASS: Record<PorcentajeUnoNumberWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export default function PorcentajeUnoBlock({ content: rawContent }: PorcentajeUnoBlockProps) {
  const data = readContent<PorcentajeUnoBlockContent>(rawContent, "PORCENTAJE_UNO");
  const { style: blockStyle, media } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const stats = (data.stats ?? []).filter(
    (s) => s && typeof s.value === "number" && Number.isFinite(s.value),
  );
  const hotspots = (data.hotspots ?? []).filter(
    (h) =>
      h &&
      typeof h.x === "number" &&
      typeof h.y === "number" &&
      (h.title || h.description),
  );

  const image = media?.image as { desktop?: string; mobile?: string } | undefined;
  const imageDesktop = image?.desktop?.trim() || image?.mobile?.trim() || "";
  const imageMobile = image?.mobile?.trim() || imageDesktop;

  const mediaPosition = data.mediaPosition ?? "left";
  const curveStrength = data.curveStrength ?? "normal";
  const numberWeight = data.numberWeight ?? "bold";
  const countDurationMs = clamp(data.countDurationMs ?? 1800, 200, 8000);

  if (stats.length === 0 && !data.heading && !imageDesktop) return null;

  const sectionStyle: CSSProperties = { ...inlineStyle };
  const cssVars: Array<[string, string | undefined]> = [
    ["--pu-number-color", data.numberColor],
    ["--pu-text-color", data.statTextColor],
    ["--pu-divider", data.dividerColor],
    ["--pu-hotspot", data.hotspotColor],
    ["--pu-hotspot-ring", data.hotspotRingColor],
    ["--pu-curve", CURVE_STRENGTH[curveStrength]],
  ];
  for (const [name, value] of cssVars) {
    if (value !== undefined && value !== "") {
      (sectionStyle as Record<string, string>)[name] = value;
    }
  }

  // Curved (oval) top + bottom edges. We use a percentage-based radius on
  // the horizontal axis paired with a fixed px on the vertical axis — this
  // produces a flat ellipse that hugs the page width on any viewport.
  const curveStyle: CSSProperties = {
    borderTopLeftRadius: `50% var(--pu-curve, 48px)`,
    borderTopRightRadius: `50% var(--pu-curve, 48px)`,
    borderBottomLeftRadius: `50% var(--pu-curve, 48px)`,
    borderBottomRightRadius: `50% var(--pu-curve, 48px)`,
  };

  return (
    <section
      className={cn("landing-section @container", styleClass)}
      style={sectionStyle}
    >
      <div
        className="relative overflow-hidden"
        style={curveStyle}
      >
        <div className="container mx-auto px-4 @md:px-8 py-14 @md:py-20 @lg:py-24">
          <div
            className={cn(
              "grid grid-cols-1 @lg:grid-cols-2 gap-10 @lg:gap-16 items-center",
            )}
          >
            {/* ─── Image column with hotspots ─────────────────────── */}
            <div
              className={cn(
                "relative w-full",
                mediaPosition === "right" ? "@lg:order-2" : "@lg:order-1",
              )}
            >
              <ImageWithHotspots
                imageDesktop={imageDesktop}
                imageMobile={imageMobile}
                alt={data.imageAlt ?? ""}
                hotspots={hotspots}
              />
            </div>

            {/* ─── Stats column ───────────────────────────────────── */}
            <div
              className={cn(
                "flex flex-col",
                mediaPosition === "right" ? "@lg:order-1" : "@lg:order-2",
              )}
            >
              {(data.caption || data.heading) && (
                <header className="mb-6 @md:mb-8">
                  {data.caption && (
                    <p
                      data-content-field="caption"
                      className="mb-2 text-[10px] @md:text-xs font-bold uppercase tracking-[0.22em] opacity-70"
                      style={{ color: "var(--pu-text-color, currentColor)" }}
                    >
                      {data.caption}
                    </p>
                  )}
                  {data.heading && (
                    <h2
                      data-content-field="heading"
                      className="text-2xl @md:text-3xl @lg:text-[2rem] font-semibold tracking-tight leading-tight"
                      style={{ color: "var(--pu-text-color, currentColor)" }}
                    >
                      {data.heading}
                    </h2>
                  )}
                </header>
              )}

              <ul
                className="flex flex-col divide-y"
                style={{
                  borderColor: "var(--pu-divider, rgba(255,255,255,0.12))",
                }}
              >
                {/* Top hairline so it matches the reference (line ABOVE the
                    first stat too). */}
                <li
                  aria-hidden="true"
                  className="h-px border-0"
                  style={{
                    backgroundColor: "var(--pu-divider, rgba(255,255,255,0.12))",
                  }}
                />
                {stats.map((stat, i) => (
                  <StatRow
                    key={stat.id}
                    stat={stat}
                    index={i}
                    durationMs={countDurationMs}
                    numberWeightClass={NUMBER_WEIGHT_CLASS[numberWeight]}
                  />
                ))}
              </ul>

              {data.footnote && (
                <p
                  data-content-field="footnote"
                  className="mt-6 @md:mt-8 text-xs @md:text-sm opacity-65 leading-relaxed"
                  style={{ color: "var(--pu-text-color, currentColor)" }}
                >
                  {data.footnote}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Stat row — one line of "<big number><suffix>  <description>"
// ────────────────────────────────────────────────────────────────────────

interface StatRowProps {
  stat: PorcentajeUnoStat;
  index: number;
  durationMs: number;
  numberWeightClass: string;
}

function StatRow({ stat, index, durationMs, numberWeightClass }: StatRowProps) {
  const rowRef = useRef<HTMLLIElement | null>(null);
  const value = useAnimatedCount(stat.value, durationMs, rowRef);
  return (
    <li
      ref={rowRef}
      data-content-array="stats"
      data-content-index={index}
      className="grid grid-cols-[minmax(0,9rem)_1fr] @md:grid-cols-[minmax(0,11rem)_1fr] items-start gap-5 @md:gap-8 py-6 @md:py-8"
    >
      <div className="flex items-baseline">
        {stat.prefix && (
          <span
            className={cn(
              "text-3xl @md:text-4xl @lg:text-5xl opacity-90 mr-1",
              numberWeightClass,
            )}
            style={{ color: "var(--pu-number-color, #9eb4d4)" }}
          >
            {stat.prefix}
          </span>
        )}
        <span
          className={cn(
            "tabular-nums leading-none",
            "text-4xl @md:text-5xl @lg:text-6xl",
            numberWeightClass,
          )}
          style={{ color: "var(--pu-number-color, #9eb4d4)" }}
          aria-label={`${stat.value}${stat.suffix ?? ""}`}
        >
          {value}
        </span>
        {stat.suffix && (
          <span
            className={cn(
              "text-3xl @md:text-4xl @lg:text-5xl ml-0.5",
              numberWeightClass,
            )}
            style={{ color: "var(--pu-number-color, #9eb4d4)" }}
          >
            {stat.suffix}
          </span>
        )}
      </div>
      <p
        className="text-sm @md:text-base leading-relaxed opacity-90"
        style={{ color: "var(--pu-text-color, currentColor)" }}
      >
        {stat.highlight && (
          <strong
            data-content-field="highlight"
            className="font-bold opacity-100"
          >
            {stat.highlight}
          </strong>
        )}
        {stat.highlight && stat.description && " "}
        <span data-content-field="description">{stat.description}</span>
      </p>
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Image with absolutely-positioned hotspots (CSS-only hover tooltip)
// ────────────────────────────────────────────────────────────────────────

interface ImageWithHotspotsProps {
  imageDesktop: string;
  imageMobile: string;
  alt: string;
  hotspots: PorcentajeUnoHotspot[];
}

function ImageWithHotspots({
  imageDesktop,
  imageMobile,
  alt,
  hotspots,
}: ImageWithHotspotsProps) {
  return (
    <div className="relative w-full aspect-[4/3] @md:aspect-square @lg:aspect-[4/3]">
      {imageDesktop || imageMobile ? (
        <>
          {imageMobile && imageMobile !== imageDesktop && (
            <Image
              src={imageMobile}
              alt={alt}
              fill
              sizes="100vw"
              className="object-contain @lg:hidden"
              unoptimized
              loading="lazy"
            />
          )}
          <Image
            src={imageDesktop || imageMobile}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className={cn(
              "object-contain",
              imageMobile && imageMobile !== imageDesktop ? "hidden @lg:block" : "",
            )}
            unoptimized
            loading="lazy"
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs opacity-60">
          Agrega una imagen
        </div>
      )}

      {/* Hotspots layered on top of the image */}
      {hotspots.map((h, i) => (
        <Hotspot key={h.id} hotspot={h} index={i} />
      ))}
    </div>
  );
}

interface HotspotProps {
  hotspot: PorcentajeUnoHotspot;
  index: number;
}

function Hotspot({ hotspot, index }: HotspotProps) {
  const x = clamp(hotspot.x, 0, 100);
  const y = clamp(hotspot.y, 0, 100);
  // Pin the tooltip on the side with more room so it never gets clipped.
  const flipX = x > 60;
  const flipY = y > 60;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 group/hotspot"
      style={{ left: `${x}%`, top: `${y}%` }}
      data-content-array="hotspots"
      data-content-index={index}
    >
      {/* Button — receives focus + hover. Uses tabIndex so keyboard users
          can open the tooltip too (focus-within on the wrapper). */}
      <button
        type="button"
        className={cn(
          "relative block h-4 w-4 @md:h-5 @md:w-5 rounded-full cursor-help",
          "transition-transform duration-200 hover:scale-110 focus:scale-110",
          "outline-none focus-visible:ring-2 focus-visible:ring-white/80",
        )}
        style={{ backgroundColor: "var(--pu-hotspot, rgba(255,255,255,0.92))" }}
        aria-label={hotspot.title || "Información del producto"}
        aria-describedby={`pu-tip-${hotspot.id}`}
      >
        {/* Concentric pulse ring */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 rounded-full animate-pulse",
            "ring-4",
          )}
          style={{
            // ring color via box-shadow because Tailwind's ring uses
            // ring color tokens we don't want to leak.
            boxShadow:
              "0 0 0 6px var(--pu-hotspot-ring, rgba(255,255,255,0.25))",
          }}
        />
      </button>

      {/* Tooltip card — CSS-only show on hover/focus-within of the parent. */}
      <div
        id={`pu-tip-${hotspot.id}`}
        role="tooltip"
        className={cn(
          "absolute z-20 w-64 @md:w-72 p-4 @md:p-5 rounded-xl shadow-2xl",
          "bg-white text-slate-900",
          "opacity-0 invisible scale-95 translate-y-1",
          "transition-all duration-200 ease-out",
          "group-hover/hotspot:opacity-100 group-hover/hotspot:visible group-hover/hotspot:scale-100 group-hover/hotspot:translate-y-0",
          "group-focus-within/hotspot:opacity-100 group-focus-within/hotspot:visible group-focus-within/hotspot:scale-100 group-focus-within/hotspot:translate-y-0",
          // Position around the dot, flipping when near the edges.
          flipX ? "right-6" : "left-6",
          flipY ? "bottom-6" : "top-6",
        )}
      >
        {hotspot.title && (
          <h3
            data-content-field="title"
            className="text-sm @md:text-base font-bold text-center mb-2 text-slate-900"
          >
            {hotspot.title}
          </h3>
        )}
        {hotspot.description && (
          <p
            data-content-field="description"
            className="text-xs @md:text-sm leading-relaxed text-slate-700 text-center"
          >
            {hotspot.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// useAnimatedCount — counts from 0 → target with easeOutQuart,
// activates once the element scrolls into view, respects reduced-motion.
// Animation runs ONCE per mount (re-targeting resets it).
// ────────────────────────────────────────────────────────────────────────

function useAnimatedCount(
  target: number,
  durationMs: number,
  ref: React.RefObject<HTMLElement | null>,
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let rafId = 0;
    let started = false;

    const run = () => {
      if (started) return;
      started = true;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / durationMs);
        const eased = 1 - Math.pow(1 - progress, 4);
        setValue(Math.round(target * eased));
        if (progress < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    };

    // Fallback when IntersectionObserver isn't available (older runtimes,
    // SSR-only tests, etc.) — start immediately.
    if (!el || typeof IntersectionObserver === "undefined") {
      run();
      return () => cancelAnimationFrame(rafId);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      io.disconnect();
    };
  }, [target, durationMs, ref]);

  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

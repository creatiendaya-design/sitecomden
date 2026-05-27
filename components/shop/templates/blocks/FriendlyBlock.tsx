"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FriendlyBlockContent } from "@/lib/types/landing-blocks";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface FriendlyBlockProps {
  content: FriendlyBlockContent | unknown;
}

export default function FriendlyBlock({ content: rawContent }: FriendlyBlockProps) {
  const data = readContent<FriendlyBlockContent>(rawContent, "FRIENDLY");
  const { style: blockStyle, media } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const image = media?.image as { desktop?: string; mobile?: string } | undefined;
  const imageUrl = image?.desktop ?? image?.mobile;

  const features = data.features ?? [];
  const position = data.imagePosition ?? "right";
  const columnsDesktop = data.columnsDesktop ?? 2;

  const sectionStyle: React.CSSProperties = { ...inlineStyle };
  const cssVars: Array<[string, string | undefined]> = [
    ["--block-icon-bg", data.iconBgColor],
    ["--block-icon-color", data.iconColor],
    ["--block-feature-title", data.featureTitleColor],
    ["--block-feature-desc", data.featureDescriptionColor],
  ];
  for (const [name, value] of cssVars) {
    if (value) (sectionStyle as Record<string, string>)[name] = value;
  }

  if (features.length === 0 && !imageUrl && !data.heading) return null;

  const featureGridClass =
    columnsDesktop === 1
      ? "grid grid-cols-1 gap-x-8 gap-y-6 @md:gap-y-8"
      : "grid grid-cols-1 @sm:grid-cols-2 gap-x-8 gap-y-6 @md:gap-y-8";

  return (
    <section
      className={cn("landing-section py-10 @md:py-16 @container", styleClass)}
      style={sectionStyle}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            "grid grid-cols-1 @3xl:grid-cols-2 items-center",
            "gap-8 @md:gap-12 @3xl:gap-16",
          )}
        >
          {/* ─── Text column ─────────────────────────────────────── */}
          <div className={cn(position === "right" ? "@3xl:order-1" : "@3xl:order-2")}>
            {data.caption && (
              <p
                data-content-field="caption"
                className="mb-3 text-xs @md:text-sm font-bold uppercase tracking-[0.18em] opacity-80"
              >
                {data.caption}
              </p>
            )}
            {data.heading && (
              <h2
                data-content-field="heading"
                className="mb-3 text-2xl @md:text-3xl @lg:text-4xl font-extrabold tracking-tight"
              >
                {data.heading}
              </h2>
            )}
            {data.description && (
              <p
                data-content-field="description"
                className="mb-6 @md:mb-8 text-sm @md:text-base opacity-80 max-w-prose"
              >
                {data.description}
              </p>
            )}

            <div className={featureGridClass}>
              {features.map((feature) => (
                <div key={feature.id} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center justify-center",
                      "h-6 w-6 @md:h-7 @md:w-7 rounded-full mt-0.5",
                    )}
                    style={{
                      backgroundColor: "var(--block-icon-bg, #dc2626)",
                      color: "var(--block-icon-color, #ffffff)",
                    }}
                    aria-hidden="true"
                  >
                    <CheckCircle2
                      className="h-4 w-4 @md:h-5 @md:w-5"
                      strokeWidth={2.5}
                      style={{ color: "currentColor" }}
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-base @md:text-lg font-bold leading-snug"
                      style={{
                        color: "var(--block-feature-title, currentColor)",
                      }}
                    >
                      {feature.title}
                    </h3>
                    {feature.description && (
                      <p
                        className="mt-1.5 text-sm @md:text-base leading-relaxed opacity-80"
                        style={{
                          color: "var(--block-feature-desc, currentColor)",
                        }}
                      >
                        {feature.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Image column ────────────────────────────────────── */}
          <div className={cn(position === "right" ? "@3xl:order-2" : "@3xl:order-1")}>
            <div
              className={cn(
                "relative w-full aspect-square @md:aspect-[4/3] @3xl:aspect-square",
                "rounded-2xl overflow-hidden",
              )}
            >
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={data.imageAlt ?? ""}
                  fill
                  className="object-contain"
                  unoptimized
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
              ) : (
                <div className="absolute inset-0 bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
                  Sin imagen
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

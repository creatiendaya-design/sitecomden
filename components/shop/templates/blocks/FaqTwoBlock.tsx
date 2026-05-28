"use client";

import Image from "next/image";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus, Check } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type {
  FaqTwoBlockContent,
  FaqTwoCurveStrength,
  FaqTwoExpert,
  FaqTwoHeadingSize,
  FaqTwoItemGap,
} from "@/lib/types/landing-blocks";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface FaqTwoBlockProps {
  content: FaqTwoBlockContent | unknown;
}

const CURVE_STRENGTH: Record<FaqTwoCurveStrength, string> = {
  none: "0px",
  subtle: "20px",
  normal: "44px",
  strong: "72px",
};

const HEADING_SIZE_CLASS: Record<FaqTwoHeadingSize, string> = {
  md: "text-2xl @md:text-3xl @lg:text-[2rem]",
  lg: "text-3xl @md:text-4xl @lg:text-[2.75rem]",
  xl: "text-4xl @md:text-5xl @lg:text-6xl",
};

const GAP_CLASS: Record<FaqTwoItemGap, string> = {
  tight: "gap-y-0",
  normal: "gap-y-1",
  relaxed: "gap-y-3",
};

export default function FaqTwoBlock({ content: rawContent }: FaqTwoBlockProps) {
  const data = readContent<FaqTwoBlockContent>(rawContent, "FAQ_TWO");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const items = (data.items ?? []).filter((it) => it && (it.question || it.answer));
  const experts = (data.experts ?? []).filter((e) => e && (e.imageUrl || e.alt));

  if (items.length === 0 && !data.title && !data.description) return null;

  const headingSize = data.headingSize ?? "lg";
  const curveStrength = data.curveStrength ?? "normal";
  const gap = data.itemGap ?? "normal";

  const sectionStyle: CSSProperties = { ...inlineStyle };
  const cssVars: Array<[string, string | undefined]> = [
    ["--faq2-bg", data.sectionBgColor],
    ["--faq2-title", data.titleColor],
    ["--faq2-text", data.textColor],
    ["--faq2-badge-bg", data.expertsBadgeBgColor],
    ["--faq2-verified", data.verifiedBadgeColor],
    ["--faq2-item-text", data.itemTextColor],
    ["--faq2-divider", data.dividerColor],
    ["--faq2-icon", data.iconColor],
    ["--faq2-curve", CURVE_STRENGTH[curveStrength]],
  ];
  for (const [name, value] of cssVars) {
    if (value !== undefined && value !== "") {
      (sectionStyle as Record<string, string>)[name] = value;
    }
  }

  const ovalShape: CSSProperties = {
    borderTopLeftRadius: `50% var(--faq2-curve, 44px)`,
    borderTopRightRadius: `50% var(--faq2-curve, 44px)`,
    borderBottomLeftRadius: `50% var(--faq2-curve, 44px)`,
    borderBottomRightRadius: `50% var(--faq2-curve, 44px)`,
  };

  const firstId = items[0]?.id;
  const accordionProps = data.allowMultipleOpen
    ? ({
        type: "multiple" as const,
        defaultValue: data.defaultOpenFirst && firstId ? [firstId] : [],
      })
    : ({
        type: "single" as const,
        collapsible: true,
        defaultValue: data.defaultOpenFirst && firstId ? firstId : undefined,
      });

  const jsonLd = items.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }
    : null;

  return (
    <section
      className={cn("landing-section @container", styleClass)}
      style={sectionStyle}
    >
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div
        className="relative overflow-hidden"
        style={{
          ...ovalShape,
          backgroundColor: "var(--faq2-bg, #f1f1f0)",
          color: "var(--faq2-text, #3a3a3a)",
        }}
      >
        <div className="container mx-auto px-4 @md:px-8 py-12 @md:py-16 @lg:py-20">
          <div
            className={cn(
              "grid grid-cols-1 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
              "gap-10 @md:gap-12 @3xl:gap-16 items-start",
            )}
          >
            {/* ─── Left column: title + experts badge + description ── */}
            <div className="text-center @3xl:text-left">
              {data.caption && (
                <p
                  data-content-field="caption"
                  className="mb-3 text-xs @md:text-sm font-bold uppercase tracking-[0.2em] opacity-70"
                  style={{ color: "var(--faq2-title, currentColor)" }}
                >
                  {data.caption}
                </p>
              )}
              {data.title && (
                <h2
                  data-content-field="title"
                  className={cn(
                    "font-semibold tracking-tight leading-[1.08]",
                    HEADING_SIZE_CLASS[headingSize],
                  )}
                  style={{ color: "var(--faq2-title, #1f1f1f)" }}
                >
                  {data.title}
                </h2>
              )}

              {(experts.length > 0 ||
                data.expertsLabelTop ||
                data.expertsLabelBottom) && (
                <ExpertsBadge
                  experts={experts}
                  labelTop={data.expertsLabelTop}
                  labelBottom={data.expertsLabelBottom}
                />
              )}

              {data.description && (
                <p
                  data-content-field="description"
                  className="mt-5 @md:mt-6 text-sm @md:text-base leading-relaxed max-w-xl mx-auto @3xl:mx-0"
                  style={{ color: "var(--faq2-text, currentColor)" }}
                >
                  {data.description}
                </p>
              )}
            </div>

            {/* ─── Right column: FAQ list ──────────────────────────── */}
            <div className="w-full">
              <AccordionPrimitive.Root
                {...accordionProps}
                className={cn("w-full flex flex-col", GAP_CLASS[gap])}
              >
                {items.map((item, i) => (
                  <AccordionPrimitive.Item
                    key={item.id}
                    value={item.id}
                    data-content-array="items"
                    data-content-index={i}
                    className={cn(
                      "border-b last:border-b-0",
                      i === 0 ? "border-t" : "",
                    )}
                    style={{
                      borderColor: "var(--faq2-divider, rgba(0,0,0,0.12))",
                    }}
                  >
                    <AccordionPrimitive.Header className="flex">
                      <AccordionPrimitive.Trigger
                        className={cn(
                          "group/trigger flex w-full items-center justify-between gap-4 text-left",
                          "py-5 @md:py-6",
                          "text-sm @md:text-base @lg:text-[0.95rem] font-medium leading-snug",
                          "outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                          "transition-colors cursor-pointer",
                          "hover:opacity-80",
                        )}
                        style={{ color: "var(--faq2-item-text, #1f1f1f)" }}
                      >
                        <span
                          data-content-field="question"
                          className="flex-1 pr-2"
                        >
                          {item.question}
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "relative inline-flex shrink-0 items-center justify-center",
                            "h-5 w-5 @md:h-6 @md:w-6",
                          )}
                          style={{ color: "var(--faq2-icon, currentColor)" }}
                        >
                          <Plus
                            className={cn(
                              "h-full w-full transition-transform duration-300 ease-out",
                              "group-data-[state=open]/trigger:rotate-45",
                            )}
                            strokeWidth={2}
                          />
                        </span>
                      </AccordionPrimitive.Trigger>
                    </AccordionPrimitive.Header>
                    <AccordionPrimitive.Content
                      className={cn(
                        "overflow-hidden",
                        "data-[state=closed]:animate-accordion-up",
                        "data-[state=open]:animate-accordion-down",
                      )}
                    >
                      {item.answer && (
                        <div
                          className={cn(
                            "pb-5 @md:pb-6 -mt-1",
                            "text-sm @md:text-base leading-relaxed opacity-85",
                          )}
                          style={{ color: "var(--faq2-item-text, #1f1f1f)" }}
                        >
                          <p data-content-field="answer">{item.answer}</p>
                        </div>
                      )}
                    </AccordionPrimitive.Content>
                  </AccordionPrimitive.Item>
                ))}
              </AccordionPrimitive.Root>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// ExpertsBadge — white pill with overlapping avatars + 2-line label
// ────────────────────────────────────────────────────────────────────────

interface ExpertsBadgeProps {
  experts: FaqTwoExpert[];
  labelTop?: string;
  labelBottom?: string;
}

function ExpertsBadge({ experts, labelTop, labelBottom }: ExpertsBadgeProps) {
  if (experts.length === 0 && !labelTop && !labelBottom) return null;

  return (
    <div
      className={cn(
        "mt-5 @md:mt-6 inline-flex items-center gap-3 @md:gap-4",
        "rounded-full pl-2 pr-4 @md:pl-3 @md:pr-5 py-1.5 @md:py-2",
        "shadow-sm",
        "max-w-full",
      )}
      style={{
        backgroundColor: "var(--faq2-badge-bg, #ffffff)",
        color: "var(--faq2-text, #3a3a3a)",
      }}
    >
      {experts.length > 0 && (
        <div className="flex -space-x-2 @md:-space-x-2.5 shrink-0">
          {experts.slice(0, 5).map((expert, i) => (
            <Avatar key={expert.id} expert={expert} index={i} />
          ))}
        </div>
      )}
      {(labelTop || labelBottom) && (
        <div className="min-w-0 text-left leading-tight">
          {labelTop && (
            <p
              data-content-field="expertsLabelTop"
              className="text-[10px] @md:text-xs opacity-80 truncate"
            >
              {labelTop}
            </p>
          )}
          {labelBottom && (
            <p
              data-content-field="expertsLabelBottom"
              className="text-xs @md:text-sm font-semibold truncate"
            >
              {labelBottom}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface AvatarProps {
  expert: FaqTwoExpert;
  index: number;
}

function Avatar({ expert, index }: AvatarProps) {
  const size = "h-7 w-7 @md:h-8 @md:w-8";
  const initials = (expert.alt || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      data-content-array="experts"
      data-content-index={index}
      className={cn(
        "relative rounded-full ring-2 ring-white overflow-visible shrink-0",
      )}
      style={{ zIndex: 5 - index }}
    >
      <div
        className={cn(
          size,
          "relative rounded-full overflow-hidden bg-gradient-to-br from-slate-300 to-slate-400",
          "flex items-center justify-center text-[10px] font-bold text-white/90",
        )}
      >
        {expert.imageUrl ? (
          <Image
            src={expert.imageUrl}
            alt={expert.alt ?? `Expert ${index + 1}`}
            fill
            sizes="32px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </div>
      {expert.verified && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center",
            "h-3.5 w-3.5 @md:h-4 @md:w-4 rounded-full ring-2 ring-white",
          )}
          style={{ backgroundColor: "var(--faq2-verified, #3b82f6)" }}
        >
          <Check
            className="h-2 w-2 @md:h-2.5 @md:w-2.5 text-white"
            strokeWidth={3.5}
          />
        </span>
      )}
    </div>
  );
}

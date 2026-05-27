"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type {
  FaqBlockContent,
  FaqHeadingSize,
  FaqItemGap,
  FaqItemRadius,
} from "@/lib/types/landing-blocks";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text";

interface FaqBlockProps {
  content: FaqBlockContent | unknown;
}

const HEADING_SIZE_CLASS: Record<FaqHeadingSize, string> = {
  md: "text-2xl @md:text-3xl",
  lg: "text-3xl @md:text-4xl @lg:text-5xl",
  xl: "text-4xl @md:text-5xl @lg:text-6xl",
};

const RADIUS_CLASS: Record<FaqItemRadius, string> = {
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
  "2xl": "rounded-[2rem]",
  full: "rounded-full data-[state=open]:rounded-3xl",
};

const GAP_CLASS: Record<FaqItemGap, string> = {
  tight: "space-y-2",
  normal: "space-y-3",
  relaxed: "space-y-4",
};

export default function FaqBlock({ content: rawContent }: FaqBlockProps) {
  const data = readContent<FaqBlockContent>(rawContent, "FAQ");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const items = data.items ?? [];
  if (items.length === 0) return null;

  const headingSize = data.headingSize ?? "lg";
  const radius = data.itemRadius ?? "full";
  const gap = data.itemGap ?? "normal";

  // SEO: FAQPage structured data. Plain-text answers (stripped HTML).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: stripHtml(item.answer),
      },
    })),
  };

  const firstId = items[0]?.id;

  // CSS custom properties drive the pill colors so the customizer's
  // live-preview hook can repaint instantly on every store mutation
  // (see liveContentVars in register-existing-blocks.tsx).
  const sectionStyle: CSSProperties = { ...inlineStyle };
  const cssVars: Array<[string, string | undefined]> = [
    ["--faq-item-bg", data.itemBgColor],
    ["--faq-item-bg-open", data.itemOpenBgColor || data.itemBgColor],
    ["--faq-item-text", data.itemTextColor],
    ["--faq-chevron", data.chevronColor || data.itemTextColor],
  ];
  for (const [name, value] of cssVars) {
    if (value !== undefined && value !== "") {
      (sectionStyle as Record<string, string>)[name] = value;
    }
  }

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

  return (
    <section
      className={cn("landing-section py-10 @md:py-16 @container", styleClass)}
      style={sectionStyle}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 max-w-3xl">
        {(data.caption || data.title || data.description) && (
          <header className="mb-8 @md:mb-10 text-center">
            {data.caption && (
              <p
                data-content-field="caption"
                className="mb-3 text-xs @md:text-sm font-bold uppercase tracking-[0.22em] opacity-80"
              >
                {data.caption}
              </p>
            )}
            {data.title && (
              <h2
                data-content-field="title"
                className={cn(
                  "font-extrabold tracking-tight leading-tight",
                  HEADING_SIZE_CLASS[headingSize],
                )}
              >
                {data.title}
              </h2>
            )}
            {data.description && (
              <p
                data-content-field="description"
                className="mt-4 text-sm @md:text-base opacity-80 max-w-2xl mx-auto"
              >
                {data.description}
              </p>
            )}
          </header>
        )}

        <AccordionPrimitive.Root
          {...accordionProps}
          className={cn("w-full", GAP_CLASS[gap])}
        >
          {items.map((item, i) => (
            <AccordionPrimitive.Item
              key={item.id}
              value={item.id}
              data-content-array="items"
              data-content-index={i}
              className={cn(
                "group overflow-hidden transition-all duration-200",
                "shadow-sm hover:shadow-md",
                RADIUS_CLASS[radius],
              )}
              style={{
                backgroundColor: "var(--faq-item-bg, #dc2626)",
                color: "var(--faq-item-text, #ffffff)",
              }}
            >
              <AccordionPrimitive.Header className="flex">
                <AccordionPrimitive.Trigger
                  className={cn(
                    "flex w-full items-center justify-between gap-4 text-left",
                    "px-5 @md:px-7 py-4 @md:py-5",
                    "text-base @md:text-lg font-bold leading-snug",
                    "outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-0",
                    "transition-colors",
                    "cursor-pointer",
                  )}
                >
                  <span data-content-field="question" className="flex-1">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-300 ease-out",
                      "group-data-[state=open]:rotate-180",
                    )}
                    style={{ color: "var(--faq-chevron, currentColor)" }}
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content
                className={cn(
                  "overflow-hidden",
                  "data-[state=closed]:animate-accordion-up",
                  "data-[state=open]:animate-accordion-down",
                )}
                style={{
                  backgroundColor: "var(--faq-item-bg-open, var(--faq-item-bg, #dc2626))",
                }}
              >
                <div
                  className={cn(
                    "px-5 @md:px-7 pb-5 @md:pb-6 pt-1",
                    "prose prose-sm @md:prose-base max-w-none",
                    "prose-p:my-2 prose-p:leading-relaxed",
                    "prose-strong:text-inherit prose-a:text-inherit prose-a:underline",
                    "[&_p]:opacity-95",
                  )}
                  style={{ color: "var(--faq-item-text, #ffffff)" }}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichText(item.answer),
                  }}
                />
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          ))}
        </AccordionPrimitive.Root>
      </div>
    </section>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

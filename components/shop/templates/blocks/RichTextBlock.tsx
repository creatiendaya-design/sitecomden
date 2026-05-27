"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle, ALIGNMENT_CLASS } from "@/lib/blocks/apply-style";
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text";
import { Button } from "@/components/ui/button";
import type { Alignment } from "@/lib/blocks/types";
import type {
  RichTextBlockContent,
  RichTextButton,
  RichTextHeadingSize,
} from "@/lib/types/landing-blocks";

interface RichTextBlockProps {
  content: RichTextBlockContent | unknown;
}

// Heading-size → Tailwind class. Sizes track Dawn's small/medium/large
// rendering at responsive breakpoints.
const HEADING_CLASS: Record<RichTextHeadingSize, string> = {
  small: "text-xl @md:text-2xl",
  medium: "text-2xl @md:text-3xl @lg:text-4xl",
  large: "text-3xl @md:text-4xl @lg:text-5xl",
};

// Flex justification driven by the block-level alignment so buttons sit at
// the same horizontal position as the heading/body text.
const BUTTONS_JUSTIFY: Record<Alignment, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

export default function RichTextBlock({ content: rawContent }: RichTextBlockProps) {
  const content = readContent<RichTextBlockContent>(rawContent, "RICH_TEXT");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const caption = content.caption?.trim() ?? "";
  const heading = content.heading?.trim() ?? "";
  const html = content.html ?? "";
  const sanitized = html.trim() ? sanitizeRichText(html) : "";
  const button1 = content.button1;
  const button2 = content.button2;

  const hasButton1 = isVisibleButton(button1);
  const hasButton2 = isVisibleButton(button2);
  const hasAnyContent =
    caption.length > 0 || heading.length > 0 || sanitized.length > 0 || hasButton1 || hasButton2;
  if (!hasAnyContent) return null;

  // Resolve alignment from Style tab — apply at the content level so the
  // text inside the prose body actually aligns (Tailwind prose ignores
  // section-level text-align unless we set it on the inner column).
  const rawAlign = blockStyle?.alignment;
  const resolvedAlign: Alignment =
    typeof rawAlign === "string"
      ? (rawAlign as Alignment)
      : rawAlign && typeof rawAlign === "object"
        ? (((rawAlign as { desktop?: Alignment; mobile?: Alignment }).desktop
          ?? (rawAlign as { desktop?: Alignment; mobile?: Alignment }).mobile) ?? "center")
        : "center";
  const alignmentClass = ALIGNMENT_CLASS[resolvedAlign];

  const headingSize: RichTextHeadingSize = content.headingSize ?? "medium";

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            // Reading column: bounded width, centered horizontally. Alignment
            // class drives text-* alignment within the column.
            "max-w-[65ch] mx-auto space-y-4 @md:space-y-6",
            alignmentClass,
          )}
        >
          {caption && (
            <p
              className="text-xs @md:text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground"
              data-content-field="caption"
            >
              {caption}
            </p>
          )}

          {heading && (
            <h2
              className={cn(
                "font-semibold tracking-tight leading-tight text-balance",
                HEADING_CLASS[headingSize],
              )}
              data-content-field="heading"
            >
              {heading}
            </h2>
          )}

          {sanitized && (
            <div
              className={cn(
                // `prose` provides the body typography (paragraphs, lists,
                // links). max-w-none lets the prose fill the reading column
                // we already constrained above.
                "prose prose-sm @md:prose-base max-w-none",
                // Force prose's color tokens to inherit from the section's
                // `color` so the Style tab's «Color de texto» actually
                // paints body/headings/strong instantly via the live-preview
                // hook. Without this, Tailwind's --tw-prose-* defaults win
                // the cascade and ignore inherit on every prose element.
                "[--tw-prose-body:currentColor]",
                "[--tw-prose-headings:currentColor]",
                "[--tw-prose-bold:currentColor]",
                "[--tw-prose-bullets:currentColor]",
                "[--tw-prose-counters:currentColor]",
                "[--tw-prose-quotes:currentColor]",
                "[--tw-prose-quote-borders:currentColor]",
                "[--tw-prose-captions:currentColor]",
                "[--tw-prose-hr:currentColor]",
                "prose-headings:font-semibold prose-a:text-primary",
              )}
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
          )}

          {(hasButton1 || hasButton2) && (
            <div
              className={cn(
                "flex flex-wrap items-center gap-3 pt-1",
                BUTTONS_JUSTIFY[resolvedAlign],
              )}
            >
              {hasButton1 && <RichTextCta button={button1!} />}
              {hasButton2 && <RichTextCta button={button2!} />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function isVisibleButton(b: RichTextButton | undefined): boolean {
  return Boolean(b && b.label && b.label.trim().length > 0);
}

function RichTextCta({ button }: { button: RichTextButton }) {
  const variant = button.style === "secondary" ? "outline" : "default";
  const label = button.label ?? "";
  const href = button.href?.trim() ?? "";

  if (!href) {
    // No link → render an inert button. Useful as a placeholder during
    // editing; the storefront still shows the styling without a hover
    // pointer that goes nowhere.
    return (
      <Button variant={variant} size="lg" disabled>
        {label}
      </Button>
    );
  }

  const isInternal = href.startsWith("/");
  if (isInternal) {
    return (
      <Button variant={variant} size="lg" asChild>
        <Link href={href}>{label}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} size="lg" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </Button>
  );
}

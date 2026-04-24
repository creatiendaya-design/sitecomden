"use client";

import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle, ALIGNMENT_CLASS } from "@/lib/blocks/apply-style";
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text";
import type { Alignment } from "@/lib/blocks/types";

interface RichTextContent {
  html: string;
  maxWidth?: "prose";
}

interface RichTextBlockProps {
  content: RichTextContent | unknown;
}

export default function RichTextBlock({ content: rawContent }: RichTextBlockProps) {
  const content = readContent<RichTextContent>(rawContent, "RICH_TEXT");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const html = content.html ?? "";
  if (!html.trim()) return null;

  const sanitized = sanitizeRichText(html);

  // Resolve block-level alignment from Style tab -> apply to the prose div
  // (not just the outer section) so the text actually centers/aligns.
  const rawAlign = blockStyle?.alignment;
  const resolvedAlign: Alignment | undefined =
    typeof rawAlign === "string"
      ? (rawAlign as Alignment)
      : rawAlign && typeof rawAlign === "object"
        ? ((rawAlign as { desktop?: Alignment; mobile?: Alignment }).desktop
          ?? (rawAlign as { desktop?: Alignment; mobile?: Alignment }).mobile)
        : undefined;
  const alignmentClass = resolvedAlign ? ALIGNMENT_CLASS[resolvedAlign] : "";

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            // max-w + mx-auto center the READING COLUMN; alignmentClass sets
            // the actual TEXT alignment within that column.
            "prose prose-sm @md:prose-base max-w-[65ch] mx-auto",
            "prose-headings:font-semibold prose-a:text-primary",
            alignmentClass,
          )}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>
    </section>
  );
}

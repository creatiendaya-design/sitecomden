"use client";

import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle, ALIGNMENT_CLASS } from "@/lib/blocks/apply-style";
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

  // Widened allow-list so common TipTap output survives sanitization:
  //  - <img> inline images
  //  - <s>, <strike> strikethrough
  //  - <code>, <pre> code
  //  - <h1> (previously stripped; used when admin clicks Título 1)
  //  - class + style attrs. TipTap's TextAlign extension writes alignment as
  //    inline style="text-align: …" on <p>/<h*>, so we need "style" allowed
  //    for alignment to survive on the storefront. DOMPurify's built-in CSS
  //    sanitizer blocks expression(), javascript: URLs, @import, etc., which
  //    is the right guard for admin-authored content.
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "strike", "code", "pre",
      "a", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "img",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class", "style"],
    ALLOW_DATA_ATTR: false,
  });

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

"use client";

import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

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

  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "a", "h2", "h3", "h4", "ul", "ol", "li", "blockquote"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            "prose prose-sm @md:prose-base max-w-[65ch] mx-auto",
            "prose-headings:font-semibold prose-a:text-primary",
          )}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>
    </section>
  );
}

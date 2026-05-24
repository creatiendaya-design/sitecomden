"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text";

interface ImageTextData {
  title?: string;
  description: string;
  imagePosition: "left" | "right";
  imageAlt: string;
  ctaText?: string;
  ctaUrl?: string;
  ratioImageToText?: "40-60" | "50-50" | "60-40";
}

interface ImageTextBlockProps {
  content: ImageTextData | unknown;
  onCtaClick?: () => void;
}

const RATIO_CLASS = {
  "40-60": "grid-cols-1 @md:grid-cols-[2fr_3fr]",
  "50-50": "grid-cols-1 @md:grid-cols-2",
  "60-40": "grid-cols-1 @md:grid-cols-[3fr_2fr]",
} as const;

export default function ImageTextBlock({ content: rawContent, onCtaClick }: ImageTextBlockProps) {
  const data = readContent<ImageTextData>(rawContent, "IMAGE_TEXT");
  const { style: blockStyle, media } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  // Storefront: one image renders — pick desktop by default. Real mobile
  // vs desktop picking can be extended later via an entry-level device
  // resolver, but for now the bilingual reader and CSS handle responsive
  // sizing via the aspect-video container.
  const image = media?.image as { desktop?: string; mobile?: string } | undefined;
  const imageUrl = image?.desktop ?? image?.mobile;

  const ratio = data.ratioImageToText ?? "50-50";
  const position = data.imagePosition ?? "left";

  const sanitized = sanitizeRichText(data.description);

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        <div className={cn("grid gap-6 @md:gap-10 items-center", RATIO_CLASS[ratio])}>
          {/* Image column */}
          <div className={cn("relative aspect-video w-full rounded-2xl overflow-hidden", position === "right" && "@md:order-2")}>
            {imageUrl ? (
              <Image src={imageUrl} alt={data.imageAlt ?? ""} fill className="object-cover" unoptimized />
            ) : (
              <div className="absolute inset-0 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                Sin imagen
              </div>
            )}
          </div>

          {/* Text column */}
          <div className={cn(position === "right" && "@md:order-1")}>
            {data.title && (
              <h2
                data-content-field="title"
                className="text-2xl @md:text-3xl font-bold mb-3"
              >
                {data.title}
              </h2>
            )}
            <div
              className="prose prose-sm @md:prose-base max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
            {data.ctaText && (
              <div className="mt-6">
                {data.ctaUrl ? (
                  <Button asChild>
                    <a
                      data-content-field="ctaText"
                      href={data.ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {data.ctaText}
                    </a>
                  </Button>
                ) : (
                  <Button data-content-field="ctaText" onClick={onCtaClick}>
                    {data.ctaText}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text";
import type { IconTextBlockContent, IconTextCard } from "@/lib/types/landing-blocks";

interface IconTextBlockProps {
  content: IconTextBlockContent | unknown;
}

const COLS_DESKTOP: Record<2 | 3 | 4 | 5, string> = {
  2: "@md:grid-cols-2",
  3: "@md:grid-cols-3",
  4: "@md:grid-cols-4",
  5: "@md:grid-cols-5",
};

const COLS_MOBILE: Record<1 | 2, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
};

const GAP_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: "gap-3 @md:gap-4",
  md: "gap-4 @md:gap-6",
  lg: "gap-6 @md:gap-8",
};

const CARD_PADDING: Record<"sm" | "md" | "lg", string> = {
  sm: "p-4",
  md: "p-5 @md:p-6",
  lg: "p-6 @md:p-8",
};

const CARD_RADIUS: Record<"none" | "sm" | "md" | "lg" | "xl", string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
};

export default function IconTextBlock({ content: rawContent }: IconTextBlockProps) {
  const data = readContent<IconTextBlockContent>(rawContent, "ICON_TEXT");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const cards = data.cards ?? [];
  if (cards.length === 0) return null;

  const columnsDesktop = data.columnsDesktop ?? 4;
  const columnsMobile = data.columnsMobile ?? 2;
  const cardPadding = data.cardPadding ?? "md";
  const cardCornerRadius = data.cardCornerRadius ?? "lg";
  const cardGap = data.cardGap ?? "md";
  const defaultCardBg = data.defaultCardBgColor;
  const defaultCardText = data.defaultCardTextColor;

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            "grid",
            COLS_MOBILE[columnsMobile],
            COLS_DESKTOP[columnsDesktop],
            GAP_CLASS[cardGap],
          )}
        >
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              padding={cardPadding}
              radius={cardCornerRadius}
              fallbackBg={defaultCardBg}
              fallbackText={defaultCardText}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({
  card,
  padding,
  radius,
  fallbackBg,
  fallbackText,
}: {
  card: IconTextCard;
  padding: "sm" | "md" | "lg";
  radius: "none" | "sm" | "md" | "lg" | "xl";
  fallbackBg?: string;
  fallbackText?: string;
}) {
  const sanitized = card.html ? sanitizeRichText(card.html) : "";
  const widthDesktop = card.imageWidthDesktop ?? 96;
  const widthMobile = card.imageWidthMobile ?? 72;
  const bg = card.bgColor || fallbackBg;
  const color = card.textColor || fallbackText;

  // Image width is driven by two CSS custom properties set inline (--w-d,
  // --w-m). The image wrapper picks one via Tailwind container-query
  // utilities (w-[var(--w-m)] for mobile, @md:w-[var(--w-d)] for desktop).
  // We MUST NOT set the resolved width inline — inline `style` has higher
  // specificity than utility classes and would prevent the @md override
  // from applying.
  const cardStyle: React.CSSProperties = {
    backgroundColor: bg || undefined,
    color: color || undefined,
    ["--w-d" as string]: `${widthDesktop}px`,
    ["--w-m" as string]: `${widthMobile}px`,
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        CARD_PADDING[padding],
        CARD_RADIUS[radius],
      )}
      style={cardStyle}
    >
      {card.image ? (
        <div className="relative shrink-0 aspect-square mb-3 @md:mb-4 w-[var(--w-m)] @md:w-[var(--w-d)]">
          <Image
            src={card.image}
            alt={card.imageAlt ?? ""}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 240px, 320px"
            unoptimized
          />
        </div>
      ) : null}

      {sanitized ? (
        <div
          className="prose prose-sm @md:prose-base max-w-none text-inherit [&_*]:text-inherit"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      ) : null}
    </div>
  );
}

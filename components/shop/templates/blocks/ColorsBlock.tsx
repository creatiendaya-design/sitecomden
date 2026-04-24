import type { ColorsBlockContent } from "@/lib/types/landing-blocks";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface ColorsBlockProps {
  content: ColorsBlockContent | unknown;
}

export default function ColorsBlock({ content: rawContent }: ColorsBlockProps) {
  const content = readContent<ColorsBlockContent>(rawContent, "COLORS");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);
  const { primary, background, cta, text } = content;

  const cssVars: Record<string, string> = {};
  if (primary)    cssVars["--landing-primary"]    = primary;
  if (background) cssVars["--landing-bg"]         = background;
  if (cta)        cssVars["--landing-cta"]        = cta;
  if (text)       cssVars["--landing-text"]       = text;

  return (
    <div className={cn("@container", styleClass)} style={inlineStyle}>
    <style>{`
      .landing-product {
        ${primary    ? `--landing-primary: ${primary};` : ""}
        ${background ? `--landing-bg: ${background};` : ""}
        ${cta        ? `--landing-cta: ${cta};` : ""}
        ${text       ? `--landing-text: ${text};` : ""}
      }
      .landing-product .landing-section { background-color: var(--landing-bg, transparent); color: var(--landing-text, inherit); }
      .landing-product .landing-cta-btn { background-color: var(--landing-cta, #dc2626); color: #fff; }
    `}</style>
    </div>
  );
}

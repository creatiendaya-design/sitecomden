import sanitizeHtml from "sanitize-html"

/**
 * Single source of truth for sanitizing HTML produced by the admin TipTap
 * editor. Used by RichTextBlock, ImageTextBlock description, FaqBlock answers,
 * and any future block that renders admin-authored rich text.
 *
 * Uses `sanitize-html` (pure CJS, no jsdom) so it works in Server Components
 * on Vercel without the html-encoding-sniffer / @exodus/bytes ESM conflict.
 */
export function sanitizeRichText(html: string | undefined | null): string {
  if (!html) return ""
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s", "strike", "code", "pre",
      "a", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "class", "style"],
      img: ["src", "alt", "class", "style"],
      "*": ["class", "style"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
        "color": [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:0|1|0?\.\d+)\s*\)$/],
        "background-color": [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:0|1|0?\.\d+)\s*\)$/, /^transparent$/],
        "font-weight": [/^(normal|bold|bolder|lighter|[1-9]00)$/],
        "font-style": [/^(normal|italic|oblique)$/],
        "text-decoration": [/^(none|underline|line-through|overline)$/],
      },
    },
  })
}

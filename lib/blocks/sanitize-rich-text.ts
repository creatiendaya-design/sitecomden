import DOMPurify from "isomorphic-dompurify"

/**
 * Single source of truth for sanitizing HTML produced by the admin TipTap
 * editor. Used by RichTextBlock, ImageTextBlock description, FaqBlock answers,
 * and any future block that renders admin-authored rich text.
 *
 * Allowed tags cover the TipTap toolbar: bold/italic/underline/strike/code,
 * headings 1-4, ordered/unordered lists, blockquote, links, images.
 *
 * Allowed attrs include `class` (TipTap Link + Image set className) and
 * `style` (TipTap TextAlign writes `text-align: ...` inline). DOMPurify's
 * built-in CSS sanitizer still blocks expression(), javascript: URLs, and
 * @import, which is the right guard for admin-authored content.
 */
export function sanitizeRichText(html: string | undefined | null): string {
  if (!html) return ""
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "strike", "code", "pre",
      "a", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "img",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class", "style"],
    ALLOW_DATA_ATTR: false,
  })
}

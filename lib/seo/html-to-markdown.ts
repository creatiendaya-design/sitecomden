/**
 * Minimal HTML→markdown converter for product descriptions and rich-text
 * blocks served to LLM crawlers.
 *
 * Intentionally tiny: handles the subset of tags Tiptap emits (headings,
 * paragraphs, lists, links, bold/italic, line breaks, images). Anything
 * unknown is stripped. Output is normalized whitespace + utf-8 safe.
 *
 * Not a full DOM parser — uses regex passes. That's fine because:
 *   1. Tiptap output is well-formed and predictable.
 *   2. We strip script/style outright before processing.
 *   3. LLM consumers want signal, not perfect markup.
 */

const BLOCK_REPLACEMENTS: Array<[RegExp, string]> = [
  // Drop script/style entirely.
  [/<script\b[^>]*>[\s\S]*?<\/script>/gi, ""],
  [/<style\b[^>]*>[\s\S]*?<\/style>/gi, ""],

  // Headings — Tiptap emits h1..h4 in product descriptions.
  [/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n"],
  [/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n"],
  [/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n"],
  [/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n\n#### $1\n\n"],
  [/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n\n##### $1\n\n"],
  [/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n\n###### $1\n\n"],

  // Lists — flatten to one `- ` per <li>. Nested lists collapse but content
  // is preserved (good enough for LLM extraction).
  [/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1"],
  [/<\/?(ul|ol)[^>]*>/gi, "\n"],

  // Inline emphasis.
  [/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**"],
  [/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*"],

  // Links — keep the URL.
  [
    /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    "[$2]($1)",
  ],

  // Images — alt + src.
  [
    /<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi,
    "![$1]($2)",
  ],
  [
    /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi,
    "![$2]($1)",
  ],
  [/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, "![]($1)"],

  // Paragraphs + line breaks.
  [/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n"],
  [/<br\s*\/?>/gi, "\n"],
  [/<hr\s*\/?>/gi, "\n\n---\n\n"],
];

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&aacute;": "á",
  "&eacute;": "é",
  "&iacute;": "í",
  "&oacute;": "ó",
  "&uacute;": "ú",
  "&ntilde;": "ñ",
  "&Aacute;": "Á",
  "&Eacute;": "É",
  "&Iacute;": "Í",
  "&Oacute;": "Ó",
  "&Uacute;": "Ú",
  "&Ntilde;": "Ñ",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&[a-zA-Z]+;|&#\d+;/g, (match) => {
      if (match in HTML_ENTITIES) return HTML_ENTITIES[match];
      const numeric = /^&#(\d+);$/.exec(match);
      if (numeric) {
        const code = Number(numeric[1]);
        if (Number.isFinite(code) && code > 0 && code < 0x110000) {
          return String.fromCodePoint(code);
        }
      }
      return match;
    });
}

export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return "";

  let out = html;
  for (const [pattern, replacement] of BLOCK_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }

  // Strip any remaining tags.
  out = out.replace(/<[^>]+>/g, "");

  out = decodeEntities(out);

  // Collapse 3+ blank lines and trim each line's trailing whitespace.
  out = out
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out;
}

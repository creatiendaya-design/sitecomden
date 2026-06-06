/**
 * Custom (uploaded) font helpers (typography picker — Fase 3).
 *
 * Shared between the upload server action (`actions/fonts.ts`) and the themes
 * stylesheet generator (`lib/themes/get-themes-css.ts`). No `next/font` or
 * server-only imports here so both can use it freely.
 */

export type FontFormat = "woff2" | "woff" | "truetype" | "opentype"
export type FontStyle = "normal" | "italic"

export interface CustomFontFile {
  /** Vercel Blob URL of the font file. */
  url: string
  /** CSS font-weight (e.g. "400", "700", or a "400 700" variable range). */
  weight: string
  style: FontStyle
  format: FontFormat
}

export interface CustomFontRecord {
  id: string
  family: string
  files: CustomFontFile[]
}

/** Allowed upload extensions → declared CSS `format()`. */
export const FONT_EXTENSIONS: Record<string, FontFormat> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
}

/**
 * Detects the font format from the file's magic bytes — prevents content-type
 * spoofing (mirrors the image upload route). Returns null if not a font.
 */
export function detectFontFormat(bytes: Uint8Array): FontFormat | null {
  const sig = (signature: number[]): boolean =>
    signature.every((b, i) => bytes[i] === b)

  if (sig([0x77, 0x4f, 0x46, 0x32])) return "woff2" // "wOF2"
  if (sig([0x77, 0x4f, 0x46, 0x46])) return "woff" // "wOFF"
  if (sig([0x4f, 0x54, 0x54, 0x4f])) return "opentype" // "OTTO"
  if (sig([0x00, 0x01, 0x00, 0x00])) return "truetype" // TrueType outlines
  if (sig([0x74, 0x72, 0x75, 0x65])) return "truetype" // "true"
  if (sig([0x74, 0x74, 0x63, 0x66])) return "truetype" // "ttcf" (collection)
  return null
}

/**
 * Strips characters that could break out of the `font-family` string or the
 * surrounding CSS. Family names are letters/numbers/spaces/hyphens only.
 */
export function sanitizeFontFamily(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9 \-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50)
}

/** Narrows arbitrary JSON (Prisma `files` column) to a typed file array. */
export function parseCustomFontFiles(value: unknown): CustomFontFile[] {
  if (!Array.isArray(value)) return []
  const out: CustomFontFile[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue
    const r = raw as Record<string, unknown>
    if (typeof r.url !== "string") continue
    out.push({
      url: r.url,
      weight: typeof r.weight === "string" ? r.weight : "400",
      style: r.style === "italic" ? "italic" : "normal",
      format: isFontFormat(r.format) ? r.format : "woff2",
    })
  }
  return out
}

function isFontFormat(value: unknown): value is FontFormat {
  return (
    value === "woff2" ||
    value === "woff" ||
    value === "truetype" ||
    value === "opentype"
  )
}

/**
 * Emits one `@font-face` rule per file. Rules are global (not theme-scoped) so
 * any theme that references the family in its tokens resolves correctly.
 */
export function customFontsToCss(fonts: readonly CustomFontRecord[]): string {
  const blocks: string[] = []
  for (const font of fonts) {
    const family = sanitizeFontFamily(font.family)
    if (!family) continue
    for (const file of font.files) {
      blocks.push(
        [
          "@font-face {",
          `  font-family: "${family}";`,
          `  src: url("${file.url}") format("${file.format}");`,
          `  font-weight: ${file.weight};`,
          `  font-style: ${file.style};`,
          "  font-display: swap;",
          "}",
        ].join("\n"),
      )
    }
  }
  return blocks.join("\n")
}

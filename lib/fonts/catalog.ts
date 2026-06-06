/**
 * Curated font catalog (typography picker).
 *
 * Pure data — no `next/font` imports — so this module is safe to import from
 * client components (the customizer FontPicker) and server code alike.
 *
 * Each curated Google font is loaded once, self-hosted, via `next/font/google`
 * in `app/fonts.ts`, which exposes it as a CSS variable named `--font-<id>`.
 * The theme token (`tokens.fonts.heading` / `.body`) stores the resulting
 * `stack` string verbatim, so:
 *   - selecting a curated font stores e.g. `var(--font-playfair-display), serif`
 *   - the storefront resolves `--theme-font-heading` to that var, and the
 *     browser only downloads the woff2 for the font the active theme uses
 *     (curated fonts declare `preload: false`).
 *
 * IMPORTANT: every `cssVar` here MUST match a `variable` declared in
 * `app/fonts.ts`. Keep the two files in sync.
 */

export type FontCategory = "sans" | "serif" | "display"
export type FontSource = "google" | "custom"

export interface FontDef {
  /** Stable id, kebab-case. Drives the CSS variable name `--font-<id>`. */
  id: string
  /** Human label shown in the picker (also used to render the preview). */
  label: string
  /** Full `font-family` stack stored in the theme token. */
  stack: string
  category: FontCategory
  source: FontSource
}

/**
 * Generic fallback appended after each curated font so a brief FOUT (before the
 * woff2 loads) and any missing-glyph case degrade to a sensible system family.
 */
const SANS_FALLBACK = "system-ui, -apple-system, 'Segoe UI', sans-serif"
const SERIF_FALLBACK = "Georgia, 'Times New Roman', serif"

/**
 * Curated Google fonts. Order here is the order shown in the picker, grouped
 * by `category`. Adding a font is a two-line change: an entry here + the
 * matching `next/font/google` declaration in `app/fonts.ts`.
 */
export const CURATED_FONTS: readonly FontDef[] = [
  // ── Sans ──────────────────────────────────────────────────────────────
  { id: "inter", label: "Inter", stack: `var(--font-inter), ${SANS_FALLBACK}`, category: "sans", source: "google" },
  { id: "rubik", label: "Rubik", stack: `var(--font-rubik), ${SANS_FALLBACK}`, category: "sans", source: "google" },
  { id: "nunito-sans", label: "Nunito Sans", stack: `var(--font-nunito-sans), ${SANS_FALLBACK}`, category: "sans", source: "google" },
  { id: "poppins", label: "Poppins", stack: `var(--font-poppins), ${SANS_FALLBACK}`, category: "sans", source: "google" },
  { id: "montserrat", label: "Montserrat", stack: `var(--font-montserrat), ${SANS_FALLBACK}`, category: "sans", source: "google" },
  { id: "roboto", label: "Roboto", stack: `var(--font-roboto), ${SANS_FALLBACK}`, category: "sans", source: "google" },
  { id: "open-sans", label: "Open Sans", stack: `var(--font-open-sans), ${SANS_FALLBACK}`, category: "sans", source: "google" },
  { id: "lato", label: "Lato", stack: `var(--font-lato), ${SANS_FALLBACK}`, category: "sans", source: "google" },
  { id: "work-sans", label: "Work Sans", stack: `var(--font-work-sans), ${SANS_FALLBACK}`, category: "sans", source: "google" },
  { id: "dm-sans", label: "DM Sans", stack: `var(--font-dm-sans), ${SANS_FALLBACK}`, category: "sans", source: "google" },
  { id: "manrope", label: "Manrope", stack: `var(--font-manrope), ${SANS_FALLBACK}`, category: "sans", source: "google" },

  // ── Serif ─────────────────────────────────────────────────────────────
  { id: "playfair-display", label: "Playfair Display", stack: `var(--font-playfair-display), ${SERIF_FALLBACK}`, category: "serif", source: "google" },
  { id: "lora", label: "Lora", stack: `var(--font-lora), ${SERIF_FALLBACK}`, category: "serif", source: "google" },
  { id: "merriweather", label: "Merriweather", stack: `var(--font-merriweather), ${SERIF_FALLBACK}`, category: "serif", source: "google" },
  { id: "cormorant-garamond", label: "Cormorant Garamond", stack: `var(--font-cormorant-garamond), ${SERIF_FALLBACK}`, category: "serif", source: "google" },
  { id: "eb-garamond", label: "EB Garamond", stack: `var(--font-eb-garamond), ${SERIF_FALLBACK}`, category: "serif", source: "google" },

  // ── Display ───────────────────────────────────────────────────────────
  { id: "bebas-neue", label: "Bebas Neue", stack: `var(--font-bebas-neue), ${SANS_FALLBACK}`, category: "display", source: "google" },
  { id: "oswald", label: "Oswald", stack: `var(--font-oswald), ${SANS_FALLBACK}`, category: "display", source: "google" },
  { id: "archivo", label: "Archivo", stack: `var(--font-archivo), ${SANS_FALLBACK}`, category: "display", source: "google" },
  { id: "sora", label: "Sora", stack: `var(--font-sora), ${SANS_FALLBACK}`, category: "display", source: "google" },
  { id: "space-grotesk", label: "Space Grotesk", stack: `var(--font-space-grotesk), ${SANS_FALLBACK}`, category: "display", source: "google" },
]

export const FONT_CATEGORY_LABEL: Record<FontCategory, string> = {
  sans: "Sans-serif",
  serif: "Serif",
  display: "Display",
}

/**
 * Builds the `font-family` stack a custom (uploaded) font should store in the
 * theme token. The family name is quoted; a generic fallback is appended.
 */
export function customFontStack(family: string): string {
  return `"${family.replace(/"/g, "")}", ${SANS_FALLBACK}`
}

/**
 * Normalizes a stored stack for comparison (collapses whitespace, lowercases)
 * so the picker can match a saved token back to a catalog entry regardless of
 * incidental formatting differences.
 */
export function normalizeStack(stack: string): string {
  return stack.replace(/\s+/g, " ").trim().toLowerCase()
}

/**
 * Finds the curated font whose stack matches the stored value, if any.
 * Returns `null` for legacy free-text stacks or custom-font stacks.
 */
export function findCuratedByStack(stack: string | undefined): FontDef | null {
  if (!stack) return null
  const target = normalizeStack(stack)
  return CURATED_FONTS.find((f) => normalizeStack(f.stack) === target) ?? null
}

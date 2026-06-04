import { DEFAULT_THEME_TOKENS, type ThemeTokens } from "./tokens"

/**
 * A named color palette that any block can opt into via
 * `block.content.style.colorSchemeId`. Modeled after Shopify's color
 * schemes — themes typically ship with 4-7 schemes covering different
 * moods (light, dark, accent, muted), and each section/block picks one.
 *
 * The first scheme in `Theme.colorSchemes` acts as the THEME DEFAULT —
 * blocks without an explicit pick render with that scheme's colors.
 */
export interface ColorScheme {
  /** Stable id used by block content to reference the scheme. Survives
   *  renames; `name` is purely cosmetic. */
  id: string
  /** Admin-facing label shown in the scheme card grid + block picker. */
  name: string
  colors: {
    bg: string
    text: string
    primary: string
    primaryForeground: string
    accent: string
    accentForeground: string
    muted: string
    border: string
    /** Drawer/modal surface background (cart drawer, dialogs). */
    drawerBg: string
    /** Text color inside drawers/modals. */
    drawerText: string
    /** Card surface background (product cards, tiles). */
    cardBg: string
    /** Text color inside cards. */
    cardText: string
    /** Action button background inside a product card ("Agregar al carrito"). */
    cardButtonBg: string
    /** Action button text color inside a product card. */
    cardButtonText: string
  }
}

/** Stable shape for the JSON column. Always an array — never null. */
export type ColorSchemeArray = ColorScheme[]

/**
 * Builds the synthetic "scheme 1" from a theme's legacy `tokens.colors`
 * payload. Used as a fallback when `Theme.colorSchemes` is empty so the
 * storefront keeps rendering correctly during the upgrade window.
 */
export function colorSchemeFromTokens(
  tokens: ThemeTokens | null | undefined,
): ColorScheme {
  const colors = { ...DEFAULT_THEME_TOKENS.colors, ...tokens?.colors }
  return {
    id: "default",
    name: "Esquema 1",
    colors,
  }
}

/**
 * Returns the schemes a theme should expose to admins + the storefront.
 * Falls back to a single synthetic scheme when the array is empty so
 * Theme.colorSchemes can be added incrementally without mass migration.
 */
export function resolveColorSchemes(
  raw: unknown,
  fallbackTokens: ThemeTokens | null | undefined,
): ColorSchemeArray {
  if (Array.isArray(raw) && raw.length > 0) {
    // Trust the JSON shape, with defaults filled in for missing colors so
    // a partially-authored scheme doesn't crash the renderer.
    return raw.map((s, i) => normalizeScheme(s as Partial<ColorScheme>, i))
  }
  return [colorSchemeFromTokens(fallbackTokens)]
}

function normalizeScheme(
  input: Partial<ColorScheme>,
  index: number,
): ColorScheme {
  const id = (input.id || `scheme-${index + 1}`).toString()
  const name = input.name?.toString().trim() || `Esquema ${index + 1}`
  const def = DEFAULT_THEME_TOKENS.colors
  const c = (input.colors ?? {}) as Partial<ColorScheme["colors"]>
  return {
    id,
    name,
    colors: {
      bg: c.bg || def.bg,
      text: c.text || def.text,
      primary: c.primary || def.primary,
      primaryForeground: c.primaryForeground || def.primaryForeground,
      accent: c.accent || def.accent,
      accentForeground: c.accentForeground || def.accentForeground,
      muted: c.muted || def.muted,
      border: c.border || def.border,
      drawerBg: c.drawerBg || def.drawerBg,
      drawerText: c.drawerText || def.drawerText,
      cardBg: c.cardBg || def.cardBg,
      cardText: c.cardText || def.cardText,
      cardButtonBg: c.cardButtonBg || def.cardButtonBg,
      cardButtonText: c.cardButtonText || def.cardButtonText,
    },
  }
}

/**
 * Looks up a scheme by id within a theme's resolved scheme list. Returns
 * the first scheme as a default fallback when the requested id is missing
 * (e.g. a block referenced a scheme the admin later deleted).
 */
export function findColorScheme(
  schemes: ColorSchemeArray,
  schemeId: string | null | undefined,
): ColorScheme {
  if (schemeId) {
    const found = schemes.find((s) => s.id === schemeId)
    if (found) return found
  }
  return schemes[0]
}

/**
 * CSS-property pairs for a given scheme. Reused by the storefront CSS
 * bundle and by the admin scheme-card preview.
 */
export function schemeToCssLines(scheme: ColorScheme): string[] {
  const lines: string[] = []
  for (const [key, value] of Object.entries(scheme.colors)) {
    lines.push(`  --theme-${kebabCase(key)}: ${value};`)
  }
  return lines
}

function kebabCase(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
}

/**
 * Generates a unique scheme id by sanitizing the proposed name and
 * disambiguating against an existing list. Used when admins add new
 * schemes from the UI.
 */
export function generateSchemeId(
  name: string,
  existing: ColorSchemeArray,
): string {
  const base =
    slugify(name) ||
    `scheme-${existing.length + 1}`
  let candidate = base
  let n = 2
  const taken = new Set(existing.map((s) => s.id))
  while (taken.has(candidate)) {
    candidate = `${base}-${n}`
    n += 1
  }
  return candidate
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

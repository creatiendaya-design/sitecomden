/**
 * Theme tokens (Plan 11).
 *
 * Atomic visual values that compose a theme's identity. The storefront
 * materializes them as CSS custom properties (`--theme-primary`, etc.)
 * scoped to a body className `theme-<slug>`, so changing themes is a
 * pure className swap with zero React re-render.
 *
 * Shape is intentionally small — a few brand colors, two font families
 * and a couple of scale knobs. That covers the 95% case of "I want my
 * shop to feel different" without ballooning the editor UX.
 */
export interface ThemeTokens {
  colors?: {
    /** Brand main color — primary buttons, links, accents. */
    primary?: string
    /** On-primary text color (used inside .bg-brand surfaces). */
    primaryForeground?: string
    /** Secondary brand accent (highlights, sale tags). */
    accent?: string
    /** On-accent text color. */
    accentForeground?: string
    /** Page background. */
    bg?: string
    /** Body text color. */
    text?: string
    /** Muted text (secondary copy, helper text). */
    muted?: string
    /** Border color used by cards/dividers. */
    border?: string
    /** Background for drawers and modals (cart drawer, dialogs). */
    drawerBg?: string
    /** Text inside drawers and modals. */
    drawerText?: string
    /** Background for cards (product cards, surface tiles). */
    cardBg?: string
    /** Text inside cards. */
    cardText?: string
  }
  fonts?: {
    /** Headings font stack. */
    heading?: string
    /** Body font stack. */
    body?: string
  }
  scale?: {
    /** Default border radius (`var(--theme-radius)`). */
    radius?: string
    /** Base font size for the body (`var(--theme-font-size)`). */
    fontSize?: string
  }
}

/**
 * Conservative defaults that match the existing Tailwind look — adopting
 * Plan 11 with empty tokens does NOT change the visual identity. Themes
 * override individual fields as needed.
 */
export const DEFAULT_THEME_TOKENS: Required<{
  colors: Required<NonNullable<ThemeTokens["colors"]>>
  fonts: Required<NonNullable<ThemeTokens["fonts"]>>
  scale: Required<NonNullable<ThemeTokens["scale"]>>
}> = {
  colors: {
    primary: "#2563eb", // Tailwind blue-600 — current accent in the codebase
    primaryForeground: "#ffffff",
    accent: "#7c3aed", // Tailwind violet-600
    accentForeground: "#ffffff",
    bg: "#ffffff",
    text: "#0f172a", // slate-900
    muted: "#64748b", // slate-500
    border: "#e2e8f0", // slate-200
    drawerBg: "#ffffff",
    drawerText: "#0f172a",
    cardBg: "#ffffff",
    cardText: "#0f172a",
  },
  fonts: {
    heading: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    body: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  scale: {
    radius: "0.5rem",
    fontSize: "16px",
  },
}

/**
 * Merges admin-authored tokens over the defaults so every consumer gets a
 * fully-populated object (no undefined fields). Used by the CSS generator
 * and by admin previews.
 */
export function resolveTokens(input: ThemeTokens | null | undefined): {
  colors: Required<NonNullable<ThemeTokens["colors"]>>
  fonts: Required<NonNullable<ThemeTokens["fonts"]>>
  scale: Required<NonNullable<ThemeTokens["scale"]>>
} {
  return {
    colors: { ...DEFAULT_THEME_TOKENS.colors, ...input?.colors },
    fonts: { ...DEFAULT_THEME_TOKENS.fonts, ...input?.fonts },
    scale: { ...DEFAULT_THEME_TOKENS.scale, ...input?.scale },
  }
}

/**
 * Maps a (themeSlug, resolvedTokens) pair to a CSS rule body that injects
 * `--theme-*` custom properties under `.theme-<slug>`. The first call's
 * selector also doubles as `:root, .theme-<slug>` so storefront pages that
 * forget to set the body class still get the active theme's tokens.
 */
export function tokensToCssRule(
  selector: string,
  tokens: ReturnType<typeof resolveTokens>,
): string {
  const lines: string[] = []
  // Colors
  for (const [key, value] of Object.entries(tokens.colors)) {
    lines.push(`  --theme-${kebabCase(key)}: ${value};`)
  }
  // Fonts
  for (const [key, value] of Object.entries(tokens.fonts)) {
    lines.push(`  --theme-font-${kebabCase(key)}: ${value};`)
  }
  // Scale
  for (const [key, value] of Object.entries(tokens.scale)) {
    lines.push(`  --theme-${kebabCase(key)}: ${value};`)
  }
  return `${selector} {\n${lines.join("\n")}\n}`
}

function kebabCase(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
}

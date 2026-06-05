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
    /** Background for the action button inside a product card
     *  ("Agregar al carrito" / "Comprar ahora"). */
    cardButtonBg?: string
    /** Text color of the product card action button. */
    cardButtonText?: string
    /** Regular (current) price color — product cards + product main. */
    regularPrice?: string
    /** Compare-at (struck-through) price color. */
    comparePrice?: string
    /** Sale/discount badge background color. */
    badgeBg?: string
    /** Sale/discount badge text color. */
    badgeText?: string
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
  /**
   * Checkout form chrome — editable from the customizer so each store can
   * brand the buy flow. Emitted as `--theme-checkout-*` and consumed by the
   * checkout input primitives + pay button. Defaults faithfully reproduce the
   * current fixed-graphite inputs and the brand `--cta` pay button, so a theme
   * that never touches these looks unchanged.
   */
  checkout?: {
    /** Input / select background. */
    inputBg?: string
    /** Input / select resting border color. */
    inputBorder?: string
    /** Input / select border color on focus (also drives the focus ring). */
    inputBorderFocus?: string
    /** Input / select corner radius (e.g. "0.75rem"). */
    inputRadius?: string
    /** Pay button background. */
    buttonBg?: string
    /** Pay button text color. */
    buttonText?: string
    /** Pay button corner radius (e.g. "0.375rem"). */
    buttonRadius?: string
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
  checkout: Required<NonNullable<ThemeTokens["checkout"]>>
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
    // Faithful to the existing brand CTA (--cta orange / dark on it) so
    // themes that don't customize the card button look unchanged.
    cardButtonBg: "#ea6a2a",
    cardButtonText: "#1c1108",
    // Pricing + sale badge. Defaults track the current hardcoded look:
    // bold dark price, muted compare-at, red sale badge with white text.
    regularPrice: "#0f172a", // slate-900
    comparePrice: "#64748b", // slate-500
    badgeBg: "#dc2626", // red-600
    badgeText: "#ffffff",
  },
  fonts: {
    heading: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    body: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  scale: {
    radius: "0.5rem",
    fontSize: "16px",
  },
  // Defaults reproduce the existing checkout look 1:1 so adopting these
  // tokens changes nothing until an admin edits them:
  //   - inputs: fixed graphite (slate-200 border, slate-900 focus), white
  //     bg, rounded-xl (0.75rem).
  //   - pay button: the brand CTA orange (#ea6a2a / #1c1108) at rounded-md
  //     (0.375rem). `--cta` is a single global brand color (not per-theme),
  //     so a concrete hex here is faithful AND gives the customizer a usable
  //     color picker.
  checkout: {
    inputBg: "#ffffff",
    inputBorder: "#e2e8f0", // slate-200
    inputBorderFocus: "#0f172a", // slate-900
    inputRadius: "0.75rem", // rounded-xl
    buttonBg: "#ea6a2a",
    buttonText: "#1c1108",
    buttonRadius: "0.375rem", // rounded-md
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
  checkout: Required<NonNullable<ThemeTokens["checkout"]>>
} {
  return {
    colors: { ...DEFAULT_THEME_TOKENS.colors, ...input?.colors },
    fonts: { ...DEFAULT_THEME_TOKENS.fonts, ...input?.fonts },
    scale: { ...DEFAULT_THEME_TOKENS.scale, ...input?.scale },
    checkout: { ...DEFAULT_THEME_TOKENS.checkout, ...input?.checkout },
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
  // Checkout chrome — `--theme-checkout-*`. These never overlap the color
  // names that `getThemesCssBundle` strips for scheme-ownership, so they
  // survive into the theme-default rule and apply globally per theme.
  for (const [key, value] of Object.entries(tokens.checkout)) {
    lines.push(`  --theme-checkout-${kebabCase(key)}: ${value};`)
  }
  // `footer` is intentionally NOT emitted as --theme-* — it's applied
  // directly on the <footer> element by `components/shop/Footer.tsx`.
  return `${selector} {\n${lines.join("\n")}\n}`
}

function kebabCase(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
}

import { prisma } from "@/lib/db"
import { getThemesCssBundle } from "./get-themes-css"

export interface ActiveThemeCanvasCss {
  /**
   * Class to drop on a canvas ancestor so the storefront stylesheet's
   * `.theme-<id> …` rules apply. Empty string when there's no active theme.
   */
  themeClassName: string
  /**
   * The storefront themes stylesheet (all themes; the className above selects
   * the active one). Injected into the editor so blocks resolve `var(--theme-*)`
   * and `[data-color-scheme]` overrides exactly like on the storefront.
   */
  css: string
}

/** Mirrors `cssIdentSafe` in get-themes-css.ts (kept private there). */
function cssIdentSafe(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_")
}

/**
 * Provides what a non-customizer page-builder canvas needs to preview the
 * active theme's color schemes in-place: the theme's wrapper class plus the
 * exact same CSS the storefront serves at /api/themes/tokens.css.
 *
 * Used by the landing-template editor so picking "Esquema del tema" recolors
 * the canvas live, matching what the product page will look like. The CSS is
 * scoped to `.theme-<id>`, so injecting it in the admin doesn't affect the
 * editor chrome (which uses shadcn `--background`/`--foreground`, not
 * `--theme-*`).
 */
export async function getActiveThemeCanvasCss(): Promise<ActiveThemeCanvasCss> {
  const [active, bundle] = await Promise.all([
    prisma.theme.findFirst({ where: { active: true }, select: { id: true } }),
    getThemesCssBundle(),
  ])
  if (!active) return { themeClassName: "", css: "" }
  return {
    themeClassName: `theme-${cssIdentSafe(active.id)}`,
    css: bundle.css,
  }
}

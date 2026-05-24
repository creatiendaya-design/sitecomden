import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"
import {
  resolveTokens,
  tokensToCssRule,
  type ThemeTokens,
} from "./tokens"
import {
  resolveColorSchemes,
  schemeToCssLines,
  type ColorScheme,
} from "./color-schemes"

export interface ThemesCssBundle {
  /** Final CSS body. Stable hash → safe to serve with immutable cache. */
  css: string
  /** Hash derived from MAX(updatedAt) of all themes, suitable as cache buster
   *  in the URL: /api/themes/tokens.css?h=<hash>. */
  hash: string
}

/**
 * Plan 12 perf: tags `active-theme-tokens` (bumped on token edits) and
 * `active-theme` (bumped on theme switch). Single in-memory cache key so
 * every storefront request hits memory, not Postgres, until an admin edit
 * invalidates it. The hash returned is also embedded in the route URL,
 * giving us long-tail browser/CDN cache on top of this server cache.
 */
const fetchThemesForCss = unstable_cache(
  () =>
    prisma.theme.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        active: true,
        tokens: true,
        colorSchemes: true,
        updatedAt: true,
      },
    }),
  ["themes-for-css"],
  { tags: ["active-theme-tokens", "active-theme"] },
)

/**
 * Generates the storefront's themes stylesheet. Two layers per theme:
 *
 *   1. Default tokens scoped to `.theme-<id>` — colors of the theme's
 *      first scheme + fonts + scale.
 *   2. One rule per extra color scheme:
 *      `.theme-<id> [data-color-scheme="<schemeId>"] { --theme-bg: ... }`
 *      Blocks emit `data-color-scheme` to opt into a non-default scheme;
 *      child elements then resolve `var(--theme-*)` to the scheme colors.
 *
 * Plan 11 introduced the per-theme stylesheet; Plan 13.1 extends it with
 * Shopify-style schemes that any block can pick.
 */
export async function getThemesCssBundle(): Promise<ThemesCssBundle> {
  const themes = await fetchThemesForCss()

  if (themes.length === 0) {
    return { css: "/* no themes installed */\n", hash: "fallback" }
  }

  const rules: string[] = []
  const active = themes.find((t) => t.active)

  for (const t of themes) {
    const tokens = resolveTokens(t.tokens as ThemeTokens | null)
    const schemes = resolveColorSchemes(t.colorSchemes, t.tokens as ThemeTokens | null)
    const themeSelector = `.theme-${cssIdentSafe(t.id)}`

    // Layer 1: theme defaults — fonts, scale, AND the colors of the FIRST
    // scheme (the theme default). Any block that doesn't pick a scheme
    // inherits these.
    const defaultScheme: ColorScheme = schemes[0]
    const defaultRule = themeRule(themeSelector, tokens, defaultScheme)
    rules.push(defaultRule)

    // Layer 2: per-scheme overrides. We skip the first scheme — it's
    // already encoded in layer 1 — and emit overrides for the rest.
    for (let i = 1; i < schemes.length; i++) {
      const scheme = schemes[i]
      const lines = schemeToCssLines(scheme)
      rules.push(
        `${themeSelector} [data-color-scheme="${cssAttrSafe(scheme.id)}"] {\n${lines.join("\n")}\n}`,
      )
    }
    // Also emit a rule for the first scheme by id so blocks can
    // explicitly pick the default scheme via `data-color-scheme="<id>"`
    // when nesting under another scheme (override → revert pattern).
    rules.push(
      `${themeSelector} [data-color-scheme="${cssAttrSafe(defaultScheme.id)}"] {\n${schemeToCssLines(defaultScheme).join("\n")}\n}`,
    )
  }

  // unstable_cache serializes results to JSON, which turns Date into a string.
  // Normalize through `new Date(...)` so cache hits don't crash on `.getTime()`.
  const maxTs = themes.reduce(
    (acc, t) => Math.max(acc, new Date(t.updatedAt).getTime()),
    0,
  )
  const hash = `${maxTs.toString(36)}-${active?.id ?? "none"}`

  return {
    css: rules.join("\n\n"),
    hash,
  }
}

/**
 * Builds the theme-default CSS rule by combining tokens (fonts/scale +
 * fallback colors from the legacy `tokens.colors`) with the first
 * scheme's colors. Scheme colors win where they overlap with tokens.
 */
function themeRule(
  selector: string,
  tokens: ReturnType<typeof resolveTokens>,
  scheme: ColorScheme,
): string {
  // Reuse tokensToCssRule for fonts + scale; then layer in the scheme.
  const tokenLines = tokensToCssRule(selector, tokens)
    .replace(`${selector} {\n`, "")
    .replace(/\n\}$/, "")
    .split("\n")
    // Drop legacy color lines so the scheme owns them — avoids double
    // declarations and keeps the rule deterministic.
    .filter((line) => !/--theme-(primary|primary-foreground|accent|accent-foreground|bg|text|muted|border|drawer-bg|drawer-text|card-bg|card-text):/.test(line))

  const schemeLines = schemeToCssLines(scheme)
  return `${selector} {\n${[...tokenLines, ...schemeLines].join("\n")}\n}`
}

function cssIdentSafe(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_")
}

function cssAttrSafe(input: string): string {
  return input.replace(/["\\]/g, "")
}

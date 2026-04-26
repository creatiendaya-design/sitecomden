import { prisma } from "@/lib/db"
import {
  resolveTokens,
  tokensToCssRule,
  type ThemeTokens,
} from "./tokens"

export interface ThemesCssBundle {
  /** Final CSS body. Stable hash → safe to serve with immutable cache. */
  css: string
  /** Hash derived from MAX(updatedAt) of all themes, suitable as cache buster
   *  in the URL: /api/themes/tokens.css?h=<hash>. */
  hash: string
}

/**
 * Generates the storefront's themes stylesheet — a single CSS body with
 * one rule per theme keyed by `.theme-<slug>` plus a `:root` fallback that
 * uses the currently-active theme's tokens. The storefront layout sets
 * `<body class="theme-<slug>">` so the right rule wins.
 *
 * Plan 11 — served via /api/themes/tokens.css with hash-based cache busting.
 * Active themes are read from the DB; the hash is derived from the max
 * updatedAt + active id so any token edit produces a new URL.
 */
export async function getThemesCssBundle(): Promise<ThemesCssBundle> {
  // Pull all themes + their tokens. Each theme uses its own id as the
  // class scope so even non-active themes can be previewed via the cookie.
  const themes = await prisma.theme.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      active: true,
      tokens: true,
      updatedAt: true,
    },
  })

  if (themes.length === 0) {
    // No themes installed yet. Tailwind uses inline fallbacks
    // (`var(--theme-primary, <hex>)`) for unscoped pages so the storefront
    // still renders. We emit an empty body so the endpoint returns valid
    // CSS rather than a 404.
    return { css: "/* no themes installed */\n", hash: "fallback" }
  }

  // We deliberately do NOT emit a :root rule. The storefront layout wraps
  // all rendered output in `<div class="theme-<id>">`, scoping these
  // tokens to the storefront only. Admin pages don't see them, so the
  // admin design system stays independent.
  const rules: string[] = []
  const active = themes.find((t) => t.active)

  for (const t of themes) {
    rules.push(
      tokensToCssRule(
        `.theme-${cssIdentSafe(t.id)}`,
        resolveTokens(t.tokens as ThemeTokens | null),
      ),
    )
  }

  // Hash combines the highest updatedAt + active id so:
  //   - editing any theme's tokens → new hash → cache miss
  //   - switching active theme → new hash (same edit time, different id)
  const maxTs = themes.reduce(
    (acc, t) => Math.max(acc, t.updatedAt.getTime()),
    0,
  )
  const hash = `${maxTs.toString(36)}-${active?.id ?? "none"}`

  return {
    css: rules.join("\n\n"),
    hash,
  }
}

/**
 * Strips characters that aren't valid in CSS class names. cuids are
 * already safe, but if someone manually inserts a theme with a weirder id
 * we fail safe rather than emit broken CSS.
 */
function cssIdentSafe(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_")
}

import { cache } from "react"
import { prisma } from "@/lib/db"
import { resolveColorSchemes, type ColorSchemeArray } from "./color-schemes"
import type { ThemeTokens } from "./tokens"

/**
 * Resolved color schemes of the singleton-active theme, for admin editors
 * that live OUTSIDE the customizer (e.g. the landing-template builder).
 *
 * The customizer gets schemes from the theme it is editing; standalone
 * builders have no theme in scope, so they read the active theme here.
 * Landing templates render on the storefront under whatever theme is
 * active, and the scheme CSS (`--theme-*` rebinding) is global to that
 * theme — so a `colorSchemeId` chosen here resolves correctly at render
 * time with no backend/rendering change.
 *
 * Always returns the resolved array (`resolveColorSchemes` synthesizes a
 * single scheme from `tokens.colors` when the column is empty). Returns
 * `[]` only when there is no active theme at all, so a scheme picker can
 * hide itself (it gates on `schemes.length < 2`).
 *
 * Wrapped in React.cache so multiple callers per request dedupe to one
 * Postgres roundtrip.
 */
export const getActiveThemeColorSchemes = cache(
  async (): Promise<ColorSchemeArray> => {
    const theme = await prisma.theme.findFirst({
      where: { active: true },
      select: { colorSchemes: true, tokens: true },
    })
    if (!theme) return []
    return resolveColorSchemes(
      theme.colorSchemes,
      theme.tokens as ThemeTokens | null,
    )
  },
)

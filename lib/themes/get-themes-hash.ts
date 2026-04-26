import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"

/**
 * Cheap fetcher (Plan 11): returns the cache-buster hash to embed in
 * `<link href="/api/themes/tokens.css?h=...">`. Touches only updatedAt
 * + active flag — much cheaper than rebuilding the full CSS bundle on
 * every page request. The CSS endpoint computes its own hash from the
 * full read; both must agree on the formula.
 *
 * Plan 12 perf: also cached cross-request with the same tags as the CSS
 * bundle so the layout's <link href> doesn't re-query Postgres on every
 * page render.
 */
export const getThemesHash = unstable_cache(
  async (): Promise<string> => {
    const rows = await prisma.theme.findMany({
      select: { id: true, active: true, updatedAt: true },
    })
    if (rows.length === 0) return "fallback"
    const active = rows.find((r) => r.active)
    const maxTs = rows.reduce(
      (acc, r) => Math.max(acc, r.updatedAt.getTime()),
      0,
    )
    return `${maxTs.toString(36)}-${active?.id ?? "none"}`
  },
  ["themes-hash"],
  { tags: ["active-theme-tokens", "active-theme"] },
)

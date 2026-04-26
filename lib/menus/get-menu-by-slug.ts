import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"
import { resolveMenuFromRow, type ResolvedMenu } from "./resolve-menu"

// Re-exports for callers that already import these from here.
export type { ResolvedMenu, ResolvedMenuItem } from "./resolve-menu"

interface RawMenuRow {
  id: string
  slug: string
  title: string
  active: boolean
  items: {
    id: string
    parentId: string | null
    position: number
    label: string
    linkType: string
    targetId: string | null
    externalUrl: string | null
    openInNewTab: boolean
  }[]
}

/**
 * Plan 12 perf: cached DB read for a menu by slug. Tag invalidation:
 *   - `menu:<slug>` is bumped by actions/menus.ts when the row changes
 *   - `active-theme-menus` is bumped when the active theme switches
 * The expensive sibling query (joining target slugs) is NOT cached here
 * because resolveMenuFromRow may resolve dozens of unique target ids; we
 * accept that cost — it's a few cheap-by-id queries that Postgres handles
 * trivially. Future iteration can cache those separately by id.
 */
function fetchMenuRowBySlugUncached(slug: string): Promise<RawMenuRow | null> {
  return prisma.menu.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      active: true,
      items: {
        orderBy: [{ parentId: "asc" }, { position: "asc" }],
        select: {
          id: true,
          parentId: true,
          position: true,
          label: true,
          linkType: true,
          targetId: true,
          externalUrl: true,
          openInNewTab: true,
        },
      },
    },
  })
}

const fetchMenuRowBySlug = (slug: string) =>
  unstable_cache(
    () => fetchMenuRowBySlugUncached(slug),
    ["menu-by-slug", slug],
    { tags: [`menu:${slug}`, "active-theme-menus"] },
  )()

/**
 * Storefront-facing fetcher: returns the active menu with the given slug,
 * or null if not found / inactive. Items come back as a tree with the
 * target slugs already pre-joined so `resolveMenuItemHref` doesn't need
 * to hit the DB at render time.
 *
 * Plan 9 added `getThemedMenu(surface)` which prefers the menu assigned to
 * the active/preview theme, falling back to this slug-based fetch. New
 * callers should use that; this remains for direct lookups by slug.
 */
export async function getMenuBySlug(slug: string): Promise<ResolvedMenu | null> {
  const menu = await fetchMenuRowBySlug(slug)
  if (!menu || !menu.active) return null
  return resolveMenuFromRow(menu)
}

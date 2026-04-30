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
 * Plan 16 perf: cached DB read for a menu by id. Mirrors `get-menu-by-slug.ts`
 * but keys on Menu.id instead of Menu.slug. Used by theme-section renderers
 * (e.g. HeaderMain, FooterMenu) where the section content stores a menu id
 * rather than a slug. Tag invalidation:
 *   - `menu:id:<id>` is bumped when the row changes
 *   - `active-theme-menus` is bumped when the active theme switches
 */
function fetchMenuRowByIdUncached(id: string): Promise<RawMenuRow | null> {
  return prisma.menu.findUnique({
    where: { id },
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

const fetchMenuRowById = (id: string) =>
  unstable_cache(
    () => fetchMenuRowByIdUncached(id),
    ["menu-by-id", id],
    { tags: [`menu:id:${id}`, "active-theme-menus"] },
  )()

/**
 * Storefront-facing fetcher: returns the active menu with the given id,
 * or null if not found / inactive. Items come back as a tree with the
 * target slugs already pre-joined so `resolveMenuItemHref` doesn't need
 * to hit the DB at render time.
 */
export async function getMenuById(id: string): Promise<ResolvedMenu | null> {
  const menu = await fetchMenuRowById(id)
  if (!menu || !menu.active) return null
  return resolveMenuFromRow(menu)
}

import { prisma } from "@/lib/db"
import { resolveMenuFromRow } from "./resolve-menu"

// Re-exports for callers that already import these from here.
export type { ResolvedMenu, ResolvedMenuItem } from "./resolve-menu"

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
export async function getMenuBySlug(slug: string) {
  const menu = await prisma.menu.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: [{ parentId: "asc" }, { position: "asc" }],
      },
    },
  })
  if (!menu || !menu.active) return null
  return resolveMenuFromRow(menu)
}

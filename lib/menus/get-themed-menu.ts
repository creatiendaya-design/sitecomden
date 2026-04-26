import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"
import { resolveActiveTheme } from "@/lib/themes/resolve-active-theme"
import { getMenuBySlug, type ResolvedMenu } from "./get-menu-by-slug"
import { resolveMenuFromRow } from "./resolve-menu"

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
 * Plan 12 perf: cached DB read for a menu by id (used when the theme
 * points at a specific menu via headerMenuId / footerMenuId).
 *   - `menu-id:<id>` is the per-row tag (would need a updateTag on edit;
 *     we already bump `active-theme-menus` from actions/menus.ts which is
 *     enough for the storefront to refresh).
 *   - `active-theme-menus` is the umbrella tag bumped on any menu edit
 *     OR on theme switch.
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
    { tags: [`menu-id:${id}`, "active-theme-menus"] },
  )()

/**
 * Storefront menu fetcher (Plan 9). Resolution order:
 *
 *  1. Active/preview theme has the relevant menu assigned (`headerMenuId`
 *     or `footerMenuId`) → fetch that menu by id.
 *  2. Otherwise → fall back to the legacy slug-based fetch (`"main"` for
 *     header, `"footer"` for footer). Keeps existing seeds working.
 *
 * Pass `surface: "header" | "footer"` to declare which slot you want; the
 * function picks the right theme field and the right fallback slug.
 */
export async function getThemedMenu(
  surface: "header" | "footer",
): Promise<ResolvedMenu | null> {
  const theme = await resolveActiveTheme()
  const themeMenuId =
    surface === "header" ? theme?.headerMenuId : theme?.footerMenuId

  if (themeMenuId) {
    const themeMenu = await fetchMenuRowById(themeMenuId)
    if (themeMenu && themeMenu.active) {
      return resolveMenuFromRow(themeMenu)
    }
    // Theme pointed at a deleted/inactive menu — fall through to slug.
  }

  const fallbackSlug = surface === "header" ? "main" : "footer"
  return getMenuBySlug(fallbackSlug)
}

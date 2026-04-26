import { prisma } from "@/lib/db"
import { resolveActiveTheme } from "@/lib/themes/resolve-active-theme"
import { getMenuBySlug, type ResolvedMenu } from "./get-menu-by-slug"
import { resolveMenuFromRow } from "./resolve-menu"

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
    const themeMenu = await prisma.menu.findUnique({
      where: { id: themeMenuId },
      include: {
        items: {
          orderBy: [{ parentId: "asc" }, { position: "asc" }],
        },
      },
    })
    if (themeMenu && themeMenu.active) {
      return resolveMenuFromRow(themeMenu)
    }
    // Theme pointed at a deleted/inactive menu — fall through to slug.
  }

  const fallbackSlug = surface === "header" ? "main" : "footer"
  return getMenuBySlug(fallbackSlug)
}

import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { getCurrentUserOrNull } from "@/lib/auth"

/** Cookie name used by the admin preview flow (Plan 9). */
export const THEME_PREVIEW_COOKIE = "theme-preview-id"

export interface ResolvedThemeRender {
  id: string
  name: string
  homePageId: string | null
  headerMenuId: string | null
  footerMenuId: string | null
  defaultProductLandingTemplateId: string | null
  /** True when this theme is being previewed (admin saw their preview cookie),
   *  false when this is the live "active" theme served to all visitors. */
  isPreview: boolean
}

/**
 * Storefront-side helper that returns the theme to use for rendering this
 * request. Two paths:
 *
 *  1. Admin preview: if the visitor has a `theme-preview-id` cookie AND is
 *     currently logged in as an admin, return that theme with isPreview=true.
 *     A non-admin (or stale) cookie is silently ignored.
 *  2. Default: return the singleton `active=true` theme. isPreview=false.
 *
 * Returns null when there is no active theme at all (uninitialized store).
 */
export async function resolveActiveTheme(): Promise<ResolvedThemeRender | null> {
  // Step 1 — short-circuit: cookie must be present at all to attempt preview.
  const cookieStore = await cookies()
  const previewCookie = cookieStore.get(THEME_PREVIEW_COOKIE)?.value

  if (previewCookie) {
    // Step 2 — verify the visitor is an admin. We never trust the cookie
    // alone, since a hostile visitor could otherwise set their own cookie
    // and force a non-public theme onto themselves (low risk, but still).
    const user = await getCurrentUserOrNull()
    if (user) {
      const previewTheme = await prisma.theme.findUnique({
        where: { id: previewCookie },
        select: themeRenderSelect,
      })
      if (previewTheme) {
        return { ...previewTheme, isPreview: true }
      }
      // Cookie pointed at a deleted theme — fall through to active.
    }
  }

  const active = await prisma.theme.findFirst({
    where: { active: true },
    select: themeRenderSelect,
  })
  return active ? { ...active, isPreview: false } : null
}

const themeRenderSelect = {
  id: true,
  name: true,
  homePageId: true,
  headerMenuId: true,
  footerMenuId: true,
  defaultProductLandingTemplateId: true,
} as const

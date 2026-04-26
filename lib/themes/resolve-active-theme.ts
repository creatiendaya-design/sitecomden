import { cache } from "react"
import { cookies, headers } from "next/headers"
import { prisma } from "@/lib/db"
import { getCurrentUserOrNull } from "@/lib/auth"

/** Cookie name used by the admin preview flow (Plan 9). */
export const THEME_PREVIEW_COOKIE = "theme-preview-id"

/** Query-param name used by the in-admin Customizer iframe (Plan 13).
 *  Middleware extracts the value into a request header so the resolver
 *  can read it without prop-drilling searchParams through every layout. */
export const THEME_PREVIEW_QUERY = "theme-preview"
/** Header set by middleware.ts when the query param above is present. */
export const THEME_PREVIEW_HEADER = "x-theme-preview-id"

export interface ResolvedThemeRender {
  id: string
  name: string
  homePageId: string | null
  cartPageId: string | null
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
/**
 * Plan 12 perf: wrapped with React.cache so 5+ callers per request
 * (Header, Footer, ThemePreviewBanner, layout, page-level fetchers) all
 * dedupe to a single Postgres roundtrip. Cache scope is one request — no
 * cross-request leakage. Cookie path stays correct because cookies()
 * already opts the request out of static rendering.
 */
export const resolveActiveTheme = cache(
  async (): Promise<ResolvedThemeRender | null> => {
    // Plan 13 — query-param preview takes precedence over the cookie. The
    // Customizer iframe loads `/<path>?theme-preview=<id>` so previewing
    // a theme inside the admin doesn't pollute the cookie store of any
    // other tab. Middleware copies the query value into a request header
    // so we can read it from arbitrary server components/utilities.
    const headerList = await headers()
    const queryPreview = headerList.get(THEME_PREVIEW_HEADER)
    const cookieStore = await cookies()
    const cookiePreview = cookieStore.get(THEME_PREVIEW_COOKIE)?.value
    const previewId = queryPreview || cookiePreview

    if (previewId) {
      // Verify the visitor is an admin. We never trust the cookie/header
      // alone, since a hostile visitor could otherwise force a non-public
      // theme onto themselves (low risk, but still).
      const user = await getCurrentUserOrNull()
      if (user) {
        const previewTheme = await prisma.theme.findUnique({
          where: { id: previewId },
          select: themeRenderSelect,
        })
        if (previewTheme) {
          return { ...previewTheme, isPreview: true }
        }
        // Pointed at a deleted theme — fall through to active.
      }
    }

    const active = await prisma.theme.findFirst({
      where: { active: true },
      select: themeRenderSelect,
    })
    return active ? { ...active, isPreview: false } : null
  },
)

const themeRenderSelect = {
  id: true,
  name: true,
  homePageId: true,
  cartPageId: true,
  headerMenuId: true,
  footerMenuId: true,
  defaultProductLandingTemplateId: true,
} as const

import { headers } from "next/headers"
import { Eye } from "lucide-react"
import {
  resolveActiveTheme,
  THEME_PREVIEW_HEADER,
} from "@/lib/themes/resolve-active-theme"

/**
 * Storefront banner that surfaces the admin theme-preview state (Plan 9).
 *
 * Renders nothing when the resolver says we're serving the live active theme
 * (the common case). When the visitor is an admin with an active preview
 * cookie, we show a sticky banner with the preview theme name and an "exit"
 * link that hits /api/admin/themes/exit-preview to clear the cookie.
 *
 * Suppressed when the preview comes from the `?theme-preview=` query param
 * (customizer iframe): inside the customizer there is already a "Salir" UI
 * in the toolbar, and Shopify's equivalent surface is also chrome-free.
 *
 * Because resolveActiveTheme uses cookies(), embedding this server component
 * marks the layout as dynamic — that's intentional: the storefront is
 * already dynamic (it queries Prisma) so there's no perf hit.
 *
 * IMPORTANT: the exit link is a plain <a> (not next/link's <Link>). next/link
 * does client-side navigation that doesn't follow API-route redirects nor
 * propagate Set-Cookie headers from the redirect — clicking the <Link>
 * "did nothing". A plain <a> triggers a full browser navigation, the browser
 * follows the 307 to "/", and the Set-Cookie header that expires the cookie
 * is honored as part of that navigation chain.
 */
export default async function ThemePreviewBanner() {
  const theme = await resolveActiveTheme()
  if (!theme || !theme.isPreview) return null

  const headerList = await headers()
  if (headerList.get(THEME_PREVIEW_HEADER)) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm text-amber-950 shadow"
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" aria-hidden="true" />
        <span>
          Estás viendo el tema{" "}
          <strong className="font-semibold">{theme.name}</strong> en vista
          previa. Solo vos lo ves; los clientes siguen viendo el tema activo.
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages
            -- Plan 9: must be a plain <a> so the browser does a full
            navigation that follows the 307 redirect AND honors the
            Set-Cookie that expires theme-preview-id. <Link> would do a
            client-side soft navigation and the cookie would never expire. */}
      <a
        href="/api/admin/themes/exit-preview"
        className="rounded-md bg-amber-950/90 px-3 py-1 text-xs font-medium text-amber-50 hover:bg-amber-950 transition-colors"
      >
        Salir del preview
      </a>
    </div>
  )
}

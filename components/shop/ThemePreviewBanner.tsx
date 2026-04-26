import Link from "next/link"
import { Eye } from "lucide-react"
import { resolveActiveTheme } from "@/lib/themes/resolve-active-theme"

/**
 * Storefront banner that surfaces the admin theme-preview state (Plan 9).
 *
 * Renders nothing when the resolver says we're serving the live active theme
 * (the common case). When the visitor is an admin with an active preview
 * cookie, we show a sticky banner with the preview theme name and an "exit"
 * link that hits /api/admin/themes/exit-preview to clear the cookie.
 *
 * Because resolveActiveTheme uses cookies(), embedding this server component
 * marks the layout as dynamic — that's intentional: the storefront is
 * already dynamic (it queries Prisma) so there's no perf hit.
 */
export default async function ThemePreviewBanner() {
  const theme = await resolveActiveTheme()
  if (!theme || !theme.isPreview) return null

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
      <Link
        href="/api/admin/themes/exit-preview"
        className="rounded-md bg-amber-950/90 px-3 py-1 text-xs font-medium text-amber-50 hover:bg-amber-950 transition-colors"
        prefetch={false}
      >
        Salir del preview
      </Link>
    </div>
  )
}

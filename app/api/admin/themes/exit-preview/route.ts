import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { THEME_PREVIEW_COOKIE } from "@/lib/themes/resolve-active-theme"

/**
 * Clears the theme-preview cookie. No auth required: any visitor (even
 * non-admins, who shouldn't have the cookie set anyway) can call this to
 * stop being in preview mode. Plan 9.
 */
async function handle(request: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete(THEME_PREVIEW_COOKIE)
  // Honor a `next` query param so the banner can redirect back to the page
  // the admin was viewing rather than always sending them to /.
  const next = request.nextUrl.searchParams.get("next") ?? "/"
  // Defensively only allow same-origin paths.
  const safeNext = next.startsWith("/") ? next : "/"
  return NextResponse.redirect(new URL(safeNext, request.url))
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}

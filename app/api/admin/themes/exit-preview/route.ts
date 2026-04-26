import { NextRequest, NextResponse } from "next/server"
import { THEME_PREVIEW_COOKIE } from "@/lib/themes/resolve-active-theme"

/**
 * Clears the theme-preview cookie. No auth required: any visitor (even
 * non-admins, who shouldn't have the cookie set anyway) can call this to
 * stop being in preview mode. Plan 9.
 *
 * IMPORTANT: we set the Set-Cookie header DIRECTLY on the redirect
 * response (not via cookies().delete()), because Next.js doesn't reliably
 * merge the request-scoped cookie store into a user-returned NextResponse.
 * Using `maxAge: 0` is the universal "delete this cookie" pattern.
 */
function handle(request: NextRequest) {
  // Honor a `next` query param so the banner can redirect back to the page
  // the admin was viewing rather than always sending them to /.
  const next = request.nextUrl.searchParams.get("next") ?? "/"
  // Defensively only allow same-origin paths.
  const safeNext = next.startsWith("/") ? next : "/"
  const response = NextResponse.redirect(new URL(safeNext, request.url))
  response.cookies.set(THEME_PREVIEW_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  })
  return response
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}

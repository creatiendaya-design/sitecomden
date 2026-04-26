import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth"
import { THEME_PREVIEW_COOKIE } from "@/lib/themes/resolve-active-theme"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Sets the `theme-preview-id` cookie so the storefront renders with this
 * theme for the current admin only. Visitors without an admin session never
 * see the preview (resolveActiveTheme verifies admin status). Plan 9.
 *
 * GET is supported so admins can hit this URL from a plain link / new tab.
 * POST is also accepted for fetch-based flows.
 */
async function handle(_request: NextRequest, params: RouteParams["params"]) {
  const { user, response } = await requirePermission("themes:update")
  if (response) return response

  const { id } = await params

  // Verify the theme exists before setting the cookie — otherwise we'd
  // strand the admin in a broken preview that always falls back to active.
  const theme = await prisma.theme.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!theme) {
    return NextResponse.json(
      { error: "Tema no encontrado" },
      { status: 404 },
    )
  }

  const cookieStore = await cookies()
  cookieStore.set(THEME_PREVIEW_COOKIE, theme.id, {
    httpOnly: false, // banner client component reads this to know preview is on
    sameSite: "lax",
    path: "/",
    // 4-hour preview window. Long enough to iterate, short enough that an
    // accidentally-left preview cookie self-clears the same day.
    maxAge: 60 * 60 * 4,
  })

  // Avoid an unused-var lint hit while keeping the variable available for
  // future use (audit logging, etc.).
  void user

  return NextResponse.redirect(new URL("/", _request.url))
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return handle(request, params)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return handle(request, params)
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth"

/**
 * Lightweight menu listing for the MenuPickerField primitive used by theme
 * sections (Plan 16). Gated by `themes:update` so an admin who can edit
 * themes but not menus can still pick which existing menu a section uses.
 */
export async function GET() {
  const { response } = await requirePermission("themes:update")
  if (response) return response

  const menus = await prisma.menu.findMany({
    where: { active: true },
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true },
  })
  return NextResponse.json({ menus })
}

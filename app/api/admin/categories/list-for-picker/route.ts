import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth"

/**
 * Lightweight collection (Category) listing for the CategoryPickerField
 * primitive used by theme sections (FEATURED_COLLECTION "Colección específica"
 * source). Gated by `themes:update` so an admin who can edit themes can pick
 * which existing collection a section renders — mirrors the menus picker.
 *
 * Returns each active, non-deleted category with its materialized product
 * count (smart + manual collections both persist rows in ProductCategory).
 */
export async function GET() {
  const { response } = await requirePermission("themes:update")
  if (response) return response

  const categories = await prisma.category.findMany({
    where: { active: true, deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: true } },
    },
  })

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      productCount: c._count.products,
    })),
  })
}

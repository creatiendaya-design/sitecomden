import { protectRoute } from "@/lib/protect-route"
import { getMenu } from "@/actions/menus"
import { listPages } from "@/actions/pages"
import { MenuTreeEditor } from "@/components/admin/menus/MenuTreeEditor"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function MenuEditorPage({
  params,
}: {
  params: Promise<{ menuId: string }>
}) {
  await protectRoute("menus:update")
  const { menuId } = await params

  const [menu, pages, categories] = await Promise.all([
    getMenu(menuId),
    listPages(),
    // Categories: simple list for the LinkTargetPicker dropdown.
    prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ])
  if (!menu) notFound()

  return (
    <MenuTreeEditor
      menu={{ id: menu.id, title: menu.title, slug: menu.slug }}
      initialItems={menu.items}
      pages={pages
        .filter((p) => p.active)
        .map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
      categories={categories}
    />
  )
}

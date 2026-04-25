import { protectRoute } from "@/lib/protect-route"
import { listMenus } from "@/actions/menus"
import { MenuListGrid } from "@/components/admin/menus/MenuListGrid"

export const dynamic = "force-dynamic"

export default async function MenusListPage() {
  await protectRoute("menus:view")
  const menus = await listMenus()
  return <MenuListGrid initialMenus={menus} />
}

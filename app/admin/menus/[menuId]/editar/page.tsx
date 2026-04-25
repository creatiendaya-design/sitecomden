import { protectRoute } from "@/lib/protect-route"
import { getMenu } from "@/actions/menus"
import { EditMenuMetadataForm } from "@/components/admin/menus/EditMenuMetadataForm"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function EditMenuMetadataPage({
  params,
}: {
  params: Promise<{ menuId: string }>
}) {
  await protectRoute("menus:update")
  const { menuId } = await params
  const menu = await getMenu(menuId)
  if (!menu) notFound()
  return (
    <div className="container mx-auto max-w-2xl py-8">
      <h1 className="mb-6 text-2xl font-bold">Editar metadata</h1>
      <EditMenuMetadataForm menu={menu} />
    </div>
  )
}

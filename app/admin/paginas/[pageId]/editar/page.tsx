import { protectRoute } from "@/lib/protect-route"
import { getPage } from "@/actions/pages"
import { EditPageMetadataForm } from "@/components/admin/pages/EditPageMetadataForm"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function EditPageMetadataPage({
  params,
}: {
  params: Promise<{ pageId: string }>
}) {
  await protectRoute("pages:update")
  const { pageId } = await params
  const page = await getPage(pageId)
  if (!page) notFound()
  return (
    <div className="container mx-auto max-w-2xl py-8">
      <h1 className="mb-6 text-2xl font-bold">Editar metadata</h1>
      <EditPageMetadataForm page={page} />
    </div>
  )
}

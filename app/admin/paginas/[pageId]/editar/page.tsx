import { protectRoute } from "@/lib/protect-route"
import { getPage } from "@/actions/pages"
import { EditPageMetadataForm } from "@/components/admin/pages/EditPageMetadataForm"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function EditPageMetadataPage({
  params,
}: {
  params: Promise<{ pageId: string }>
}) {
  await protectRoute("pages:update")
  const { pageId } = await params
  const [page, activeTheme] = await Promise.all([
    getPage(pageId),
    prisma.theme.findFirst({
      where: { active: true },
      select: { homePageId: true },
    }),
  ])
  if (!page) notFound()
  const isHome = activeTheme?.homePageId === page.id
  return (
    <div className="container mx-auto max-w-2xl py-8">
      <h1 className="mb-6 text-2xl font-bold">Editar metadata</h1>
      <EditPageMetadataForm page={page} isHome={isHome} />
    </div>
  )
}

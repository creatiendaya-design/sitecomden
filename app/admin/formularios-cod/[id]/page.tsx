import { notFound } from "next/navigation"
import { protectRoute } from "@/lib/protect-route"
import { getTemplate } from "@/actions/cod-form-templates"
import { prisma } from "@/lib/db"
import CodFormEditor from "@/components/admin/cod-forms/CodFormEditor"

export const dynamic = "force-dynamic"

export default async function CodFormEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await protectRoute("cod-forms:view")
  const { id } = await params

  let template
  try {
    template = await getTemplate(id)
  } catch {
    notFound()
  }

  const pages = await prisma.page.findMany({
    where: { active: true },
    select: { id: true, slug: true, title: true },
    orderBy: { title: "asc" },
  })

  return <CodFormEditor template={template} pages={pages} />
}

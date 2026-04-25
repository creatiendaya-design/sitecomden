import { protectRoute } from "@/lib/protect-route"
import { getLandingTemplate } from "@/actions/landing-templates"
import { EditTemplateMetadataForm } from "@/components/admin/landing-templates/EditTemplateMetadataForm"
import { notFound } from "next/navigation"

export default async function EditTemplateMetadataPage({
  params,
}: {
  params: Promise<{ templateId: string }>
}) {
  await protectRoute("landing_templates:update")
  const { templateId } = await params
  const template = await getLandingTemplate(templateId)
  if (!template) notFound()

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Editar metadata</h1>
      <EditTemplateMetadataForm template={template} />
    </div>
  )
}

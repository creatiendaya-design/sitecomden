import { protectRoute } from "@/lib/protect-route"
import { getCurrentUserId } from "@/lib/auth"
import { getLandingTemplate } from "@/actions/landing-templates"
import { TemplateBuilderShell } from "@/components/admin/landing-templates/TemplateBuilderShell"
import { notFound } from "next/navigation"
import type { BlockInstance, LandingBlockType, BlockContentV2 } from "@/lib/blocks/types"

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>
}) {
  await protectRoute("landing_templates:update")
  const { templateId } = await params

  const [template, userId] = await Promise.all([
    getLandingTemplate(templateId),
    getCurrentUserId(),
  ])
  if (!template) notFound()

  const initialBlocks: BlockInstance[] = template.templateBlocks.map((b) => ({
    id: b.id,
    type: b.type as LandingBlockType,
    position: b.position,
    content: b.content as BlockContentV2,
  }))

  return (
    <TemplateBuilderShell
      template={{ id: template.id, name: template.name }}
      initialBlocks={initialBlocks}
      userId={userId}
      persistedAt={template.updatedAt.getTime()}
    />
  )
}

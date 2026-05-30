import { protectRoute } from "@/lib/protect-route"
import { getCurrentUserId } from "@/lib/auth"
import { getLandingTemplate } from "@/actions/landing-templates"
import { getActiveThemeColorSchemes } from "@/lib/themes/get-active-theme-color-schemes"
import { getActiveThemeCanvasCss } from "@/lib/themes/get-active-theme-canvas-css"
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

  const [template, userId, colorSchemes, canvasCss] = await Promise.all([
    getLandingTemplate(templateId),
    getCurrentUserId(),
    // Active theme's schemes so the Estilo tab's scheme picker can populate.
    // Landing templates render under the active theme on the storefront, so
    // a colorSchemeId picked here resolves against that same theme's CSS.
    getActiveThemeColorSchemes(),
    // Active theme's stylesheet + wrapper class so the editor canvas previews
    // the chosen scheme live (same CSS the storefront serves).
    getActiveThemeCanvasCss(),
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
      template={{ id: template.id, name: template.name, version: template.version }}
      initialBlocks={initialBlocks}
      userId={userId}
      persistedAt={template.updatedAt.getTime()}
      colorSchemes={colorSchemes}
      themeClassName={canvasCss.themeClassName}
      themeCss={canvasCss.css}
    />
  )
}

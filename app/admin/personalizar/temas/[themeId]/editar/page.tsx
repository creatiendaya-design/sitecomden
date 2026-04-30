import { protectRoute } from "@/lib/protect-route"
import { getTheme } from "@/actions/themes"
import { listLandingTemplates } from "@/actions/landing-templates"
import { EditThemeMetadataForm } from "@/components/admin/themes/EditThemeMetadataForm"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

/**
 * Theme metadata edit page.
 *
 * Tokens / color schemes / fonts moved to the Customizer in Plan 13.1
 * (CustomizerTokensPanel) — that's the only authoring surface for visual
 * identity now. This page keeps the basics: name, description, default
 * product landing template.
 */
export default async function EditThemeMetadataPage({
  params,
}: {
  params: Promise<{ themeId: string }>
}) {
  await protectRoute("themes:update")
  const { themeId } = await params

  const [theme, landingTemplates] = await Promise.all([
    getTheme(themeId),
    listLandingTemplates({ active: true }),
  ])
  if (!theme) notFound()

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Editar tema</h1>
      <EditThemeMetadataForm theme={theme} landingTemplates={landingTemplates} />
    </div>
  )
}

import { protectRoute } from "@/lib/protect-route"
import { getTheme } from "@/actions/themes"
import { listLandingTemplates } from "@/actions/landing-templates"
import { EditThemeMetadataForm } from "@/components/admin/themes/EditThemeMetadataForm"
import { ThemeTokensForm } from "@/components/admin/themes/ThemeTokensForm"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

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
    <div className="container mx-auto py-8 max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-6">Editar tema</h1>
        <EditThemeMetadataForm theme={theme} landingTemplates={landingTemplates} />
      </div>

      <hr className="border-border" />

      <ThemeTokensForm theme={theme} />
    </div>
  )
}

import { protectRoute } from "@/lib/protect-route"
import { getActiveTheme, listThemes } from "@/actions/themes"
import { listLandingTemplates } from "@/actions/landing-templates"
import { listPagesForThemePicker } from "@/actions/pages"
import { ActiveThemeEditor } from "@/components/admin/themes/ActiveThemeEditor"

export const dynamic = "force-dynamic"

export default async function PersonalizarPage() {
  await protectRoute("themes:view")
  const [activeTheme, allThemes, landingTemplates, pages] = await Promise.all([
    getActiveTheme(),
    listThemes(),
    listLandingTemplates({ active: true }),
    listPagesForThemePicker(),
  ])
  return (
    <ActiveThemeEditor
      activeTheme={activeTheme}
      allThemes={allThemes}
      landingTemplates={landingTemplates}
      pages={pages}
    />
  )
}

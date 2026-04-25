import { protectRoute } from "@/lib/protect-route"
import { listThemes } from "@/actions/themes"
import { ThemeListGrid } from "@/components/admin/themes/ThemeListGrid"

export const dynamic = "force-dynamic"

export default async function ThemesListPage() {
  await protectRoute("themes:view")
  const themes = await listThemes()
  return <ThemeListGrid initialThemes={themes} />
}

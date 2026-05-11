import { getThemedSections } from "@/lib/theme-sections/resolve-active-sections"
import { ThemeSectionRenderer } from "./theme-sections/ThemeSectionRenderer"
import LegacyFooter from "./legacy/LegacyFooter"

/**
 * Plan 16 — storefront switch-over. The footer is now driven by
 * `ThemeSection` rows (group = FOOTER). When the active theme has zero
 * sections we fall back to the legacy hardcoded layout. The outer
 * `<footer>` keeps the dark gradient background so individual section
 * renderers can stay focused on their own content without each having
 * to re-paint the page background.
 */
export default async function Footer() {
  const sections = await getThemedSections("FOOTER")
  if (sections.length === 0) return <LegacyFooter />
  return (
    <footer className="border-t bg-gradient-to-b from-gray-900 to-black text-white">
      {sections.map((s) => (
        <ThemeSectionRenderer key={s.id} section={s} />
      ))}
    </footer>
  )
}

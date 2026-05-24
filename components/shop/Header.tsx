import { getThemedSections } from "@/lib/theme-sections/resolve-active-sections"
import { ThemeSectionRenderer } from "./theme-sections/ThemeSectionRenderer"
import LegacyHeader from "./legacy/LegacyHeader"

/**
 * Plan 16 — storefront switch-over. The header is now driven by
 * `ThemeSection` rows (group = HEADER). When the active theme has zero
 * sections we fall back to the legacy hardcoded layout so a misconfigured
 * theme never produces an empty page.
 *
 * The outer wrapper intentionally has NO background/border/blur so admin
 * style controls on a HEADER section (bg color, border, shadow, corner
 * radius) actually show through. Sections render fully opaque defaults,
 * so there's no visual gap. `sticky top-0 z-50` is the only layout
 * concern that must live at this level so the whole header bar sits
 * above page content.
 */
export default async function Header() {
  const sections = await getThemedSections("HEADER")
  if (sections.length === 0) return <LegacyHeader />
  return (
    <header className="sticky top-0 z-50 w-full">
      {sections.map((s) => (
        <ThemeSectionRenderer key={s.id} section={s} />
      ))}
    </header>
  )
}

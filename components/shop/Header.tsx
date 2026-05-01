import { getThemedSections } from "@/lib/theme-sections/resolve-active-sections"
import { ThemeSectionRenderer } from "./theme-sections/ThemeSectionRenderer"
import LegacyHeader from "./legacy/LegacyHeader"

/**
 * Plan 16 — storefront switch-over. The header is now driven by
 * `ThemeSection` rows (group = HEADER). When the active theme has zero
 * sections we fall back to the legacy hardcoded layout so a misconfigured
 * theme never produces an empty page. The outer `<header>` wrapper keeps
 * the same sticky/backdrop classes the legacy layout used so layout-level
 * CSS expectations (e.g. content padding for sticky offset) are unchanged.
 */
export default async function Header() {
  const sections = await getThemedSections("HEADER")
  if (sections.length === 0) return <LegacyHeader />
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      {sections.map((s) => (
        <ThemeSectionRenderer key={s.id} section={s} />
      ))}
    </header>
  )
}

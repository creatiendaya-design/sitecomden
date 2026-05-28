import { getThemedSections } from "@/lib/theme-sections/resolve-active-sections"
import { ThemeSectionRenderer } from "./theme-sections/ThemeSectionRenderer"
import LegacyFooter from "./legacy/LegacyFooter"

/**
 * Plan 16 — storefront switch-over. The footer is driven by
 * `ThemeSection` rows (group = FOOTER). When the active theme has zero
 * sections we fall back to the legacy hardcoded layout.
 *
 * Phase 3 of the Shopify-style footer refactor — Shopify's model is
 * that the GROUP can hold multiple peer sections (Footer, Email
 * signup, etc.) and the main "Footer" section itself holds BLOCKS
 * (Menu, Text, Image, …). Both layers paint themselves: the section
 * wrapper (via `applyThemeSectionStyle`) owns the bg/scheme/padding
 * full-width, and the blocks render inside. The outer `<footer>` here
 * is intentionally empty — no padding, no bg, no border. Mirrors
 * `components/shop/Header.tsx`.
 */
export default async function Footer() {
  const sections = await getThemedSections("FOOTER")
  if (sections.length === 0) return <LegacyFooter />
  return (
    <footer>
      {sections.map((s) => (
        <ThemeSectionRenderer key={s.id} section={s} />
      ))}
    </footer>
  )
}

import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import { AnnouncementBar } from "./header/AnnouncementBar"
import { HeaderMain } from "./header/HeaderMain"
import { MegaMenu } from "./header/MegaMenu"
import { HeaderPromoBanner } from "./header/HeaderPromoBanner"
import { FooterRoot } from "./footer/FooterRoot"
import { EmailSignup } from "./footer/EmailSignup"
import { FooterBanner } from "./footer/FooterBanner"

/**
 * Renderers can be sync or async server components — both return
 * something React can render in a server tree, so we type the return
 * loosely as React.ReactNode and let React 19 handle the await.
 */
type RendererComponent = (props: {
  section: ResolvedThemeSection
}) => React.ReactNode | Promise<React.ReactNode>

const HEADER_RENDERERS: Record<string, RendererComponent> = {
  ANNOUNCEMENT_BAR: AnnouncementBar,
  HEADER_MAIN: HeaderMain,
  MEGA_MENU: MegaMenu,
  HEADER_PROMO_BANNER: HeaderPromoBanner,
}

// Phase 3 of the Shopify-style footer refactor — the entire footer is
// now a single FOOTER section with sub-blocks (Link column, Newsletter,
// Social, etc). The seven prior FOOTER_* types have been removed; the
// migration script `scripts/migrate-footer-sections.ts` rewrites
// existing rows.
//
// Phase 4 adds peer-level sections (EMAIL_SIGNUP, FOOTER_BANNER) so
// "Add section" in the customizer's footer zone offers meaningful
// options alongside the main Footer — matching Shopify's footer-group
// section list.
const FOOTER_RENDERERS: Record<string, RendererComponent> = {
  FOOTER: FooterRoot,
  EMAIL_SIGNUP: EmailSignup,
  FOOTER_BANNER: FooterBanner,
}

/**
 * Dispatches a `ResolvedThemeSection` to the renderer registered for its
 * `(group, type)` pair. Hidden sections and unknown types render nothing,
 * so the storefront degrades gracefully when a registry entry is added
 * to the DB before its renderer ships (or vice versa).
 */
export function ThemeSectionRenderer({
  section,
}: {
  section: ResolvedThemeSection
}) {
  if (!section.enabled) return null
  const Renderer =
    section.group === "HEADER"
      ? HEADER_RENDERERS[section.type]
      : FOOTER_RENDERERS[section.type]
  if (!Renderer) return null
  return <Renderer section={section} />
}

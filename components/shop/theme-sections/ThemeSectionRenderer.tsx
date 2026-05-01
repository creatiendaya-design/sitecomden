import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import { AnnouncementBar } from "./header/AnnouncementBar"
import { HeaderMain } from "./header/HeaderMain"
import { HeaderLogo } from "./header/HeaderLogo"
import { HeaderNav } from "./header/HeaderNav"
import { MegaMenu } from "./header/MegaMenu"
import { HeaderSearch } from "./header/HeaderSearch"
import { HeaderPromoBanner } from "./header/HeaderPromoBanner"
import { FooterColumns } from "./footer/FooterColumns"
import { FooterNewsletter } from "./footer/FooterNewsletter"
import { FooterSocial } from "./footer/FooterSocial"
import { FooterRichText } from "./footer/FooterRichText"
import { FooterPaymentIcons } from "./footer/FooterPaymentIcons"
import { FooterCopyright } from "./footer/FooterCopyright"

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
  HEADER_LOGO: HeaderLogo,
  HEADER_NAV: HeaderNav,
  MEGA_MENU: MegaMenu,
  HEADER_SEARCH: HeaderSearch,
  HEADER_PROMO_BANNER: HeaderPromoBanner,
}

const FOOTER_RENDERERS: Record<string, RendererComponent> = {
  FOOTER_COLUMNS: FooterColumns,
  FOOTER_NEWSLETTER: FooterNewsletter,
  FOOTER_SOCIAL: FooterSocial,
  FOOTER_RICH_TEXT: FooterRichText,
  FOOTER_PAYMENT_ICONS: FooterPaymentIcons,
  FOOTER_COPYRIGHT: FooterCopyright,
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

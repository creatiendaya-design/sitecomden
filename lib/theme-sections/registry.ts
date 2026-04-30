import type {
  ThemeSectionDefinition,
  ThemeSectionGroup,
  ThemeSectionCatalog,
  ThemeSectionBlockDefinition,
} from "./types"
import { announcementBarDefinition } from "./schema/announcement-bar"
import { headerMainDefinition } from "./schema/header-main"
import { headerLogoDefinition } from "./schema/header-logo"
import { headerNavDefinition } from "./schema/header-nav"
import { megaMenuDefinition } from "./schema/mega-menu"
import { headerSearchDefinition } from "./schema/header-search"
import { headerPromoBannerDefinition } from "./schema/header-promo-banner"
import { footerColumnsDefinition } from "./schema/footer-columns"
import { footerNewsletterDefinition } from "./schema/footer-newsletter"
import { footerSocialDefinition } from "./schema/footer-social"
import { footerRichTextDefinition } from "./schema/footer-rich-text"
import { footerPaymentIconsDefinition } from "./schema/footer-payment-icons"
import { footerCopyrightDefinition } from "./schema/footer-copyright"

const ALL_DEFINITIONS: ThemeSectionDefinition[] = [
  announcementBarDefinition,
  headerMainDefinition,
  headerLogoDefinition,
  headerNavDefinition,
  megaMenuDefinition,
  headerSearchDefinition,
  headerPromoBannerDefinition,
  footerColumnsDefinition,
  footerNewsletterDefinition,
  footerSocialDefinition,
  footerRichTextDefinition,
  footerPaymentIconsDefinition,
  footerCopyrightDefinition,
]

const registry: Map<string, ThemeSectionDefinition> = new Map(
  ALL_DEFINITIONS.map((d) => [d.type, d]),
)

export function getThemeSectionDefinition(
  type: string,
): ThemeSectionDefinition | undefined {
  return registry.get(type)
}

export function getAllThemeSectionDefinitions(): ThemeSectionDefinition[] {
  return Array.from(registry.values())
}

/**
 * Returns definitions available to the customizer's AddSectionPanel for a
 * given group, intersecting the global registry with the theme's catalog.
 * Empty catalog (`{}` or missing arm) = permissive default (all types in
 * that group are available).
 */
export function getAvailableSectionDefinitions(
  group: ThemeSectionGroup,
  catalog: ThemeSectionCatalog | null | undefined,
): ThemeSectionDefinition[] {
  const all = ALL_DEFINITIONS.filter((d) => d.groups.includes(group))
  const allowed = group === "HEADER" ? catalog?.header : catalog?.footer
  if (!allowed || allowed.length === 0) return all
  return all.filter((d) => allowed.includes(d.type))
}

/**
 * Sub-block definition lookup for a given parent section type.
 */
export function getSectionBlockDefinition(
  parentType: string,
  blockType: string,
):
  | { parent: ThemeSectionDefinition; block: ThemeSectionBlockDefinition }
  | undefined {
  const parent = registry.get(parentType)
  const block = parent?.acceptedBlockTypes?.find((b) => b.type === blockType)
  if (!parent || !block) return undefined
  return { parent, block }
}

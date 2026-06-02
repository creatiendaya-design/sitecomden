import type {
  ThemeSectionDefinition,
  ThemeSectionGroup,
  ThemeSectionCatalog,
  ThemeSectionBlockDefinition,
} from "./types"
import { announcementBarDefinition } from "./schema/announcement-bar"
import { headerMainDefinition } from "./schema/header-main"
import { megaMenuDefinition } from "./schema/mega-menu"
import { headerPromoBannerDefinition } from "./schema/header-promo-banner"
// Phase 3 of the Shopify-style footer refactor — single unified FOOTER
// section replaces the seven prior FOOTER_* types. Existing rows are
// migrated by `scripts/migrate-footer-sections.ts` before deploy.
import { footerDefinition } from "./schema/footer"
// Phase 4 — peer-level FOOTER-group sections to make "Add section"
// meaningful (matches Shopify's "Email signup" / "Image banner"
// alongside the main Footer section).
import { emailSignupDefinition } from "./schema/email-signup"
import { footerBannerDefinition } from "./schema/footer-banner"
// Plan 17 — Product template sections.
import { productMainDefinition } from "./schema/product-main"
import { richTextSectionDefinition } from "./schema/rich-text-section"
import { imageWithTextDefinition } from "./schema/image-with-text"
import { featuredCollectionDefinition } from "./schema/featured-collection"
import { testimonialsDefinition } from "./schema/testimonials"
import { faqSectionDefinition } from "./schema/faq-section"
import { productReviewsDefinition } from "./schema/product-reviews"
// Shopify-style universal-block adapter — exposes every `scope: "universal"`
// block from the page-builder registry as a PRODUCT-group section.
import { legacyBlockDefinition } from "./schema/legacy-block"

const ALL_DEFINITIONS: ThemeSectionDefinition[] = [
  announcementBarDefinition,
  headerMainDefinition,
  megaMenuDefinition,
  headerPromoBannerDefinition,
  footerDefinition,
  emailSignupDefinition,
  footerBannerDefinition,
  productMainDefinition,
  richTextSectionDefinition,
  imageWithTextDefinition,
  featuredCollectionDefinition,
  testimonialsDefinition,
  faqSectionDefinition,
  productReviewsDefinition,
  legacyBlockDefinition,
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
  const allowed =
    group === "HEADER"
      ? catalog?.header
      : group === "FOOTER"
        ? catalog?.footer
        : catalog?.product
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

import { Puzzle } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

/**
 * Shopify-style adapter section. Wraps any universal `BlockDefinition`
 * from `lib/blocks/registry.ts` so the customizer can expose page-builder
 * blocks (HERO, FRIENDLY, CAROUSEL, ICON_TEXT, PORCENTAJE_UNO, FAQ_TWO,
 * BANNER_TOP_TEXT, GALLERY, VIDEO, TICKER, TRUST_BADGES, COMPARISON,
 * RICH_TEXT, FAQ, IMAGE_TEXT, TESTIMONIALS) as sections of the PRODUCT
 * template — mirroring Shopify's `enabled_on.templates: ["product", ...]`
 * pattern where a single section catalog is reused across templates.
 *
 * Persisted content shape (in `ThemeSection.content`):
 *
 *   {
 *     blockType: LandingBlockType,   // discriminator
 *     data:  BlockContentV2["data"],
 *     style: BlockContentV2["style"],
 *     media: BlockContentV2["media"],
 *   }
 *
 * The customizer's AddSectionPanel and right sidebar do NOT use the
 * `fields` / `defaultContent` declared here — they're intentionally empty.
 * Instead the editor delegates to the wrapped block's own `contentSchema`
 * and `defaultContent` from `lib/blocks/registry.ts`. The `label` / `icon`
 * shown in the dropdown also come from the BlockDefinition, not from
 * this section definition.
 */
export const legacyBlockDefinition: ThemeSectionDefinition = {
  type: "LEGACY_BLOCK",
  groups: ["PRODUCT"],
  label: "Bloque",
  description:
    "Adaptador interno que envuelve un bloque del page-builder universal.",
  icon: Puzzle,
  fields: [],
  defaultContent: {},
}

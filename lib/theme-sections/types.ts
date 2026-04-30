import type { LucideIcon } from "lucide-react"
import type { ThemeSectionGroup } from "@prisma/client"
import type { BlockStyle } from "@/lib/blocks/types"
import type { FormSchema } from "@/lib/blocks/schema/types"

export type { ThemeSectionGroup }

/**
 * The shape persisted in `ThemeSection.content` and `ThemeSectionBlock.content`.
 * Mirrors the convention used for landing blocks: schema-defined fields at the
 * top level plus an optional `style` (BlockStyle from lib/blocks/types.ts).
 */
export interface ThemeSectionContent {
  [key: string]: unknown
  style?: BlockStyle
}

/**
 * One section instance after Prisma fetch + style/visibility resolution.
 * Consumers (renderers) read `content` for type-specific fields and
 * `resolvedStyle` for the device-flattened style.
 */
export interface ResolvedThemeSection {
  id: string
  themeId: string
  group: ThemeSectionGroup
  type: string
  position: number
  enabled: boolean
  content: ThemeSectionContent
  blocks: ResolvedThemeSectionBlock[]
}

export interface ResolvedThemeSectionBlock {
  id: string
  sectionId: string
  type: string
  position: number
  enabled: boolean
  content: ThemeSectionContent
}

/**
 * Definition of a section type registered in the global registry.
 * The customizer reads `fields` to render the SchemaForm, `acceptedBlockTypes`
 * to populate the "+ Agregar bloque" panel inside a section, and
 * `maxPerGroup` to gate the AddSectionPanel.
 */
export interface ThemeSectionDefinition {
  /** Registry id, e.g. "HEADER_MAIN". UPPER_SNAKE_CASE convention. */
  type: string
  /** Groups this type may appear in. Most are HEADER-only or FOOTER-only;
   *  some (e.g. RICH_TEXT) could accept both. */
  groups: ThemeSectionGroup[]
  label: string
  description?: string
  icon: LucideIcon
  /** Schema-driven form field list — same FormSchema used by lib/blocks. */
  fields: FormSchema
  /** Accepted sub-block types. Empty/undefined = no inner blocks. */
  acceptedBlockTypes?: ThemeSectionBlockDefinition[]
  /** Max number of instances of this type per group (per theme). Undefined = unlimited. */
  maxPerGroup?: number
  defaultContent: ThemeSectionContent
  /** Sub-blocks created automatically when this section is added. */
  defaultBlocks?: Array<{ type: string; content: ThemeSectionContent }>
}

export interface ThemeSectionBlockDefinition {
  type: string
  label: string
  icon: LucideIcon
  fields: FormSchema
  defaultContent: ThemeSectionContent
  /** Max number of instances of this sub-block type per parent section. */
  maxPerSection?: number
}

/**
 * Per-theme catalog (Theme.sectionCatalog JSON). When empty the customizer
 * is permissive (all registry types available). When populated, the
 * AddSectionPanel only lists types that appear in the relevant group array.
 */
export interface ThemeSectionCatalog {
  header?: string[]
  footer?: string[]
}

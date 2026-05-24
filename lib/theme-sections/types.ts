import type { LucideIcon } from "lucide-react"
import type { ThemeSectionGroup } from "@prisma/client"
import type { BlockStyle, BlockStyleSupport } from "@/lib/blocks/types"
import type { FormSchema } from "@/lib/blocks/schema/types"

export type { ThemeSectionGroup }

/**
 * The shape persisted in `ThemeSection.content` and `ThemeSectionBlock.content`.
 *
 * Intentionally simpler than `BlockContentV2`: no `data` / `media` zones —
 * schema-form fields are stored directly at the top level. Theme sections
 * don't need per-device media overrides like landing blocks do, and the
 * extra `data` envelope adds no value here. The `style` key reuses the
 * same `BlockStyle` from `lib/blocks/types.ts` so `apply-style.ts` can
 * be reused via a thin adapter (see `lib/theme-sections/apply-style.ts`).
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
  /** Opt-out flags for style sections in the customizer's Estilo tab.
   *  Omit → all style controls render (current behavior). Set fields to
   *  false to hide irrelevant sections (e.g. headers skip alignment /
   *  border / shadow since they're full-width sticky bars). Reuses the
   *  same shape as page-builder blocks via `resolveStyleSupport`. */
  styleSupport?: Partial<BlockStyleSupport>
  /** Declarative bridge for live-preview of custom colors that pinta
   *  elements rendered in React portals (Radix Sheet / Dialog / Popover
   *  / DropdownMenu / etc). See `PortalOverrideMapping` below. */
  portalOverrides?: PortalOverrideMapping[]
}

export interface ThemeSectionBlockDefinition {
  type: string
  label: string
  icon: LucideIcon
  fields: FormSchema
  defaultContent: ThemeSectionContent
  /** Max number of instances of this sub-block type per parent section. */
  maxPerSection?: number
  /** Same opt-out flags as the parent section — see above. */
  styleSupport?: Partial<BlockStyleSupport>
  /** Same portal-bridge mechanism as the parent section — see below. */
  portalOverrides?: PortalOverrideMapping[]
}

/**
 * Declarative mapping that tells the customizer's live-preview hook
 * (`useLivePreviewOverrides`) how to push custom color edits into a
 * React portal — i.e. a piece of UI that's rendered outside the
 * section's wrapper (Radix Sheet for mobile drawers, Dialog for modals,
 * Popover/HoverCard for dropdowns, etc).
 *
 * Without this bridge, those portal-rendered surfaces would only pick
 * up admin edits after the autosave + server refresh cycle, because
 * their colors travel as React props baked into inline styles. With it,
 * the hook emits a CSS rule against `selector` that overrides the
 * declared CSS variables — so the portal repaints in the same tick
 * even though the portal lives outside our DOM subtree.
 *
 * @example
 *   // HEADER_MAIN renders MobileMenu in a Radix portal. The drawer
 *   // tags its SheetContent with `data-mobile-drawer`. To make custom
 *   // drawer colors live-previewable, the section declares:
 *   portalOverrides: [
 *     {
 *       selector: '[data-mobile-drawer]',
 *       device: 'mobile',
 *       vars: {
 *         drawerBgColor: '--drawer-bg',
 *         drawerTextColor: '--drawer-text',
 *       },
 *     },
 *   ]
 */
export interface PortalOverrideMapping {
  /** Global CSS selector for the portal element. The portal renderer
   *  must emit a matching data-attribute (or class) — without that
   *  hook the selector can't find the element. */
  selector: string
  /** Map of BlockStyle field name → target CSS variable. The variable
   *  name MUST include the leading `--`. The hook reads the section's
   *  current style for each field, resolves the color value, and emits
   *  `<var>: <value> !important` against the selector. */
  vars: Record<string, `--${string}`>
  /** Which device override to prefer for DeviceValue fields:
   *   - `mobile` (default for drawers / mobile-only surfaces) — emit
   *     the mobile value with desktop fallback.
   *   - `shared` (desktop / responsive surfaces) — emit the shared
   *     value (desktop fallback to mobile). */
  device?: "mobile" | "shared"
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

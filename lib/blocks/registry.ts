import type { ComponentType } from "react"
import type { BlockCategory, BlockContentV2, BlockScope, BlockStyleSupport, LandingBlockType } from "./types"
import type { FormSchema } from "./schema/types"

/**
 * Metadata and implementations for one block type.
 */
export interface BlockDefinition {
  type: LandingBlockType
  label: string                      // User-facing label (Spanish)
  icon: string                        // lucide-react icon name
  emoji?: string                      // Optional emoji fallback
  description: string                 // Short description for the Add panel
  scope: BlockScope                   // "universal" | "product"
  category: BlockCategory
  defaultContent: BlockContentV2
  /** Renderer component used in both the canvas preview and the storefront.
   * Receives resolved (device-flattened) content. */
  renderer: ComponentType<{ content: BlockContentV2 }>
  /** JSON schema describing this block's content.data fields. The ContentTab
   *  renders a generic SchemaForm from this. This is the preferred way to
   *  declare a block's editor form. */
  contentSchema?: FormSchema
  /** Legacy hand-coded form. Used only by GALLERY today, whose data shape
   *  (`images: string[]`) doesn't fit the schema's `array` primitive without
   *  a one-time migration of stored content. Slated for removal once GALLERY
   *  is migrated in a follow-up plan; until then, blocks fall through to this
   *  branch in ContentTab when no `contentSchema` is declared. */
  contentForm?: ComponentType<{
    content: BlockContentV2
    onChange: (content: BlockContentV2) => void
  }>
  /** Declares which style-tab sections apply to this block type. Unset
   *  fields default per resolveStyleSupport() (all true except `bgImage`). */
  styleSupport?: Partial<BlockStyleSupport>
}

/**
 * Global registry. Populated in Task 10 when we register the 7 existing blocks.
 * Plan 2 adds the 5 new blocks.
 */
const registry = new Map<LandingBlockType, BlockDefinition>()

export function registerBlock(def: BlockDefinition): void {
  registry.set(def.type, def)
}

export function getBlockDefinition(type: LandingBlockType): BlockDefinition | undefined {
  return registry.get(type)
}

export function getAllBlockDefinitions(): BlockDefinition[] {
  return Array.from(registry.values())
}

/**
 * Returns block definitions filterable by scope. Use this in the
 * AddBlockPanel: in a product context, scope="product" blocks are shown;
 * in a template context (Plan 3), only universal blocks are shown.
 */
export function getBlockDefinitionsForScope(scope: "product" | "page"): BlockDefinition[] {
  return getAllBlockDefinitions().filter((def) => {
    if (scope === "page") return def.scope === "universal"
    return true
  })
}

/**
 * Group block definitions by category for display in the Add panel.
 */
export function getBlockDefinitionsByCategory(
  scope: "product" | "page"
): Record<BlockCategory, BlockDefinition[]> {
  const result: Record<string, BlockDefinition[]> = {
    content: [],
    media: [],
    "social-proof": [],
    visual: [],
    commerce: [],
  }
  for (const def of getBlockDefinitionsForScope(scope)) {
    result[def.category].push(def)
  }
  return result as Record<BlockCategory, BlockDefinition[]>
}

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
   *  renders a generic SchemaForm from this. */
  contentSchema?: FormSchema
  /** Declares which style-tab sections apply to this block type. Unset
   *  fields default per resolveStyleSupport() (all true except `bgImage`). */
  styleSupport?: Partial<BlockStyleSupport>
  /** Maps `content.data.<key>` fields to CSS custom properties set on the
   *  block's preview wrapper. The customizer live-preview hook emits these
   *  rules instantly on every store mutation, so renderers that read the
   *  vars (`var(--block-accent)`) repaint without the autosave round-trip.
   *
   *  SSR responsibility: the renderer must also set the same CSS vars on
   *  its outermost element from the data values, so the first paint and
   *  any non-customizer render look correct. */
  liveContentVars?: Record<string, string>
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
 * Builder scope drives which blocks the AddBlockPanel offers:
 *   - "product":  universal + product-only blocks (RELATED_PRODUCTS, etc.)
 *   - "page":     universal-only (template editor + page/home/cart builders)
 *   - "category": universal + category-only blocks (PRODUCT_GRID, etc.)
 */
export type BuilderRegistryScope = "product" | "page" | "category"

/**
 * Returns block definitions filterable by builder scope. Each builder type
 * sees its allowed BlockScope values. Universal blocks always appear.
 */
export function getBlockDefinitionsForScope(scope: BuilderRegistryScope): BlockDefinition[] {
  return getAllBlockDefinitions().filter((def) => {
    if (def.scope === "universal") return true
    if (scope === "product") return def.scope === "product"
    if (scope === "category") return def.scope === "category"
    // "page" sees universal only.
    return false
  })
}

/**
 * Group block definitions by category for display in the Add panel.
 */
export function getBlockDefinitionsByCategory(
  scope: BuilderRegistryScope
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

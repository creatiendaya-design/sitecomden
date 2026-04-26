import { prisma } from "@/lib/db"
import type { LandingBlockType, BlockContentV2 } from "@/lib/blocks/types"
import { resolveActiveTheme } from "@/lib/themes/resolve-active-theme"

export type BlockOrigin = "template" | "detached" | "local"

export interface ResolvedProductBlock {
  id: string
  /** Origin signals where the block content actually comes from. The renderer
   *  doesn't need to care about origin; the admin canvas uses it for visual
   *  badges (Task 16). */
  origin: BlockOrigin
  type: LandingBlockType
  position: number
  content: BlockContentV2
  /** The TemplateBlock whose content this block reflects (template) or
   *  overrides (detached). null for pure-local blocks. */
  sourceTemplateBlockId: string | null
  /** True when the block is a LandingBlock row (detached or local), false
   *  when it's served directly from a TemplateBlock. The admin can only
   *  edit blocks where this is true. */
  hasLandingBlockRow: boolean
}

interface ProductWithRelations {
  id: string
  landingTemplateId: string | null
  landingBlocks: {
    id: string
    type: LandingBlockType
    position: number
    content: unknown
    sourceTemplateBlockId: string | null
    detached: boolean
  }[]
}

/**
 * Algorithm (per spec section 2.4):
 *
 *  - If the product has no template: return its LandingBlocks as origin="local".
 *  - If linked: walk the TemplateBlocks in order. For each, look up a
 *    detached LandingBlock with matching sourceTemplateBlockId. If found,
 *    emit the LandingBlock as origin="detached". Otherwise emit the
 *    TemplateBlock content as origin="template" (note: in this case, no
 *    LandingBlock row exists for that block).
 *  - After the template walk, append all LandingBlocks where
 *    sourceTemplateBlockId is null (pure-local interleaves) in their stored
 *    position order.
 */
export async function resolveProductBlocks(productId: string): Promise<ResolvedProductBlock[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      landingTemplateId: true,
      landingBlocks: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          type: true,
          position: true,
          content: true,
          sourceTemplateBlockId: true,
          detached: true,
        },
      },
    },
  })
  if (!product) return []

  return resolveFromProduct(product as ProductWithRelations)
}

/**
 * Same as resolveProductBlocks but the caller supplies a pre-loaded product.
 * Useful when the surrounding query already eager-loads landingBlocks.
 */
export async function resolveProductBlocksFromLoaded(
  product: ProductWithRelations,
): Promise<ResolvedProductBlock[]> {
  return resolveFromProduct(product)
}

async function resolveFromProduct(product: ProductWithRelations): Promise<ResolvedProductBlock[]> {
  if (!product.landingTemplateId) {
    const localBlocks = product.landingBlocks.filter((b) => b.sourceTemplateBlockId === null)

    // If the product has its own pure-local blocks, use them — admin
    // explicitly wanted custom content.
    if (localBlocks.length > 0) {
      return localBlocks.map((b) => ({
        id: b.id,
        origin: "local" as const,
        type: b.type,
        position: b.position,
        content: b.content as BlockContentV2,
        sourceTemplateBlockId: null,
        hasLandingBlockRow: true,
      }))
    }

    // Otherwise, fall back to the active (or previewed) theme's default
    // product landing. Plan 4 introduced the inheritance; Plan 9 made it
    // preview-aware so admins previewing a theme see its product defaults.
    const activeTheme = await resolveActiveTheme()
    if (activeTheme?.defaultProductLandingTemplateId) {
      const themeDefaultBlocks = await prisma.templateBlock.findMany({
        where: { templateId: activeTheme.defaultProductLandingTemplateId },
        orderBy: { position: "asc" },
      })
      return themeDefaultBlocks.map((tb) => ({
        id: tb.id,
        origin: "template" as const,
        type: tb.type as LandingBlockType,
        position: tb.position,
        content: tb.content as unknown as BlockContentV2,
        sourceTemplateBlockId: tb.id,
        hasLandingBlockRow: false,
      }))
    }

    // No active theme default — render nothing (existing behavior).
    return []
  }

  const templateBlocks = await prisma.templateBlock.findMany({
    where: { templateId: product.landingTemplateId },
    orderBy: { position: "asc" },
  })

  const detachedByTemplateId = new Map(
    product.landingBlocks
      .filter((b) => b.detached && b.sourceTemplateBlockId)
      .map((b) => [b.sourceTemplateBlockId!, b]),
  )

  const fromTemplate: ResolvedProductBlock[] = templateBlocks.map((tb) => {
    const override = detachedByTemplateId.get(tb.id)
    if (override) {
      return {
        id: override.id,
        origin: "detached",
        type: override.type,
        position: tb.position,
        content: override.content as BlockContentV2,
        sourceTemplateBlockId: tb.id,
        hasLandingBlockRow: true,
      }
    }
    return {
      id: tb.id,
      origin: "template",
      type: tb.type as LandingBlockType,
      position: tb.position,
      content: tb.content as unknown as BlockContentV2,
      sourceTemplateBlockId: tb.id,
      hasLandingBlockRow: false,
    }
  })

  const pureLocals: ResolvedProductBlock[] = product.landingBlocks
    .filter((b) => b.sourceTemplateBlockId === null)
    .map((b) => ({
      id: b.id,
      origin: "local",
      type: b.type,
      position: b.position,
      content: b.content as BlockContentV2,
      sourceTemplateBlockId: null,
      hasLandingBlockRow: true,
    }))

  // Interleave: append pure-locals AFTER the template walk, sorted by position.
  // Spec 2.4 mentions float positions to interleave between template blocks;
  // for v1 we keep it simple — pure-locals render after the template block
  // chain. Future plan can add interleave logic if needed.
  return [...fromTemplate, ...pureLocals].sort((a, b) => a.position - b.position)
}

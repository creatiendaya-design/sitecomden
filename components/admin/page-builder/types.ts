import type { BlockInstance, LandingBlockType, BlockContentV2, Device } from "@/lib/blocks/types"

export type BuilderScope = "product" | "page"

export interface ProductContext {
  type: "product"
  product: {
    id: string
    slug: string
    name: string
  }
}

// Plan 3 adds: PageContext, TemplateContext
export type BuilderContext = ProductContext

export interface PageBuilderActions {
  onApplyTemplate?: () => void
  onSaveAsTemplate?: () => void
  onUnlinkTemplate?: () => void
}

export interface PageBuilderProps {
  blocks: BlockInstance[]
  onBlocksChange: (blocks: BlockInstance[]) => void
  scope: BuilderScope
  context?: BuilderContext
  actions?: PageBuilderActions
  title?: string
  backHref?: string
}

export type SaveStatus =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; at: number }
  | { status: "error"; message: string }

export type { BlockInstance, LandingBlockType, BlockContentV2, Device }

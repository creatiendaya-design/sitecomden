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

export interface TemplateContext {
  type: "template"
  template: {
    id: string
    name: string
  }
}

export type BuilderContext = ProductContext | TemplateContext

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

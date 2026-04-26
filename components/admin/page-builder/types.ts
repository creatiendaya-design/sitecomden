import type { ReactNode } from "react"
import type { BlockInstance, LandingBlockType, BlockContentV2, Device } from "@/lib/blocks/types"

export type BuilderScope = "product" | "page" | "category"

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

export interface PageContext {
  type: "page"
  page: {
    id: string
    slug: string
    title: string
  }
}

export interface CategoryContext {
  type: "category"
  category: {
    id: string
    slug: string
    name: string
  }
}

export type BuilderContext =
  | ProductContext
  | TemplateContext
  | PageContext
  | CategoryContext

export interface PageBuilderActions {
  onApplyTemplate?: () => void
  onSaveAsTemplate?: () => void
  onUnlinkTemplate?: () => void
  onDiscardDraft?: () => void
  onSaveTemplate?: () => void
}

export interface PageBuilderProps {
  blocks: BlockInstance[]
  onBlocksChange: (blocks: BlockInstance[]) => void
  scope: BuilderScope
  context?: BuilderContext
  actions?: PageBuilderActions
  title?: string
  backHref?: string
  headerExtra?: ReactNode
}

export type SaveStatus =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; at: number }
  | { status: "error"; message: string }

export type { BlockInstance, LandingBlockType, BlockContentV2, Device }

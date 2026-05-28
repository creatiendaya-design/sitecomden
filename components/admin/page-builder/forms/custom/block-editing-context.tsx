"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { BlockContentV2 } from "@/lib/blocks/types"

/**
 * Optional editing context provided by *non-page-builder* surfaces that
 * embed the SchemaForm primitives. Custom fields like
 * `ImageTextMediaField` need to write back to `content.media.image` — a
 * zone the SchemaForm's data flow doesn't reach — so the field
 * historically reached into the page-builder Zustand store directly.
 *
 * That couples the field to one store. The customizer's LEGACY_BLOCK
 * adapter (Plan 17.1) edits a theme-section via a different store, so
 * we publish this context as an opt-in escape hatch: callers that aren't
 * the page-builder wrap their form in `BlockEditingProvider` and the
 * custom field reads from here instead of `useBuilderStore`.
 *
 * Page-builder code is unchanged — it never mounts the provider, so the
 * field's `useContext` returns null and the field falls back to the
 * builder-store path verbatim.
 */
export interface BlockEditingContextValue {
  content: BlockContentV2
  onContentChange: (next: BlockContentV2) => void
}

const BlockEditingContext = createContext<BlockEditingContextValue | null>(null)

export function useBlockEditingContext(): BlockEditingContextValue | null {
  return useContext(BlockEditingContext)
}

interface ProviderProps {
  value: BlockEditingContextValue
  children: ReactNode
}

export function BlockEditingProvider({ value, children }: ProviderProps) {
  return (
    <BlockEditingContext.Provider value={value}>
      {children}
    </BlockEditingContext.Provider>
  )
}

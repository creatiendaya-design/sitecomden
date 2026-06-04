"use client"

import { Layout, LayoutTemplate, Footprints } from "lucide-react"
import {
  EmbeddedBlocksEditor,
  type EditorBlock,
  type SaveBlocksResult,
} from "./EmbeddedBlocksEditor"
import { ThemeSectionGroupEditor } from "./ThemeSectionGroupEditor"
import type { BlockInstance } from "@/lib/blocks/types"
import type { ThemeSectionCatalog } from "@/lib/theme-sections/types"

interface Props {
  themeId: string
  /** Stable editor key for the current target (e.g. `page-<id>` or
   *  `category-<id>`). Null when the current target doesn't have an
   *  editable page/category surface (e.g. /productos index, /productos/<slug>).
   *  When `templateMode === "product"` it's also null but the Plantilla zone
   *  switches to the PRODUCT theme-sections editor instead of falling back
   *  to the "no editable" placeholder. */
  editorKey: string | null
  initialBlocks: BlockInstance[]
  /** Customizer-supplied save fn for the Plantilla zone — wires either
   *  savePageBlocksVersioned or saveCategoryBlocksVersioned depending on
   *  the target type. Returns a Plan 18 SaveBlocksResult so EmbeddedBlocks-
   *  Editor can adopt the persisted snapshot (fresh versions) or surface
   *  a batch conflict. */
  saveBlocks: (blocks: EditorBlock[]) => Promise<SaveBlocksResult>
  targetLabel: string
  onBlocksSaved?: () => void
  /** Plan 16 — per-theme catalog (allowed section types per group). */
  sectionCatalog: ThemeSectionCatalog
  /** Plan 17/19 — when "product" / "collection", the Plantilla zone renders
   *  a PRODUCT- / COLLECTION-group theme-sections editor instead of the
   *  page/category block editor. Defaults to "page-or-category". */
  templateMode?: "product" | "collection" | "page-or-category"
}

/**
 * Plan 13 / 16 / 17 — Customizer left-panel zones (Shopify model).
 *
 * Three stacked zones replace the previous "Bloques / Tema" tabs:
 *   - Encabezado: theme-sections editor (Plan 16) — multiple ordered
 *     header sections (Announcement Bar, Header, Mega Menu, …).
 *   - Plantilla: either page-builder blocks (pages/categories) or a
 *     PRODUCT theme-sections editor (Plan 17) when previewing a product.
 *   - Pie de página: theme-sections editor (Plan 16) — multiple ordered
 *     footer sections (Columns, Newsletter, Social, …).
 *
 * Header / Footer / Product mutations all flow through the theme-sections
 * Zustand store; the customizer shell autosaves the dirty drafts on a
 * debounce. Settings for the Plantilla zone's blocks live in the
 * page-builder RightSidebar; settings for theme sections live in
 * ThemeSectionRightSidebar.
 */
export function ZoneList({
  editorKey,
  initialBlocks,
  saveBlocks,
  targetLabel,
  onBlocksSaved,
  sectionCatalog,
  templateMode = "page-or-category",
}: Props) {
  return (
    <div className="flex flex-col">
      <Zone label="Encabezado" icon={Layout}>
        <ThemeSectionGroupEditor group="HEADER" catalog={sectionCatalog} />
      </Zone>

      <Zone
        label="Plantilla"
        icon={LayoutTemplate}
        sublabel={targetLabel}
      >
        {templateMode === "product" ? (
          <ThemeSectionGroupEditor group="PRODUCT" catalog={sectionCatalog} />
        ) : templateMode === "collection" ? (
          <ThemeSectionGroupEditor group="COLLECTION" catalog={sectionCatalog} />
        ) : editorKey ? (
          <EmbeddedBlocksEditor
            editorKey={editorKey}
            initialBlocks={initialBlocks}
            saveBlocks={saveBlocks}
            onSaved={onBlocksSaved}
          />
        ) : (
          <div className="px-4 py-3 text-xs text-muted-foreground">
            Esta plantilla no admite edición de bloques en esta versión.
          </div>
        )}
      </Zone>

      <Zone label="Pie de página" icon={Footprints}>
        <ThemeSectionGroupEditor group="FOOTER" catalog={sectionCatalog} />
      </Zone>
    </div>
  )
}

interface ZoneProps {
  label: string
  icon: typeof Layout
  sublabel?: string
  children: React.ReactNode
}

function Zone({ label, icon: Icon, sublabel, children }: ZoneProps) {
  return (
    <div className="border-b">
      <div className="px-4 py-2 flex items-center gap-2 bg-muted/40 border-b">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {sublabel && (
          <span className="ml-auto text-[11px] text-muted-foreground truncate">
            {sublabel}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

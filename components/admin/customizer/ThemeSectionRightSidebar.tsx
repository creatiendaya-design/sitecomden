"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SchemaForm } from "@/components/admin/page-builder/forms/SchemaForm"
import { useThemeSectionsStore } from "./theme-sections-store"
import {
  getThemeSectionDefinition,
  getSectionBlockDefinition,
} from "@/lib/theme-sections/registry"

/**
 * RightSidebar variant for theme-section editing. Reads the current
 * SidebarTarget from the theme-sections store, looks up the registry
 * definition, and renders a SchemaForm bound to the target's content.
 *
 * Mirrors the page-builder RightSidebar but is a separate component so
 * the page-builder flow (used by /admin/personalizar editing pages and
 * categories) stays untouched. The customizer shell renders one or the
 * other based on what's selected.
 */
export function ThemeSectionRightSidebar() {
  const selected = useThemeSectionsStore((s) => s.selected)
  const select = useThemeSectionsStore((s) => s.select)

  // Pull the actual draft for whichever target is selected.
  const sectionDraft = useThemeSectionsStore((s) => {
    if (!s.selected) return null
    const sectionId =
      s.selected.kind === "section"
        ? s.selected.sectionId
        : s.selected.kind === "section-block"
          ? s.selected.sectionId
          : null
    if (!sectionId) return null
    return (
      s.header.find((x) => x.id === sectionId) ??
      s.footer.find((x) => x.id === sectionId) ??
      null
    )
  })

  const blockDraft = useThemeSectionsStore((s) => {
    if (!s.selected || s.selected.kind !== "section-block") return null
    const target = s.selected
    const section =
      s.header.find((x) => x.id === target.sectionId) ??
      s.footer.find((x) => x.id === target.sectionId) ??
      null
    return section?.blocks.find((b) => b.id === target.blockId) ?? null
  })

  const updateSectionContent = useThemeSectionsStore(
    (s) => s.updateSectionContent,
  )
  const updateBlockContent = useThemeSectionsStore((s) => s.updateBlockContent)

  if (!selected || !sectionDraft) return null

  if (selected.kind === "section") {
    const def = getThemeSectionDefinition(sectionDraft.type)
    const Icon = def?.icon
    return (
      <aside className="w-[340px] shrink-0 border-l bg-background flex flex-col overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2 shrink-0">
          {Icon && <Icon className="h-4 w-4" />}
          <span className="text-sm font-medium truncate flex-1">
            {def?.label ?? sectionDraft.type}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Cerrar panel"
            onClick={() => select(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-3">
          {def?.fields && def.fields.length > 0 ? (
            <SchemaForm
              schema={def.fields}
              value={sectionDraft.content}
              onChange={(next) => updateSectionContent(sectionDraft.id, next)}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Esta sección no tiene configuración.
            </p>
          )}
        </div>
      </aside>
    )
  }

  // section-block kind
  if (!blockDraft) return null
  const blockDef = getSectionBlockDefinition(sectionDraft.type, blockDraft.type)
  const Icon = blockDef?.block.icon
  return (
    <aside className="w-[340px] shrink-0 border-l bg-background flex flex-col overflow-hidden">
      <div className="p-3 border-b flex items-center gap-2 shrink-0">
        {Icon && <Icon className="h-4 w-4" />}
        <span className="text-sm font-medium truncate flex-1">
          {blockDef?.block.label ?? blockDraft.type}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Cerrar panel"
          onClick={() => select(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {blockDef?.block.fields && blockDef.block.fields.length > 0 ? (
          <SchemaForm
            schema={blockDef.block.fields}
            value={blockDraft.content}
            onChange={(next) => updateBlockContent(blockDraft.id, next)}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Este bloque no tiene configuración.
          </p>
        )}
      </div>
    </aside>
  )
}

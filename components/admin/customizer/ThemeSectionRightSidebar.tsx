"use client"

import React from "react"
import { X } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SchemaForm } from "@/components/admin/page-builder/forms/SchemaForm"
import { useThemeSectionsStore } from "./theme-sections-store"
import { ThemeSectionStyleTab } from "./ThemeSectionStyleTab"
import { LegacyBlockEditor } from "./LegacyBlockEditor"
import {
  getThemeSectionDefinition,
  getSectionBlockDefinition,
} from "@/lib/theme-sections/registry"
import { getBlockDefinition } from "@/lib/blocks/registry"
import type { LandingBlockType } from "@/lib/blocks/types"

/**
 * RightSidebar variant for theme-section editing. Reads the current
 * SidebarTarget from the theme-sections store, looks up the registry
 * definition, and renders Contenido / Estilo tabs bound to the target's
 * content.
 *
 * Mirrors the page-builder RightSidebar but is a separate component so
 * the page-builder flow (used by /admin/personalizar editing pages and
 * categories) stays untouched. The customizer shell renders one or the
 * other based on what's selected.
 */
export function ThemeSectionRightSidebar() {
  const selected = useThemeSectionsStore((s) => s.selected)
  const select = useThemeSectionsStore((s) => s.select)

  // Pull the actual draft for whichever target is selected. Searches all
  // three group slots (Plan 17 added `product` alongside header/footer).
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
      s.product.find((x) => x.id === sectionId) ??
      null
    )
  })

  const blockDraft = useThemeSectionsStore((s) => {
    if (!s.selected || s.selected.kind !== "section-block") return null
    const target = s.selected
    const section =
      s.header.find((x) => x.id === target.sectionId) ??
      s.footer.find((x) => x.id === target.sectionId) ??
      s.product.find((x) => x.id === target.sectionId) ??
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
    const isLegacy = sectionDraft.type === "LEGACY_BLOCK"
    const legacyBlockType = isLegacy
      ? (sectionDraft.content.blockType as LandingBlockType | undefined)
      : undefined
    const legacyBlockDef = legacyBlockType
      ? getBlockDefinition(legacyBlockType)
      : undefined
    const HeaderIcon = isLegacy
      ? resolveLucideIcon(legacyBlockDef?.icon)
      : def?.icon
    const headerLabel = isLegacy
      ? (legacyBlockDef?.label ?? sectionDraft.type)
      : (def?.label ?? sectionDraft.type)
    const hasContentFields = (def?.fields?.length ?? 0) > 0
    return (
      <aside className="w-[340px] shrink-0 border-l bg-background flex flex-col overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2 shrink-0">
          {HeaderIcon && React.createElement(HeaderIcon, { className: "h-4 w-4" })}
          <span className="text-sm font-medium truncate flex-1">
            {headerLabel}
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
        {isLegacy ? (
          <LegacyBlockEditor
            key={sectionDraft.id}
            content={sectionDraft.content}
            onChange={(next) => updateSectionContent(sectionDraft.id, next)}
          />
        ) : (
        <Tabs
          defaultValue={hasContentFields ? "content" : "style"}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-3 mt-2 shrink-0">
            <TabsTrigger value="content" className="flex-1">
              Contenido
            </TabsTrigger>
            <TabsTrigger value="style" className="flex-1">
              Estilo
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="content"
            className="flex-1 overflow-auto p-3 mt-0 space-y-3"
          >
            {def?.description && (
              <p className="text-xs text-muted-foreground leading-relaxed border-l-2 pl-2">
                {def.description}
              </p>
            )}
            {hasContentFields ? (
              <SchemaForm
                schema={def!.fields}
                value={sectionDraft.content}
                onChange={(next) =>
                  updateSectionContent(sectionDraft.id, next)
                }
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Esta sección no tiene configuración propia. Seleccioná uno de los sub-bloques de abajo para configurarlo.
              </p>
            )}
          </TabsContent>
          <TabsContent value="style" className="flex-1 overflow-auto p-3 mt-0">
            <ThemeSectionStyleTab
              content={sectionDraft.content}
              onChange={(next) =>
                updateSectionContent(sectionDraft.id, next)
              }
              styleSupport={def?.styleSupport}
            />
          </TabsContent>
        </Tabs>
        )}
      </aside>
    )
  }

  // section-block kind
  if (!blockDraft) return null
  const blockDef = getSectionBlockDefinition(sectionDraft.type, blockDraft.type)
  const Icon = blockDef?.block.icon
  const hasBlockFields = (blockDef?.block.fields?.length ?? 0) > 0
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
      <Tabs
        defaultValue={hasBlockFields ? "content" : "style"}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="mx-3 mt-2 shrink-0">
          <TabsTrigger value="content" className="flex-1">
            Contenido
          </TabsTrigger>
          <TabsTrigger value="style" className="flex-1">
            Estilo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="flex-1 overflow-auto p-3 mt-0">
          {hasBlockFields ? (
            <SchemaForm
              schema={blockDef!.block.fields}
              value={blockDraft.content}
              onChange={(next) => updateBlockContent(blockDraft.id, next)}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Este bloque no tiene configuración de contenido.
            </p>
          )}
        </TabsContent>
        <TabsContent value="style" className="flex-1 overflow-auto p-3 mt-0">
          <ThemeSectionStyleTab
            content={blockDraft.content}
            onChange={(next) => updateBlockContent(blockDraft.id, next)}
            styleSupport={blockDef?.block.styleSupport}
          />
        </TabsContent>
      </Tabs>
    </aside>
  )
}

/**
 * `BlockDefinition.icon` is a lucide-react icon name (string), not a
 * component. Bridge to a real component for the panel header. Falls back
 * to a sensible default so a typo never blows up the sidebar.
 */
function resolveLucideIcon(
  name: string | undefined,
): React.ComponentType<{ className?: string }> | undefined {
  if (!name) return undefined
  const lib = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >
  return lib[name] ?? LucideIcons.Puzzle
}

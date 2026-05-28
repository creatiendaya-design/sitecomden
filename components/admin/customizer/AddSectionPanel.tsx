"use client"

import { useMemo } from "react"
import { Plus } from "lucide-react"
import * as LucideIcons from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getAvailableSectionDefinitions } from "@/lib/theme-sections/registry"
import { getBlockDefinitionsForScope } from "@/lib/blocks/registry"
import type {
  ThemeSectionCatalog,
  ThemeSectionGroup,
} from "@/lib/theme-sections/types"

interface Props {
  group: ThemeSectionGroup
  catalog: ThemeSectionCatalog
  /** Current count of each type already present in this group, used to gate
   *  `maxPerGroup`. The caller computes this from the store. */
  counts: Record<string, number>
  /** Adds a section. `legacyBlockType` is only set when the admin picked a
   *  universal page-builder block (LEGACY_BLOCK adapter path); the parent
   *  uses it to seed `content.blockType` + the block's default data. */
  onAdd: (type: string, legacyBlockType?: string) => void
}

export function AddSectionPanel({ group, catalog, counts, onAdd }: Props) {
  // Native theme-section types. Hide LEGACY_BLOCK — it's an internal
  // adapter; the universal blocks below are how the user picks one.
  const nativeAvailable = useMemo(() => {
    const all = getAvailableSectionDefinitions(group, catalog).filter(
      (d) => d.type !== "LEGACY_BLOCK",
    )
    return all.filter((d) => {
      if (d.maxPerGroup === undefined) return true
      return (counts[d.type] ?? 0) < d.maxPerGroup
    })
  }, [group, catalog, counts])

  // Shopify-style — PRODUCT (and only PRODUCT for now) also offers every
  // universal page-builder block via the LEGACY_BLOCK adapter. Each block
  // appears as its own entry with its own label/icon; selecting it calls
  // `onAdd("LEGACY_BLOCK", "<BLOCK_TYPE>")` so the parent can seed the
  // section's content from the block's defaultContent.
  const universalBlocks = useMemo(() => {
    if (group !== "PRODUCT") return []
    return getBlockDefinitionsForScope("page")
  }, [group])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-primary hover:bg-muted/40 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar sección
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 max-h-[480px] overflow-y-auto"
      >
        {nativeAvailable.length === 0 && universalBlocks.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No hay tipos disponibles.
          </div>
        ) : (
          <>
            {nativeAvailable.map((def) => {
              const Icon = def.icon
              return (
                <DropdownMenuItem
                  key={def.type}
                  onSelect={() => onAdd(def.type)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm">{def.label}</span>
                    {def.description && (
                      <span className="text-xs text-muted-foreground">
                        {def.description}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              )
            })}
            {universalBlocks.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                  Bloques
                </DropdownMenuLabel>
                {universalBlocks.map((def) => {
                  const Icon = resolveLucideIcon(def.icon)
                  return (
                    <DropdownMenuItem
                      key={def.type}
                      onSelect={() => onAdd("LEGACY_BLOCK", def.type)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="text-sm">{def.label}</span>
                        {def.description && (
                          <span className="text-xs text-muted-foreground">
                            {def.description}
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  )
                })}
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * `BlockDefinition.icon` is a lucide-react icon name (string), not a
 * component, so it can be embedded in JSON-driven schemas. Theme-section
 * definitions, in contrast, store the icon component directly. Bridge the
 * two by looking the icon up in the lucide exports — fall back to Plus
 * when an unknown name is encountered so a typo never breaks the menu.
 */
function resolveLucideIcon(name: string): typeof Plus {
  const lib = LucideIcons as unknown as Record<string, typeof Plus>
  return lib[name] ?? Plus
}

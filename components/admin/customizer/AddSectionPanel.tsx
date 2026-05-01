"use client"

import { useMemo } from "react"
import { Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getAvailableSectionDefinitions } from "@/lib/theme-sections/registry"
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
  onAdd: (type: string) => void
}

export function AddSectionPanel({ group, catalog, counts, onAdd }: Props) {
  const available = useMemo(() => {
    const all = getAvailableSectionDefinitions(group, catalog)
    return all.filter((d) => {
      if (d.maxPerGroup === undefined) return true
      return (counts[d.type] ?? 0) < d.maxPerGroup
    })
  }, [group, catalog, counts])

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
      <DropdownMenuContent align="start" className="w-64">
        {available.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No hay tipos disponibles.
          </div>
        ) : (
          available.map((def) => {
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
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

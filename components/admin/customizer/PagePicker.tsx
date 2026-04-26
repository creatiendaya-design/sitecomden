"use client"

import { useMemo, useState } from "react"
import { Home, ChevronDown, Search } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { PageTarget } from "./page-targets"

interface Props {
  targets: PageTarget[]
  currentKey: string
  onChange: (key: string) => void
}

/**
 * Plan 13 — page-type picker mirroring Shopify's customizer dropdown.
 * Groups targets ("Plantillas", "Páginas") with a search bar at top so
 * stores with many static pages don't choke the dropdown.
 */
export function PagePicker({ targets, currentKey, onChange }: Props) {
  const [query, setQuery] = useState("")
  const current = targets.find((t) => t.key === currentKey) ?? targets[0]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return targets
    return targets.filter((t) => t.label.toLowerCase().includes(q))
  }, [targets, query])

  // Group by `group` field, preserving insertion order.
  const grouped = useMemo(() => {
    const groups = new Map<string, PageTarget[]>()
    for (const t of filtered) {
      const list = groups.get(t.group) ?? []
      list.push(t)
      groups.set(t.group, list)
    }
    return groups
  }, [filtered])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors max-w-[260px]"
          aria-label="Cambiar plantilla previsualizada"
        >
          <Home className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">{current?.label ?? "Plantilla"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px] max-h-[420px] overflow-y-auto">
        <div className="p-2 sticky top-0 bg-popover">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en la tienda online"
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>

        {Array.from(grouped.entries()).map(([groupName, items], idx) => (
          <div key={groupName}>
            {idx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {groupName}
            </DropdownMenuLabel>
            {items.map((t) => (
              <DropdownMenuItem
                key={t.key}
                onSelect={() => onChange(t.key)}
                className={cn(
                  "cursor-pointer",
                  t.key === currentKey && "bg-accent",
                )}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {t.path}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Sin resultados
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

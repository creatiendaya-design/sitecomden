"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { getBlockDefinitionsByCategory } from "@/lib/blocks/registry"
import type { BlockCategory } from "@/lib/blocks/types"
import type { BuilderScope, LandingBlockType } from "../types"

interface AddBlockPanelProps {
  scope: BuilderScope
  onAdd: (type: LandingBlockType) => void
}

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  content: "📝 Contenido",
  media: "🖼 Media",
  "social-proof": "💬 Prueba social",
  visual: "🎨 Visuales",
  commerce: "🛒 Comercio",
}

export function AddBlockPanel({ scope, onAdd }: AddBlockPanelProps) {
  const [query, setQuery] = useState("")
  const grouped = useMemo(() => getBlockDefinitionsByCategory(scope), [scope])

  const q = query.trim().toLowerCase()

  return (
    <div className="flex flex-col max-h-96">
      <div className="p-2 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar bloque..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-7 h-8 text-sm"
            autoFocus
          />
        </div>
      </div>

      <div className="overflow-auto py-1">
        {(Object.keys(grouped) as BlockCategory[]).map((cat) => {
          const items = grouped[cat].filter(
            (def) =>
              !q ||
              def.label.toLowerCase().includes(q) ||
              def.description.toLowerCase().includes(q)
          )
          if (items.length === 0) return null

          return (
            <div key={cat} className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </div>
              {items.map((def) => (
                <button
                  key={def.type}
                  type="button"
                  onClick={() => onAdd(def.type)}
                  className="w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-muted"
                >
                  <span className="text-base leading-none mt-0.5">{def.emoji ?? "◻"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{def.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{def.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateThemeSectionCatalog } from "@/actions/theme-sections"
import { getAllThemeSectionDefinitions } from "@/lib/theme-sections/registry"
import type { ThemeSectionCatalog } from "@/lib/theme-sections/types"

interface Props {
  themeId: string
  initialCatalog: ThemeSectionCatalog
  onSaved?: () => void
}

/**
 * Phase F — per-theme catalog manager. Each theme can curate which section
 * types appear in the customizer's "+ Agregar sección" dropdown. Empty (no
 * arm or empty array) = permissive default (all types available); a
 * non-empty array = only those types are offered.
 *
 * The local-only "all enabled" UI state hides this distinction from
 * admins: an empty catalog shows every box ticked, ticking all boxes
 * is a no-op, unticking any switches the catalog from permissive-default
 * to explicit-allowlist.
 */
export function ThemeCatalogPanel({ themeId, initialCatalog, onSaved }: Props) {
  const [catalog, setCatalog] = useState<ThemeSectionCatalog>(
    initialCatalog ?? {},
  )
  const [pending, startTransition] = useTransition()

  const all = getAllThemeSectionDefinitions()
  const headerTypes = all.filter((d) => d.groups.includes("HEADER"))
  const footerTypes = all.filter((d) => d.groups.includes("FOOTER"))

  function isAllowed(group: "header" | "footer", type: string): boolean {
    const list = catalog[group]
    return !list || list.length === 0 || list.includes(type)
  }

  function toggle(group: "header" | "footer", type: string) {
    const groupKey = group.toUpperCase() as "HEADER" | "FOOTER"
    const allInGroup = all
      .filter((d) => d.groups.includes(groupKey))
      .map((d) => d.type)
    // If catalog arm is empty/missing, treat as "all enabled" so the
    // first untick narrows to the remaining types.
    const current = catalog[group] ?? allInGroup
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    // If the user just ticked everything back on, switch back to
    // permissive default (empty array) instead of explicit full list.
    const nextArm = next.length === allInGroup.length ? [] : next
    const nextCatalog: ThemeSectionCatalog = {
      ...catalog,
      [group]: nextArm,
    }
    const previous = catalog
    setCatalog(nextCatalog)
    startTransition(async () => {
      try {
        await updateThemeSectionCatalog(themeId, {
          header: nextCatalog.header,
          footer: nextCatalog.footer,
        })
        onSaved?.()
      } catch (err) {
        // Roll back local state on failure.
        setCatalog(previous)
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2">
          Tipos de Encabezado habilitados
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Solo los tipos marcados aparecen al hacer &quot;+ Agregar
          sección&quot; en la zona Encabezado.
        </p>
        <div className="space-y-2">
          {headerTypes.map((d) => (
            <CatalogRow
              key={d.type}
              id={`h-${d.type}`}
              label={d.label}
              description={d.description}
              checked={isAllowed("header", d.type)}
              onToggle={() => toggle("header", d.type)}
              disabled={pending}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">
          Tipos de Pie de página habilitados
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Solo los tipos marcados aparecen al hacer &quot;+ Agregar
          sección&quot; en la zona Pie de página.
        </p>
        <div className="space-y-2">
          {footerTypes.map((d) => (
            <CatalogRow
              key={d.type}
              id={`f-${d.type}`}
              label={d.label}
              description={d.description}
              checked={isAllowed("footer", d.type)}
              onToggle={() => toggle("footer", d.type)}
              disabled={pending}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface CatalogRowProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onToggle: () => void
  disabled: boolean
}

function CatalogRow({
  id,
  label,
  description,
  checked,
  onToggle,
  disabled,
}: CatalogRowProps) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="flex flex-col">
        <Label htmlFor={id} className="text-sm cursor-pointer">
          {label}
        </Label>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  )
}

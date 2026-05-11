"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useColorSchemes } from "@/components/admin/customizer/color-schemes-context"

const INHERIT = "__inherit__"

interface Props {
  value: string | undefined
  onChange: (next: string | undefined) => void
}

/**
 * Plan 13.1 — block style control for picking a color scheme.
 *
 * Reads the available schemes from ColorSchemesContext (only populated
 * inside the customizer). When the context is empty (e.g. the standalone
 * /admin/paginas/[id] builder), the control hides itself — there's
 * nothing to pick from outside the customizer.
 *
 * The picker shows the theme's default scheme as "Heredar del tema"
 * (i.e. don't set colorSchemeId — the block inherits .theme-<id>).
 */
export function ColorSchemeControl({ value, onChange }: Props) {
  const schemes = useColorSchemes()
  if (schemes.length < 2) return null // nothing meaningful to choose

  const current = value ?? INHERIT

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">Esquema de colores</Label>
      <Select
        value={current}
        onValueChange={(v) => onChange(v === INHERIT ? undefined : v)}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INHERIT}>Heredar del tema (default)</SelectItem>
          {schemes.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex gap-0.5">
                  <span
                    className="h-3 w-3 rounded-full border border-black/10"
                    style={{ backgroundColor: s.colors.bg }}
                  />
                  <span
                    className="h-3 w-3 rounded-full border border-black/10"
                    style={{ backgroundColor: s.colors.primary }}
                  />
                  <span
                    className="h-3 w-3 rounded-full border border-black/10"
                    style={{ backgroundColor: s.colors.accent }}
                  />
                </span>
                {s.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Reemplaza los colores del bloque por los del esquema seleccionado.
      </p>
    </div>
  )
}

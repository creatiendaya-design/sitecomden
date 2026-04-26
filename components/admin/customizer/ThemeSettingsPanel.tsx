"use client"

import { Layers, Package } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TemplateRow } from "@/actions/landing-templates"
import type { MenuRow } from "@/actions/menus"

const NONE = "__none__"

export interface ThemeSettingsDraft {
  headerMenuId: string | null
  footerMenuId: string | null
  defaultProductLandingTemplateId: string | null
}

interface Props {
  draft: ThemeSettingsDraft
  onDraftChange: (next: ThemeSettingsDraft) => void
  landingTemplates: TemplateRow[]
  menus: MenuRow[]
}

/**
 * Plan 13 — "Tema" tab content for the customizer left panel.
 *
 * Holds settings that aren't blocks: header / footer menus, default
 * product landing template. Home and Cart pages are NOT here — they
 * have their own page-builder block lists in the "Bloques" tab.
 */
export function ThemeSettingsPanel({
  draft,
  onDraftChange,
  landingTemplates,
  menus,
}: Props) {
  const update = (patch: Partial<ThemeSettingsDraft>) => {
    onDraftChange({ ...draft, ...patch })
  }
  const eligibleMenus = menus.filter((m) => m.active)

  return (
    <div className="p-4 space-y-6">
      <Group icon={Layers} title="Header & Footer">
        <PickerField
          label="Menú del header"
          hint='Sin asignar usa el menú con slug "main"'
          value={draft.headerMenuId ?? NONE}
          onChange={(v) => update({ headerMenuId: v === NONE ? null : v })}
          noneLabel="Sin asignar (usar main)"
          options={eligibleMenus.map((m) => ({
            value: m.id,
            label: `${m.title} /${m.slug}`,
          }))}
        />
        <PickerField
          label="Menú del footer"
          hint='Sin asignar usa el menú con slug "footer"'
          value={draft.footerMenuId ?? NONE}
          onChange={(v) => update({ footerMenuId: v === NONE ? null : v })}
          noneLabel="Sin asignar (usar footer)"
          options={eligibleMenus.map((m) => ({
            value: m.id,
            label: `${m.title} /${m.slug}`,
          }))}
        />
      </Group>

      <Group icon={Package} title="Producto">
        <PickerField
          label="Plantilla por defecto"
          hint="Se aplica a productos que no tengan plantilla propia"
          value={draft.defaultProductLandingTemplateId ?? NONE}
          onChange={(v) =>
            update({
              defaultProductLandingTemplateId: v === NONE ? null : v,
            })
          }
          noneLabel="Sin plantilla por defecto"
          options={landingTemplates.map((t) => ({
            value: t.id,
            label: t.name,
          }))}
        />
      </Group>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Los cambios de configuración se aplican al guardar (botón{" "}
        <strong>Guardar</strong> arriba). Las ediciones de bloques en la
        pestaña <strong>Bloques</strong> se guardan automáticamente.
      </p>
    </div>
  )
}

interface GroupProps {
  icon: typeof Layers
  title: string
  children: React.ReactNode
}

function Group({ icon: Icon, title, children }: GroupProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

interface PickerFieldProps {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  noneLabel: string
  options: { value: string; label: string }[]
}

function PickerField({
  label,
  hint,
  value,
  onChange,
  noneLabel,
  options,
}: PickerFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{noneLabel}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

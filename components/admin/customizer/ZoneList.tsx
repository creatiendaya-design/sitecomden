"use client"

import { useState, useTransition } from "react"
import {
  ChevronDown,
  Layout,
  LayoutTemplate,
  Footprints,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { updateThemeMetadata } from "@/actions/themes"
import type { MenuRow } from "@/actions/menus"
import { EmbeddedBlocksEditor } from "./EmbeddedBlocksEditor"
import type { BlockInstance } from "@/lib/blocks/types"

const NONE = "__none__"

interface Props {
  themeId: string
  /** Initial menu ids — start as the persisted theme values; mutate
   *  optimistically and the server action keeps them in sync. */
  initialHeaderMenuId: string | null
  initialFooterMenuId: string | null
  menus: MenuRow[]
  /** Page id whose blocks belong to the Plantilla zone. Null when the
   *  current target doesn't have an editable Page (e.g. /productos
   *  index — system route, not page-builder). */
  editablePageId: string | null
  initialBlocks: BlockInstance[]
  targetLabel: string
  onBlocksSaved?: () => void
  onSettingsSaved?: () => void
}

/**
 * Plan 13 — Customizer left-panel zones (Shopify model).
 *
 * Three stacked zones replace the previous "Bloques / Tema" tabs:
 *   - Encabezado: single Header "section" with the menu picker inline.
 *   - Plantilla: page-builder block list for the active page.
 *   - Pie de página: single Footer "section" with the menu picker inline.
 *
 * Header / Footer pickers auto-save on change to match the autosave UX
 * of page blocks — there's no manual Save button for these. Settings
 * for blocks (Plantilla zone) live in the page-builder RightSidebar
 * which the shell renders alongside this list.
 */
export function ZoneList({
  themeId,
  initialHeaderMenuId,
  initialFooterMenuId,
  menus,
  editablePageId,
  initialBlocks,
  targetLabel,
  onBlocksSaved,
  onSettingsSaved,
}: Props) {
  const eligibleMenus = menus.filter((m) => m.active)

  return (
    <div className="flex flex-col">
      <Zone label="Encabezado" icon={Layout}>
        <SectionAccordion
          label="Encabezado"
          renderSettings={() => (
            <MenuPickerSection
              themeId={themeId}
              field="headerMenuId"
              initialValue={initialHeaderMenuId}
              menus={eligibleMenus}
              fallbackHint='Sin asignar usa el menú con slug "main"'
              onSaved={onSettingsSaved}
            />
          )}
        />
      </Zone>

      <Zone
        label="Plantilla"
        icon={LayoutTemplate}
        sublabel={targetLabel}
      >
        {editablePageId ? (
          <EmbeddedBlocksEditor
            pageId={editablePageId}
            initialBlocks={initialBlocks}
            onSaved={onBlocksSaved}
          />
        ) : (
          <div className="px-4 py-3 text-xs text-muted-foreground">
            Esta plantilla no admite edición de bloques en esta versión.
          </div>
        )}
      </Zone>

      <Zone label="Pie de página" icon={Footprints}>
        <SectionAccordion
          label="Pie de página"
          renderSettings={() => (
            <MenuPickerSection
              themeId={themeId}
              field="footerMenuId"
              initialValue={initialFooterMenuId}
              menus={eligibleMenus}
              fallbackHint='Sin asignar usa el menú con slug "footer"'
              onSaved={onSettingsSaved}
            />
          )}
        />
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

interface SectionAccordionProps {
  label: string
  renderSettings: () => React.ReactNode
}

/**
 * One row in a zone (e.g. "Encabezado"). Click toggles its inline
 * settings panel underneath. Mirrors Shopify's section list — clicking
 * the name reveals settings.
 */
function SectionAccordion({ label, renderSettings }: SectionAccordionProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
        aria-expanded={open}
      >
        <span className="text-sm flex-1">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="bg-muted/20 px-4 py-4 border-t">{renderSettings()}</div>
      )}
    </>
  )
}

interface MenuPickerSectionProps {
  themeId: string
  field: "headerMenuId" | "footerMenuId"
  initialValue: string | null
  menus: MenuRow[]
  fallbackHint: string
  onSaved?: () => void
}

/**
 * Inline menu picker for Header / Footer "sections". Auto-saves to the
 * theme on every change so the iframe can refresh without a manual save.
 */
function MenuPickerSection({
  themeId,
  field,
  initialValue,
  menus,
  fallbackHint,
  onSaved,
}: MenuPickerSectionProps) {
  const [value, setValue] = useState<string>(initialValue ?? NONE)
  const [pending, startTransition] = useTransition()

  const handleChange = (next: string) => {
    setValue(next)
    startTransition(async () => {
      try {
        await updateThemeMetadata(themeId, {
          [field]: next === NONE ? null : next,
        })
        onSaved?.()
      } catch (err) {
        // Roll back on failure so the UI matches the persisted state.
        setValue(initialValue ?? NONE)
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Menú a mostrar</Label>
      <Select value={value} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sin asignar (usar default)</SelectItem>
          {menus.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.title}{" "}
              <span className="text-muted-foreground">/{m.slug}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">{fallbackHint}</p>
    </div>
  )
}

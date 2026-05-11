"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronLeft,
  Loader2,
  Palette,
  Plus,
  Trash2,
  ChevronRight,
  ListChecks,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { updateThemeMetadata, type ThemeRow } from "@/actions/themes"
import {
  DEFAULT_THEME_TOKENS,
  resolveTokens,
  type ThemeTokens,
} from "@/lib/themes/tokens"
import {
  generateSchemeId,
  type ColorScheme,
  type ColorSchemeArray,
} from "@/lib/themes/color-schemes"
import { ThemeCatalogPanel } from "./ThemeCatalogPanel"
import type { ThemeSectionCatalog } from "@/lib/theme-sections/types"

interface Props {
  theme: ThemeRow
  onBack: () => void
  /** Triggered after a successful save so the customizer can reload the
   *  preview iframe to pick up the new tokens.css URL. */
  onSaved?: () => void
}

type View =
  | { kind: "schemes" }
  | { kind: "scheme"; schemeId: string }
  | { kind: "typography" }
  | { kind: "catalog" }

/**
 * Plan 13.1 — embedded tokens + color-schemes editor for the customizer.
 *
 * The default view shows two cards-style sections:
 *   - "Esquemas de colores": a grid of scheme cards (Aa preview), click
 *     to edit. "+" adds a new scheme. Mirrors Shopify's color-schemes UI.
 *   - "Tipografía y escala": fonts + radius + base font size, batched.
 *
 * Saves are explicit per-section (one button per editor view) — color
 * tweaks would be wasteful as autosaves and Shopify uses the same model.
 */
export function CustomizerTokensPanel({ theme, onBack, onSaved }: Props) {
  const [view, setView] = useState<View>({ kind: "schemes" })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => {
            if (view.kind === "schemes") onBack()
            else setView({ kind: "schemes" })
          }}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {view.kind === "schemes" ? "Secciones" : "Tema"}
        </Button>
        <span className="ml-1 inline-flex items-center gap-1.5 text-sm font-medium">
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          {view.kind === "scheme"
            ? "Editar esquema"
            : view.kind === "typography"
              ? "Tipografía y escala"
              : view.kind === "catalog"
                ? "Catálogo de secciones"
                : "Tema"}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {view.kind === "schemes" && (
          <SchemesIndex
            theme={theme}
            onPickScheme={(id) => setView({ kind: "scheme", schemeId: id })}
            onPickTypography={() => setView({ kind: "typography" })}
            onPickCatalog={() => setView({ kind: "catalog" })}
            onSaved={onSaved}
          />
        )}
        {view.kind === "scheme" && (
          <SchemeEditor
            theme={theme}
            schemeId={view.schemeId}
            onBack={() => setView({ kind: "schemes" })}
            onSaved={onSaved}
          />
        )}
        {view.kind === "typography" && (
          <TypographyEditor theme={theme} onSaved={onSaved} />
        )}
        {view.kind === "catalog" && (
          <ThemeCatalogPanel
            themeId={theme.id}
            initialCatalog={
              (theme.sectionCatalog ?? {}) as ThemeSectionCatalog
            }
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================
// Schemes index (grid of cards + typography link)
// ============================================================

interface SchemesIndexProps {
  theme: ThemeRow
  onPickScheme: (schemeId: string) => void
  onPickTypography: () => void
  onPickCatalog: () => void
  onSaved?: () => void
}

function SchemesIndex({
  theme,
  onPickScheme,
  onPickTypography,
  onPickCatalog,
  onSaved,
}: SchemesIndexProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const schemes = theme.colorSchemes

  const handleAddScheme = () => {
    if (pending) return
    startTransition(async () => {
      try {
        const id = generateSchemeId(`scheme ${schemes.length + 1}`, schemes)
        const next: ColorSchemeArray = [
          ...schemes,
          {
            id,
            name: `Esquema ${schemes.length + 1}`,
            colors: { ...DEFAULT_THEME_TOKENS.colors },
          },
        ]
        await updateThemeMetadata(theme.id, { colorSchemes: next })
        toast.success("Esquema agregado")
        router.refresh()
        onSaved?.()
        // Auto-open the new scheme so the admin starts customizing it.
        onPickScheme(id)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al agregar")
      }
    })
  }

  return (
    <div className="p-4 space-y-6">
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Esquemas de colores
        </h3>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Cada bloque puede aplicar un esquema distinto. El primer esquema
          es el por defecto.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {schemes.map((scheme, idx) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              index={idx}
              onClick={() => onPickScheme(scheme.id)}
            />
          ))}
          <button
            type="button"
            onClick={handleAddScheme}
            disabled={pending}
            className="aspect-[4/5] rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="text-[10px]">Agregar esquema</span>
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={onPickTypography}
        className="w-full flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        <span className="font-medium">Tipografía y escala</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      <button
        type="button"
        onClick={onPickCatalog}
        className="w-full flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
          Catálogo de secciones
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}

interface SchemeCardProps {
  scheme: ColorScheme
  index: number
  onClick: () => void
}

function SchemeCard({ scheme, index, onClick }: SchemeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-[4/5] rounded-md border bg-card flex flex-col overflow-hidden hover:border-primary/50 transition-colors"
      aria-label={`Editar ${scheme.name}`}
    >
      <div
        className="flex-1 flex items-center justify-center text-xl font-semibold"
        style={{
          backgroundColor: scheme.colors.bg,
          color: scheme.colors.text,
        }}
      >
        Aa
      </div>
      <div className="px-1.5 py-1 flex items-center gap-1 bg-muted/30 border-t">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: scheme.colors.primary }}
        />
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: scheme.colors.accent }}
        />
        <span className="ml-auto text-[10px] text-muted-foreground truncate">
          {index === 0 ? `${scheme.name} ·` : scheme.name}
        </span>
      </div>
    </button>
  )
}

// ============================================================
// Per-scheme editor
// ============================================================

interface SchemeEditorProps {
  theme: ThemeRow
  schemeId: string
  onBack: () => void
  onSaved?: () => void
}

function SchemeEditor({ theme, schemeId, onBack, onSaved }: SchemeEditorProps) {
  const router = useRouter()
  const initialScheme =
    theme.colorSchemes.find((s) => s.id === schemeId) ??
    theme.colorSchemes[0]
  const [name, setName] = useState(initialScheme.name)
  const [colors, setColors] = useState(initialScheme.colors)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Re-hydrate when the scheme id changes (admin clicked a different card).
  const lastIdRef = useRef(schemeId)
  useEffect(() => {
    if (lastIdRef.current === schemeId) return
    lastIdRef.current = schemeId
    setName(initialScheme.name)
    setColors(initialScheme.colors)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemeId])

  const isDefault = theme.colorSchemes[0]?.id === schemeId
  const canDelete = !isDefault && theme.colorSchemes.length > 1

  const handleSave = () => {
    if (pending) return
    const next: ColorSchemeArray = theme.colorSchemes.map((s) =>
      s.id === schemeId ? { ...s, name: name.trim() || s.name, colors } : s,
    )
    startTransition(async () => {
      try {
        await updateThemeMetadata(theme.id, { colorSchemes: next })
        toast.success("Esquema guardado")
        router.refresh()
        onSaved?.()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  const handleDelete = () => {
    if (pending || !canDelete) return
    const next = theme.colorSchemes.filter((s) => s.id !== schemeId)
    startTransition(async () => {
      try {
        await updateThemeMetadata(theme.id, { colorSchemes: next })
        toast.success("Esquema eliminado")
        router.refresh()
        onSaved?.()
        onBack()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al eliminar")
      }
    })
  }

  return (
    <>
      <div className="p-4 space-y-5">
        <div className="space-y-1.5">
          <Label className="text-xs">Nombre del esquema</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            className="h-9 text-sm"
          />
          {isDefault && (
            <p className="text-[11px] text-muted-foreground">
              Este es el esquema por defecto del tema. Bloques sin esquema
              asignado lo usan automáticamente.
            </p>
          )}
        </div>

        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Colores
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColorField
              label="Fondo"
              value={colors.bg}
              onChange={(v) => setColors((p) => ({ ...p, bg: v }))}
              disabled={pending}
            />
            <ColorField
              label="Texto"
              value={colors.text}
              onChange={(v) => setColors((p) => ({ ...p, text: v }))}
              disabled={pending}
            />
            <ColorField
              label="Primario"
              value={colors.primary}
              onChange={(v) => setColors((p) => ({ ...p, primary: v }))}
              disabled={pending}
            />
            <ColorField
              label="Texto sobre primario"
              value={colors.primaryForeground}
              onChange={(v) =>
                setColors((p) => ({ ...p, primaryForeground: v }))
              }
              disabled={pending}
            />
            <ColorField
              label="Acento"
              value={colors.accent}
              onChange={(v) => setColors((p) => ({ ...p, accent: v }))}
              disabled={pending}
            />
            <ColorField
              label="Texto sobre acento"
              value={colors.accentForeground}
              onChange={(v) =>
                setColors((p) => ({ ...p, accentForeground: v }))
              }
              disabled={pending}
            />
            <ColorField
              label="Texto secundario"
              value={colors.muted}
              onChange={(v) => setColors((p) => ({ ...p, muted: v }))}
              disabled={pending}
            />
            <ColorField
              label="Borde"
              value={colors.border}
              onChange={(v) => setColors((p) => ({ ...p, border: v }))}
              disabled={pending}
            />
          </div>
        </fieldset>

        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Eliminar esquema
          </Button>
        )}
      </div>

      <div className="border-t px-3 py-2 flex items-center justify-between gap-2 bg-card sticky bottom-0">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={pending}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este esquema?</AlertDialogTitle>
            <AlertDialogDescription>
              Bloques que estén usando &quot;{name}&quot; van a caer al
              esquema por defecto del tema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================================
// Typography + scale editor
// ============================================================

interface TypographyEditorProps {
  theme: ThemeRow
  onSaved?: () => void
}

function TypographyEditor({ theme, onSaved }: TypographyEditorProps) {
  const router = useRouter()
  const initial = resolveTokens(theme.tokens)
  const [fonts, setFonts] = useState(initial.fonts)
  const [scale, setScale] = useState(initial.scale)
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    if (pending) return
    const minimal: ThemeTokens = {
      // Preserve the legacy tokens.colors so `colorSchemeFromTokens`
      // still works for older blocks that don't reference a scheme.
      colors: theme.tokens.colors,
      fonts: {},
      scale: {},
    }
    for (const k of Object.keys(fonts) as (keyof typeof fonts)[]) {
      if (fonts[k] !== DEFAULT_THEME_TOKENS.fonts[k]) {
        minimal.fonts![k] = fonts[k]
      }
    }
    for (const k of Object.keys(scale) as (keyof typeof scale)[]) {
      if (scale[k] !== DEFAULT_THEME_TOKENS.scale[k]) {
        minimal.scale![k] = scale[k]
      }
    }
    startTransition(async () => {
      try {
        await updateThemeMetadata(theme.id, { tokens: minimal })
        toast.success("Tipografía guardada")
        router.refresh()
        onSaved?.()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <>
      <div className="p-4 space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tipografía
          </legend>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="font-heading" className="text-xs">
                Fuente para títulos
              </Label>
              <Input
                id="font-heading"
                value={fonts.heading}
                onChange={(e) =>
                  setFonts((p) => ({ ...p, heading: e.target.value }))
                }
                disabled={pending}
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="font-body" className="text-xs">
                Fuente para cuerpo
              </Label>
              <Input
                id="font-body"
                value={fonts.body}
                onChange={(e) =>
                  setFonts((p) => ({ ...p, body: e.target.value }))
                }
                disabled={pending}
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Escala
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="scale-radius" className="text-xs">
                Radio de borde
              </Label>
              <Input
                id="scale-radius"
                value={scale.radius}
                onChange={(e) =>
                  setScale((p) => ({ ...p, radius: e.target.value }))
                }
                disabled={pending}
                className="h-9 text-sm"
                placeholder="0.5rem"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scale-font-size" className="text-xs">
                Tamaño base
              </Label>
              <Input
                id="scale-font-size"
                value={scale.fontSize}
                onChange={(e) =>
                  setScale((p) => ({ ...p, fontSize: e.target.value }))
                }
                disabled={pending}
                className="h-9 text-sm"
                placeholder="16px"
              />
            </div>
          </div>
        </fieldset>
      </div>

      <div className="border-t px-3 py-2 flex items-center justify-end gap-2 bg-card sticky bottom-0">
        <Button size="sm" onClick={handleSave} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>
    </>
  )
}

// ============================================================
// Shared color field
// ============================================================

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

function ColorField({ label, value, onChange, disabled }: ColorFieldProps) {
  return (
    <div className={cn("space-y-1.5")}>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalizeHex(value)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 w-10 cursor-pointer rounded-md border border-input bg-background p-0.5 shrink-0"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="font-mono text-xs h-9"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

function normalizeHex(input: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(input)) return input
  if (/^#[0-9a-fA-F]{3}$/.test(input)) {
    const [r, g, b] = input.slice(1).split("")
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return "#000000"
}

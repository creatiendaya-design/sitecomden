"use client"

import { useEffect, useRef, useState } from "react"
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
  CreditCard,
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
import {
  updateThemeMetadataVersioned,
  type ThemeRow,
} from "@/actions/themes"
import { useVersionAwareSave } from "@/components/admin/concurrency/use-version-aware-save"
import { ConflictDialog } from "@/components/admin/concurrency/ConflictDialog"
import type { SaveResult } from "@/lib/concurrency/types"
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
import { FontPicker } from "./FontPicker"
import type { ThemeSectionCatalog } from "@/lib/theme-sections/types"
import { listCustomFonts } from "@/actions/fonts"
import type { CustomFontRecord } from "@/lib/fonts/custom"

interface Props {
  theme: ThemeRow
  onBack: () => void
  /** Triggered after a successful save so the customizer can reload the
   *  preview iframe to pick up the new tokens.css URL. */
  onSaved?: () => void
}

/**
 * Payload shape for `updateThemeMetadataVersioned`. Hoisted to a type so
 * children can declare their `save` prop without re-deriving it.
 */
type ThemeMetadataPayload = Parameters<typeof updateThemeMetadataVersioned>[2]

/**
 * Save callback shape passed down to each editor. Returns the SaveResult so
 * children can branch on `ok` for post-save side effects (toast, navigation).
 */
type ThemeSave = (payload: ThemeMetadataPayload) => Promise<SaveResult<ThemeRow>>

type View =
  | { kind: "schemes" }
  | { kind: "scheme"; schemeId: string }
  | { kind: "typography" }
  | { kind: "checkout" }
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
  const router = useRouter()

  // Plan 18 — version-aware save shared across all three editor views. One
  // hook instance + one <ConflictDialog> mount at the panel level keeps a
  // single source of truth for the current `version` and avoids racing
  // saves between sibling editors.
  const {
    state: saveState,
    save,
    acceptServerCopy,
    forceOverwrite,
    dismissConflict,
    setVersion,
  } = useVersionAwareSave({
    action: (expectedVersion, input: ThemeMetadataPayload) =>
      updateThemeMetadataVersioned(theme.id, expectedVersion, input),
    initialVersion: theme.version,
    onSuccess: () => {
      onSaved?.()
    },
    onReload: () => router.refresh(),
    onError: (message) => toast.error(message),
  })

  // Re-hydrate the tracked version whenever the parent passes a fresh theme
  // prop (e.g. after `router.refresh()` from acceptServerCopy or an external
  // edit). Without this, the hook would keep its initial version forever
  // and the next save would falsely conflict.
  useEffect(() => {
    setVersion(theme.version)
  }, [theme.version, setVersion])

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
              : view.kind === "checkout"
                ? "Checkout"
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
            onPickCheckout={() => setView({ kind: "checkout" })}
            onPickCatalog={() => setView({ kind: "catalog" })}
            save={save}
            saving={saveState.saving}
          />
        )}
        {view.kind === "scheme" && (
          <SchemeEditor
            theme={theme}
            schemeId={view.schemeId}
            onBack={() => setView({ kind: "schemes" })}
            save={save}
            saving={saveState.saving}
          />
        )}
        {view.kind === "typography" && (
          <TypographyEditor
            theme={theme}
            save={save}
            saving={saveState.saving}
          />
        )}
        {view.kind === "checkout" && (
          <CheckoutEditor
            theme={theme}
            save={save}
            saving={saveState.saving}
          />
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

      <ConflictDialog
        open={saveState.hasConflict}
        onOpenChange={(next) => {
          if (!next) dismissConflict()
        }}
        onReload={acceptServerCopy}
        onForce={forceOverwrite}
        resourceLabel="este tema"
      />
    </div>
  )
}

// ============================================================
// Schemes index (grid of cards + typography link)
// ============================================================

/**
 * Returns the next sequential number for an auto-generated scheme name.
 * Parses existing names matching "Esquema N" (case-insensitive, trim-tolerant)
 * and returns max(N) + 1, so deleting an intermediate scheme never produces
 * a duplicate name. Falls back to schemes.length + 1 when no numbered names
 * exist yet.
 */
function getNextSchemeNumber(schemes: ReadonlyArray<ColorScheme>): number {
  const pattern = /^esquema\s+(\d+)$/i
  let max = 0
  for (const s of schemes) {
    const match = s.name?.trim().match(pattern)
    if (match) {
      const n = parseInt(match[1], 10)
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return max > 0 ? max + 1 : schemes.length + 1
}

interface SchemesIndexProps {
  theme: ThemeRow
  onPickScheme: (schemeId: string) => void
  onPickTypography: () => void
  onPickCheckout: () => void
  onPickCatalog: () => void
  save: ThemeSave
  saving: boolean
}

function SchemesIndex({
  theme,
  onPickScheme,
  onPickTypography,
  onPickCheckout,
  onPickCatalog,
  save,
  saving,
}: SchemesIndexProps) {
  const schemes = theme.colorSchemes
  const pending = saving

  const handleAddScheme = async () => {
    if (saving) return
    const nextNumber = getNextSchemeNumber(schemes)
    const id = generateSchemeId(`scheme ${nextNumber}`, schemes)
    const next: ColorSchemeArray = [
      ...schemes,
      {
        id,
        name: `Esquema ${nextNumber}`,
        colors: { ...DEFAULT_THEME_TOKENS.colors },
      },
    ]
    const result = await save({ colorSchemes: next })
    if (result.ok) {
      toast.success("Esquema agregado")
      // Auto-open the new scheme so the admin starts customizing it.
      onPickScheme(id)
    }
    // Conflict / error cases are handled by the parent's hook + dialog;
    // we just skip the success toast and the auto-open.
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
        onClick={onPickCheckout}
        className="w-full flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
          Checkout
        </span>
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
  save: ThemeSave
  saving: boolean
}

function SchemeEditor({
  theme,
  schemeId,
  onBack,
  save,
  saving,
}: SchemeEditorProps) {
  const initialScheme =
    theme.colorSchemes.find((s) => s.id === schemeId) ??
    theme.colorSchemes[0]
  const [name, setName] = useState(initialScheme.name)
  const [colors, setColors] = useState(initialScheme.colors)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const pending = saving

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

  const handleSave = async () => {
    if (saving) return
    const next: ColorSchemeArray = theme.colorSchemes.map((s) =>
      s.id === schemeId ? { ...s, name: name.trim() || s.name, colors } : s,
    )
    const result = await save({ colorSchemes: next })
    if (result.ok) toast.success("Esquema guardado")
  }

  const handleDelete = async () => {
    if (saving || !canDelete) return
    const next = theme.colorSchemes.filter((s) => s.id !== schemeId)
    const result = await save({ colorSchemes: next })
    if (result.ok) {
      toast.success("Esquema eliminado")
      onBack()
    }
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
              label="Color del botón"
              value={colors.primary}
              onChange={(v) => setColors((p) => ({ ...p, primary: v }))}
              disabled={pending}
            />
            <ColorField
              label="Texto del botón"
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
            <ColorField
              label="Fondo drawer / modal"
              value={colors.drawerBg}
              onChange={(v) => setColors((p) => ({ ...p, drawerBg: v }))}
              disabled={pending}
            />
            <ColorField
              label="Texto drawer / modal"
              value={colors.drawerText}
              onChange={(v) => setColors((p) => ({ ...p, drawerText: v }))}
              disabled={pending}
            />
            <ColorField
              label="Fondo card"
              value={colors.cardBg}
              onChange={(v) => setColors((p) => ({ ...p, cardBg: v }))}
              disabled={pending}
            />
            <ColorField
              label="Texto card"
              value={colors.cardText}
              onChange={(v) => setColors((p) => ({ ...p, cardText: v }))}
              disabled={pending}
            />
            <ColorField
              label="Color del botón de card"
              value={colors.cardButtonBg}
              onChange={(v) => setColors((p) => ({ ...p, cardButtonBg: v }))}
              disabled={pending}
            />
            <ColorField
              label="Texto del botón de card"
              value={colors.cardButtonText}
              onChange={(v) =>
                setColors((p) => ({ ...p, cardButtonText: v }))
              }
              disabled={pending}
            />
            <ColorField
              label="Precio regular"
              value={colors.regularPrice}
              onChange={(v) => setColors((p) => ({ ...p, regularPrice: v }))}
              disabled={pending}
            />
            <ColorField
              label="Precio de comparación"
              value={colors.comparePrice}
              onChange={(v) => setColors((p) => ({ ...p, comparePrice: v }))}
              disabled={pending}
            />
            <ColorField
              label="Fondo de badge"
              value={colors.badgeBg}
              onChange={(v) => setColors((p) => ({ ...p, badgeBg: v }))}
              disabled={pending}
            />
            <ColorField
              label="Texto de badge"
              value={colors.badgeText}
              onChange={(v) => setColors((p) => ({ ...p, badgeText: v }))}
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
  save: ThemeSave
  saving: boolean
}

function TypographyEditor({ theme, save, saving }: TypographyEditorProps) {
  const initial = resolveTokens(theme.tokens)
  const [fonts, setFonts] = useState(initial.fonts)
  const [scale, setScale] = useState(initial.scale)
  const [customFonts, setCustomFonts] = useState<CustomFontRecord[]>([])
  const pending = saving

  const refreshCustomFonts = () => {
    listCustomFonts()
      .then(setCustomFonts)
      .catch(() => {
        /* non-fatal — picker still shows curated fonts */
      })
  }

  useEffect(() => {
    refreshCustomFonts()
  }, [])

  const handleSave = async () => {
    if (saving) return
    const minimal: ThemeTokens = {
      // Preserve the legacy tokens.colors so `colorSchemeFromTokens`
      // still works for older blocks that don't reference a scheme.
      colors: theme.tokens.colors,
      fonts: {},
      scale: {},
      // Each editor persists the whole `tokens` object, so carry the
      // checkout slice through untouched (else editing typography would
      // wipe checkout customizations).
      ...(theme.tokens.checkout ? { checkout: theme.tokens.checkout } : {}),
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
    const result = await save({ tokens: minimal })
    if (result.ok) toast.success("Tipografía guardada")
  }

  return (
    <>
      <div className="p-4 space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tipografía
          </legend>
          <div className="space-y-3">
            <FontPicker
              label="Fuente para títulos"
              value={fonts.heading}
              onChange={(stack) =>
                setFonts((p) => ({ ...p, heading: stack }))
              }
              customFonts={customFonts}
              onFontsChanged={refreshCustomFonts}
              disabled={pending}
            />
            <FontPicker
              label="Fuente para cuerpo"
              value={fonts.body}
              onChange={(stack) => setFonts((p) => ({ ...p, body: stack }))}
              customFonts={customFonts}
              onFontsChanged={refreshCustomFonts}
              disabled={pending}
            />
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
// Checkout editor (input + pay button chrome)
// ============================================================

interface CheckoutEditorProps {
  theme: ThemeRow
  save: ThemeSave
  saving: boolean
}

/**
 * Edits the `tokens.checkout` slice — colors / border / radius of the
 * checkout inputs and the pay button. Saves the whole `tokens` object (like
 * the other editors), preserving the other slices and storing only the
 * checkout fields that differ from the system defaults.
 */
function CheckoutEditor({ theme, save, saving }: CheckoutEditorProps) {
  const initial = resolveTokens(theme.tokens).checkout
  const [checkout, setCheckout] = useState(initial)
  const pending = saving

  const set = (key: keyof typeof checkout, value: string) =>
    setCheckout((p) => ({ ...p, [key]: value }))

  const handleSave = async () => {
    if (saving) return
    // Preserve sibling slices verbatim (raw stored deltas), and persist only
    // the checkout fields that differ from defaults to keep the JSON minimal.
    const checkoutDelta: NonNullable<ThemeTokens["checkout"]> = {}
    for (const k of Object.keys(checkout) as (keyof typeof checkout)[]) {
      if (checkout[k] !== DEFAULT_THEME_TOKENS.checkout[k]) {
        checkoutDelta[k] = checkout[k]
      }
    }
    const minimal: ThemeTokens = {
      colors: theme.tokens.colors,
      fonts: theme.tokens.fonts,
      scale: theme.tokens.scale,
      checkout: checkoutDelta,
    }
    const result = await save({ tokens: minimal })
    if (result.ok) toast.success("Checkout guardado")
  }

  return (
    <>
      <div className="p-4 space-y-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Personaliza el color, borde y radio de los campos del formulario y
          del botón de pago. Los valores por defecto reproducen el estilo
          actual.
        </p>

        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Campos del formulario
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColorField
              label="Fondo del campo"
              value={checkout.inputBg}
              onChange={(v) => set("inputBg", v)}
              disabled={pending}
            />
            <ColorField
              label="Borde"
              value={checkout.inputBorder}
              onChange={(v) => set("inputBorder", v)}
              disabled={pending}
            />
            <ColorField
              label="Borde al enfocar"
              value={checkout.inputBorderFocus}
              onChange={(v) => set("inputBorderFocus", v)}
              disabled={pending}
            />
            <div className="space-y-1.5">
              <Label htmlFor="checkout-input-radius" className="text-xs">
                Radio de esquinas
              </Label>
              <Input
                id="checkout-input-radius"
                value={checkout.inputRadius}
                onChange={(e) => set("inputRadius", e.target.value)}
                disabled={pending}
                className="h-9 text-sm"
                placeholder="0.75rem"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Botón de pagar
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColorField
              label="Fondo del botón"
              value={checkout.buttonBg}
              onChange={(v) => set("buttonBg", v)}
              disabled={pending}
            />
            <ColorField
              label="Texto del botón"
              value={checkout.buttonText}
              onChange={(v) => set("buttonText", v)}
              disabled={pending}
            />
            <div className="space-y-1.5">
              <Label htmlFor="checkout-button-radius" className="text-xs">
                Radio de esquinas
              </Label>
              <Input
                id="checkout-button-radius"
                value={checkout.buttonRadius}
                onChange={(e) => set("buttonRadius", e.target.value)}
                disabled={pending}
                className="h-9 text-sm"
                placeholder="0.375rem"
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

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateThemeMetadata, type ThemeRow } from "@/actions/themes"
import {
  DEFAULT_THEME_TOKENS,
  resolveTokens,
  type ThemeTokens,
} from "@/lib/themes/tokens"

interface Props {
  theme: ThemeRow
}

export function ThemeTokensForm({ theme }: Props) {
  const router = useRouter()
  const initial = resolveTokens(theme.tokens)
  const [colors, setColors] = useState(initial.colors)
  const [fonts, setFonts] = useState(initial.fonts)
  const [scale, setScale] = useState(initial.scale)
  const [pending, startTransition] = useTransition()

  const handleColorChange = (
    key: keyof typeof colors,
    value: string,
  ) => {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pending) return
    // Persist only fields that differ from the system default — keeps the
    // DB JSON minimal and makes "reset to defaults" a no-op.
    const minimal: ThemeTokens = { colors: {}, fonts: {}, scale: {} }
    for (const k of Object.keys(colors) as (keyof typeof colors)[]) {
      if (colors[k] !== DEFAULT_THEME_TOKENS.colors[k]) {
        minimal.colors![k] = colors[k]
      }
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
        toast.success("Tokens visuales actualizados")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  const handleReset = () => {
    setColors({ ...DEFAULT_THEME_TOKENS.colors })
    setFonts({ ...DEFAULT_THEME_TOKENS.fonts })
    setScale({ ...DEFAULT_THEME_TOKENS.scale })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Tokens visuales</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Identidad visual del tema. Se cargan en el storefront vía{" "}
          <code>/api/themes/tokens.css</code> y aplican bajo el wrapper{" "}
          <code>.theme-{theme.id.slice(0, 8)}…</code>.
        </p>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Colores
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorField
            label="Primario"
            value={colors.primary}
            onChange={(v) => handleColorChange("primary", v)}
            disabled={pending}
          />
          <ColorField
            label="Texto sobre primario"
            value={colors.primaryForeground}
            onChange={(v) => handleColorChange("primaryForeground", v)}
            disabled={pending}
          />
          <ColorField
            label="Acento"
            value={colors.accent}
            onChange={(v) => handleColorChange("accent", v)}
            disabled={pending}
          />
          <ColorField
            label="Texto sobre acento"
            value={colors.accentForeground}
            onChange={(v) => handleColorChange("accentForeground", v)}
            disabled={pending}
          />
          <ColorField
            label="Fondo de página"
            value={colors.bg}
            onChange={(v) => handleColorChange("bg", v)}
            disabled={pending}
          />
          <ColorField
            label="Texto del cuerpo"
            value={colors.text}
            onChange={(v) => handleColorChange("text", v)}
            disabled={pending}
          />
          <ColorField
            label="Texto secundario"
            value={colors.muted}
            onChange={(v) => handleColorChange("muted", v)}
            disabled={pending}
          />
          <ColorField
            label="Borde"
            value={colors.border}
            onChange={(v) => handleColorChange("border", v)}
            disabled={pending}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tipografía
        </legend>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="font-heading">Fuente para títulos</Label>
            <Input
              id="font-heading"
              value={fonts.heading}
              onChange={(e) => setFonts((p) => ({ ...p, heading: e.target.value }))}
              disabled={pending}
            />
            <p className="text-[11px] text-muted-foreground">
              Stack CSS completo, ej.{" "}
              <code>&apos;Playfair Display&apos;, serif</code>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="font-body">Fuente para cuerpo</Label>
            <Input
              id="font-body"
              value={fonts.body}
              onChange={(e) => setFonts((p) => ({ ...p, body: e.target.value }))}
              disabled={pending}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Escala
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="scale-radius">Radio de borde</Label>
            <Input
              id="scale-radius"
              value={scale.radius}
              onChange={(e) => setScale((p) => ({ ...p, radius: e.target.value }))}
              disabled={pending}
              placeholder="0.5rem"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scale-font-size">Tamaño base de fuente</Label>
            <Input
              id="scale-font-size"
              value={scale.fontSize}
              onChange={(e) => setScale((p) => ({ ...p, fontSize: e.target.value }))}
              disabled={pending}
              placeholder="16px"
            />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar tokens"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleReset}
          disabled={pending}
        >
          Restaurar por defecto
        </Button>
      </div>
    </form>
  )
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

function ColorField({ label, value, onChange, disabled }: ColorFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalizeHex(value)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="font-mono text-sm"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

/**
 * The native color input requires a 6-char hex like `#aabbcc`. Tokens may
 * be stored as 3-char hex, named colors, or oklch — fall back to black
 * rather than silently break the picker UI.
 */
function normalizeHex(input: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(input)) return input
  if (/^#[0-9a-fA-F]{3}$/.test(input)) {
    const [r, g, b] = input.slice(1).split("")
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return "#000000"
}

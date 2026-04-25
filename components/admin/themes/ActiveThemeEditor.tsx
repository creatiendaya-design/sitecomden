"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Store,
  Pencil,
  ListTree,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { setActiveTheme, type ThemeRow } from "@/actions/themes"
import type { TemplateRow } from "@/actions/landing-templates"
import { ThemeSectionList } from "./ThemeSectionList"
import { ThemeProductDefaultPicker } from "./ThemeProductDefaultPicker"

interface Props {
  activeTheme: ThemeRow | null
  allThemes: ThemeRow[]
  landingTemplates: TemplateRow[]
}

export function ActiveThemeEditor({ activeTheme, allThemes, landingTemplates }: Props) {
  const router = useRouter()
  const [showProductDefault, setShowProductDefault] = useState(false)
  const [pendingActivate, startActivateTransition] = useTransition()

  // No themes at all — defensive fallback. Themes are seeded by developers
  // (see scripts/seed-themes.ts), so admins should never hit this in practice.
  // The UI does NOT offer "Create theme" because that's a developer concern,
  // not a store-owner one.
  if (allThemes.length === 0) {
    return (
      <div className="container mx-auto py-16 max-w-xl text-center">
        <div className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Store className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Sin temas instalados</h1>
        <p className="text-sm text-muted-foreground">
          Tu tienda no tiene ningún tema instalado todavía. Pedile al
          desarrollador que ejecute{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            npx tsx scripts/seed-themes.ts
          </code>
          .
        </p>
      </div>
    )
  }

  if (!activeTheme) {
    // There ARE themes but none active — shouldn't happen because the seed
    // marks the first theme as active and the admin can't deactivate without
    // activating another. Provide a recovery UI just in case.
    return (
      <div className="container mx-auto py-16 max-w-xl text-center">
        <h1 className="text-xl font-bold mb-2">Sin tema activo</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Activá un tema desde la lista para empezar a editarlo.
        </p>
        <Button asChild variant="outline">
          <a href="/admin/personalizar/temas">Ver temas</a>
        </Button>
      </div>
    )
  }

  const handleSwitchTheme = (newId: string) => {
    if (newId === activeTheme.id || pendingActivate) return
    startActivateTransition(async () => {
      try {
        await setActiveTheme(newId)
        toast.success("Tema activado")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al activar tema")
      }
    })
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Tema activo
          </p>
          <h1 className="text-2xl font-bold">{activeTheme.name}</h1>
          {activeTheme.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {activeTheme.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {allThemes.length > 1 && (
            <Select
              value={activeTheme.id}
              onValueChange={handleSwitchTheme}
              disabled={pendingActivate}
            >
              <SelectTrigger className="h-9 w-[200px] text-sm">
                {pendingActivate ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Activando…
                  </span>
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>
                {allThemes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button asChild variant="outline" size="sm">
            <a href={`/admin/personalizar/temas/${activeTheme.id}/editar`}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Editar metadata
            </a>
          </Button>

          <Button asChild variant="outline" size="sm">
            <a href="/admin/personalizar/temas">
              <ListTree className="mr-2 h-3.5 w-3.5" />
              Ver todos
            </a>
          </Button>
        </div>
      </div>

      {/* Sections */}
      <ThemeSectionList
        activeTheme={activeTheme}
        onEditProductDefault={() => setShowProductDefault(true)}
      />

      <p className="mt-6 text-[11px] text-muted-foreground text-center">
        Solo la sección <strong>Producto</strong> está habilitada en este momento. Las
        demás secciones llegarán en planes posteriores (5–8).
      </p>

      <ThemeProductDefaultPicker
        open={showProductDefault}
        onOpenChange={setShowProductDefault}
        themeId={activeTheme.id}
        currentTemplateId={activeTheme.defaultProductLandingTemplateId}
        landingTemplates={landingTemplates}
        onSaved={() => {
          setShowProductDefault(false)
          router.refresh()
        }}
      />
    </div>
  )
}

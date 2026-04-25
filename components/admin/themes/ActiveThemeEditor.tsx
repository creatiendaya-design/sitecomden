"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Store,
  Plus,
  ChevronRight,
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
import { CreateThemeDialog } from "./CreateThemeDialog"

interface Props {
  activeTheme: ThemeRow | null
  allThemes: ThemeRow[]
  landingTemplates: TemplateRow[]
}

export function ActiveThemeEditor({ activeTheme, allThemes, landingTemplates }: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [showProductDefault, setShowProductDefault] = useState(false)
  const [pendingActivate, startActivateTransition] = useTransition()

  // No themes at all → onboarding
  if (allThemes.length === 0) {
    return (
      <>
        <div className="container mx-auto py-16 max-w-xl text-center">
          <div className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Store className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Aún no tenés ningún tema</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Un tema agrupa el diseño de toda tu tienda: home, productos, cart,
            páginas estáticas, etc. Empezá creando tu primer tema.
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear primer tema
          </Button>
        </div>

        <CreateThemeDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          onCreated={(id) => {
            setShowCreate(false)
            toast.success("Tema creado y activado")
            router.refresh()
            router.push(`/admin/personalizar/temas/${id}/editar`)
          }}
        />
      </>
    )
  }

  if (!activeTheme) {
    // There ARE themes but none active — shouldn't happen because creating
    // the first theme auto-activates. Provide a recovery UI just in case.
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

          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Crear tema
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

      <CreateThemeDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(id) => {
          setShowCreate(false)
          toast.success("Tema creado")
          router.refresh()
          router.push(`/admin/personalizar/temas/${id}/editar`)
        }}
      />

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

// Re-export the chevron — used inside ThemeSectionList. Keeps the icon set
// localized to this folder for easy theme-wide tweaks later.
export { ChevronRight as SectionChevron }

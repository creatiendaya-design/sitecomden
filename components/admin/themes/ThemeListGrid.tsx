"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  MoreHorizontal,
  Pencil,
  CheckCircle2,
  Store,
  Eye,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { setActiveTheme, type ThemeRow } from "@/actions/themes"

interface Props {
  initialThemes: ThemeRow[]
}

/**
 * Plan 13 — themes list redesigned to mirror Shopify's /admin/themes page.
 * Each theme is a large card with desktop + mobile preview iframes (lazy
 * loaded), a "Tema actual" badge for the active one, and an "Editar tema"
 * button that opens the Customizer.
 */
export function ThemeListGrid({ initialThemes }: Props) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const handleActivate = (theme: ThemeRow) => {
    if (theme.active || pendingId) return
    setPendingId(theme.id)
    startTransition(async () => {
      try {
        await setActiveTheme(theme.id)
        toast.success(`"${theme.name}" activado`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al activar")
      } finally {
        setPendingId(null)
      }
    })
  }

  const dateFormatter = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          <h1 className="text-xl font-bold">Temas</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/" target="_blank" rel="noopener">
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Ver tienda
          </Link>
        </Button>
      </div>

      {initialThemes.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Store className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Tu tienda no tiene ningún tema instalado todavía. Pedile al
            desarrollador que ejecute{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              npx tsx scripts/seed-themes.ts
            </code>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {initialThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              pending={pendingId === theme.id}
              onActivate={() => handleActivate(theme)}
              dateFormatter={dateFormatter}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface CardProps {
  theme: ThemeRow
  pending: boolean
  onActivate: () => void
  dateFormatter: Intl.DateTimeFormat
}

function ThemeCard({ theme, pending, onActivate, dateFormatter }: CardProps) {
  const router = useRouter()
  const [showPreview, setShowPreview] = useState(false)
  const previewSrc = `/?theme-preview=${theme.id}`

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Preview area — placeholder by default, swaps to live iframe on
          demand. Loading both desktop + mobile iframes for every card on
          mount was saturating the dev server's Postgres connection pool
          (each iframe is a full storefront SSR), so we keep them off
          until the admin explicitly opts in. */}
      <div className="relative bg-muted/40 p-4 flex items-stretch justify-center gap-4 min-h-[240px]">
        {showPreview ? (
          <>
            <div className="flex-1 max-w-[640px] aspect-[16/10] overflow-hidden rounded border bg-background pointer-events-none">
              <iframe
                src={previewSrc}
                title={`Vista previa desktop de ${theme.name}`}
                className="w-[1280px] h-[800px] origin-top-left"
                style={{ transform: "scale(0.5)" }}
                loading="lazy"
                tabIndex={-1}
              />
            </div>
            <div className="w-[180px] aspect-[9/16] overflow-hidden rounded border bg-background hidden md:block pointer-events-none">
              <iframe
                src={previewSrc}
                title={`Vista previa mobile de ${theme.name}`}
                className="w-[390px] h-[693px] origin-top-left"
                style={{ transform: "scale(0.461)" }}
                loading="lazy"
                tabIndex={-1}
              />
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex flex-col items-center justify-center gap-2 w-full rounded-md border-2 border-dashed text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors py-10"
          >
            <Eye className="h-6 w-6" />
            <span>Cargar vista previa</span>
            <span className="text-[11px]">
              Para editar el tema, hacé clic en <strong>Editar tema</strong>
            </span>
          </button>
        )}
      </div>

      {/* Footer row: meta + actions */}
      <div className="border-t px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="text-sm font-semibold truncate">{theme.name}</h2>
            {theme.active && (
              <Badge variant="default" className="text-[10px]">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Tema actual
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Último guardado: {dateFormatter.format(theme.updatedAt)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a
                  href={`/api/admin/themes/${theme.id}/preview`}
                  target="_blank"
                  rel="noopener"
                >
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  Vista previa en tienda
                </a>
              </DropdownMenuItem>
              {!theme.active && (
                <DropdownMenuItem
                  onClick={onActivate}
                  disabled={pending}
                >
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  Activar para todos
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/admin/personalizar/temas/${theme.id}/editar`)
                }
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Editar metadata
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild size="sm">
            <Link href={`/admin/personalizar/temas/${theme.id}/customize`}>
              Editar tema
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

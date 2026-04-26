"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  MoreHorizontal,
  Pencil,
  CheckCircle2,
  Store,
  Eye,
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
import {
  setActiveTheme,
  type ThemeRow,
} from "@/actions/themes"

interface Props {
  initialThemes: ThemeRow[]
}

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

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Temas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Solo un tema puede estar activo a la vez. Los temas son
            instalados por el desarrollador — no se crean desde el admin.
          </p>
        </div>
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
        <div className="grid gap-4 @md:grid-cols-2 @lg:grid-cols-3">
          {initialThemes.map((theme) => (
            <div
              key={theme.id}
              className="rounded-lg border bg-card p-4 flex flex-col"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-semibold truncate">
                      {theme.name}
                    </h2>
                    {theme.active && (
                      <Badge variant="default" className="text-[10px]">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Activo
                      </Badge>
                    )}
                  </div>
                  {theme.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {theme.description}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
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
                        Vista previa
                      </a>
                    </DropdownMenuItem>
                    {!theme.active && (
                      <DropdownMenuItem
                        onClick={() => handleActivate(theme)}
                        disabled={pendingId === theme.id}
                      >
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                        Activar para todos
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(
                          `/admin/personalizar/temas/${theme.id}/editar`,
                        )
                      }
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Editar metadata
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-auto pt-3 text-xs text-muted-foreground">
                {theme.defaultProductLandingTemplateName ? (
                  <span>
                    Producto:{" "}
                    <span className="font-medium text-foreground">
                      {theme.defaultProductLandingTemplateName}
                    </span>
                  </span>
                ) : (
                  <span>Sin plantilla de producto</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

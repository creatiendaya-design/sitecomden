"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  MoreHorizontal,
  Pencil,
  CheckCircle2,
  Trash2,
  Store,
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
import { toast } from "sonner"
import {
  deleteTheme,
  setActiveTheme,
  type ThemeRow,
} from "@/actions/themes"
import { CreateThemeDialog } from "./CreateThemeDialog"

interface Props {
  initialThemes: ThemeRow[]
}

export function ThemeListGrid({ initialThemes }: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ThemeRow | null>(null)
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

  const handleDelete = (theme: ThemeRow) => {
    setPendingId(theme.id)
    startTransition(async () => {
      try {
        await deleteTheme(theme.id)
        toast.success("Tema eliminado")
        setConfirmDelete(null)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al eliminar")
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
            Cada tema agrupa el diseño de tu tienda. Solo un tema puede estar
            activo a la vez.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo tema
        </Button>
      </div>

      {initialThemes.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Store className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            Aún no tenés ningún tema.
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear primer tema
          </Button>
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
                    {!theme.active && (
                      <DropdownMenuItem
                        onClick={() => handleActivate(theme)}
                        disabled={pendingId === theme.id}
                      >
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                        Activar
                      </DropdownMenuItem>
                    )}
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
                    {!theme.active && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setConfirmDelete(theme)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Eliminar
                        </DropdownMenuItem>
                      </>
                    )}
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

      <CreateThemeDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(id) => {
          setShowCreate(false)
          router.refresh()
          router.push(`/admin/personalizar/temas/${id}/editar`)
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tema</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el tema <strong>{confirmDelete?.name}</strong>? Los
              productos sin plantilla propia perderán su default si este tema
              estaba siendo usado como default. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={pendingId === confirmDelete?.id}
            >
              {pendingId === confirmDelete?.id ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  FileText,
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
import {
  listPages,
  deletePage,
  togglePageActive,
  type PageRow,
} from "@/actions/pages"
import { CreatePageDialog } from "./CreatePageDialog"

interface PageListGridProps {
  initialPages: PageRow[]
}

export function PageListGrid({ initialPages }: PageListGridProps) {
  const router = useRouter()
  const [pages, setPages] = useState<PageRow[]>(initialPages)
  const [createOpen, setCreateOpen] = useState(false)

  async function refreshPages() {
    try {
      const fresh = await listPages()
      setPages(fresh)
    } catch {
      router.refresh()
    }
  }

  function handleCreated(id: string) {
    setCreateOpen(false)
    router.push(`/admin/paginas/${id}`)
  }

  const dateFormatter = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Páginas estáticas</h1>
          <p className="text-muted-foreground">
            Crea y gestiona páginas como Nosotros, Términos, Privacidad o
            Promociones.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva página
        </Button>
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-4 max-w-md text-muted-foreground">
            Aún no hay páginas. Crea la primera para empezar.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear primera página
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              onMutate={refreshPages}
              dateFormatter={dateFormatter}
            />
          ))}
        </div>
      )}

      <CreatePageDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}

interface PageCardProps {
  page: PageRow
  onMutate: () => Promise<void> | void
  dateFormatter: Intl.DateTimeFormat
}

function PageCard({ page, onMutate, dateFormatter }: PageCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const editorHref = `/admin/paginas/${page.id}`
  const metadataHref = `/admin/paginas/${page.id}/editar`

  function handleToggleActive() {
    startTransition(async () => {
      try {
        await togglePageActive(page.id)
        toast.success(page.active ? "Página desactivada" : "Página activada")
        await onMutate()
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "No se pudo cambiar el estado"
        toast.error(msg)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deletePage(page.id)
        toast.success("Página eliminada")
        setConfirmDeleteOpen(false)
        await onMutate()
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "No se pudo eliminar la página"
        toast.error(msg)
      }
    })
  }

  return (
    <>
      <div className="group relative overflow-hidden rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push(editorHref)}
            className="flex-1 min-w-0 text-left focus:outline-none"
          >
            <h3 className="truncate font-semibold text-foreground">
              {page.title}
            </h3>
            <code className="mt-1 inline-block truncate text-xs text-muted-foreground">
              /{page.slug}
            </code>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isPending}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                aria-label="Opciones de la página"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => router.push(editorHref)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar contenido
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(metadataHref)}>
                <Settings className="mr-2 h-4 w-4" />
                Editar metadata
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={handleToggleActive}
                disabled={isPending}
              >
                {page.active ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Desactivar
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Activar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setConfirmDeleteOpen(true)
                }}
                className="text-destructive focus:text-destructive"
                disabled={isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {page.description ? (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {page.description}
          </p>
        ) : (
          <p className="mt-3 text-sm italic text-muted-foreground/70">
            Sin descripción
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {page.blockCount}{" "}
            {page.blockCount === 1 ? "bloque" : "bloques"}
          </span>
          <div className="flex items-center gap-2">
            {!page.active && <Badge variant="secondary">Inactiva</Badge>}
            <span>{dateFormatter.format(page.updatedAt)}</span>
          </div>
        </div>
      </div>

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar página?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. La URL <code>/{page.slug}</code> dejará
              de estar disponible y todos los bloques se eliminarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

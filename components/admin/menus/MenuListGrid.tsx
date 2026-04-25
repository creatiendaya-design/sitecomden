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
  Menu as MenuIcon,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  listMenus,
  deleteMenu,
  toggleMenuActive,
  type MenuRow,
} from "@/actions/menus"
import { CreateMenuDialog } from "./CreateMenuDialog"

interface MenuListGridProps {
  initialMenus: MenuRow[]
}

export function MenuListGrid({ initialMenus }: MenuListGridProps) {
  const router = useRouter()
  const [menus, setMenus] = useState<MenuRow[]>(initialMenus)
  const [createOpen, setCreateOpen] = useState(false)

  async function refreshMenus() {
    try {
      const fresh = await listMenus()
      setMenus(fresh)
    } catch {
      router.refresh()
    }
  }

  function handleCreated(id: string) {
    setCreateOpen(false)
    router.push(`/admin/menus/${id}`)
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
          <h1 className="text-3xl font-bold">Menús</h1>
          <p className="text-muted-foreground">
            Gestioná la navegación de la tienda: header, footer y otros menús.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear menú
        </Button>
      </div>

      {menus.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <MenuIcon className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-4 max-w-md text-muted-foreground">
            Aún no hay menús. Crea el primero para empezar.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear primer menú
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Menú</TableHead>
                <TableHead>Elementos del menú</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menus.map((menu) => (
                <MenuRowItem
                  key={menu.id}
                  menu={menu}
                  onMutate={refreshMenus}
                  dateFormatter={dateFormatter}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateMenuDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}

interface MenuCardProps {
  menu: MenuRow
  onMutate: () => Promise<void> | void
  dateFormatter: Intl.DateTimeFormat
}

function MenuRowItem({ menu, onMutate, dateFormatter: _dateFormatter }: MenuCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const editorHref = `/admin/menus/${menu.id}`
  const metadataHref = `/admin/menus/${menu.id}/editar`

  function handleToggleActive() {
    startTransition(async () => {
      try {
        await toggleMenuActive(menu.id)
        toast.success(menu.active ? "Menú desactivado" : "Menú activado")
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
        await deleteMenu(menu.id)
        toast.success("Menú eliminado")
        setConfirmDeleteOpen(false)
        await onMutate()
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "No se pudo eliminar el menú"
        toast.error(msg)
      }
    })
  }

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => router.push(editorHref)}
      >
        <TableCell className="align-top py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{menu.title}</span>
            {!menu.active && (
              <Badge variant="secondary" className="text-[10px]">
                Inactivo
              </Badge>
            )}
          </div>
          <code className="mt-0.5 block text-xs text-muted-foreground">
            /{menu.slug}
          </code>
        </TableCell>
        <TableCell className="align-top py-3 text-sm text-muted-foreground">
          {menu.itemCount} {menu.itemCount === 1 ? "elemento" : "elementos"}
        </TableCell>
        <TableCell
          className="align-top py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isPending}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                aria-label="Opciones del menú"
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
                {menu.active ? (
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
        </TableCell>
      </TableRow>

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar menú?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. El menú con slug{" "}
              <code>{menu.slug}</code> y todos sus items se eliminarán.
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

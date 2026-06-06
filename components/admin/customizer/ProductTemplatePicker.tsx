"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, MoreHorizontal, Plus, Star, Trash2, Pencil, Copy } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Switch } from "@/components/ui/switch"
import {
  createProductTemplate,
  deleteProductTemplate,
  duplicateProductTemplate,
  renameProductTemplate,
  setDefaultProductTemplate,
  updateProductTemplateChrome,
  type ProductTemplateRow,
} from "@/actions/theme-product-templates"
import { toast } from "sonner"

interface Props {
  themeId: string
  templates: ProductTemplateRow[]
  activeTemplateId: string | null
  /** Refresh the preview iframe after a change that affects the storefront
   *  (e.g. header/footer visibility). Wired to the shell's handleAnySaved. */
  onChanged?: () => void
}

const CREATE_VALUE = "__create__"

/**
 * Plan 19 — product template picker shown above the PRODUCT-group editor in
 * the customizer's "Plantilla" zone. Switching the select navigates to
 * `?target=product&productTemplate=<id>` so the server re-fetches the
 * selected template's sections. The overflow menu manages the template
 * containers (create / duplicate / rename / set-default / delete).
 */
export function ProductTemplatePicker({
  themeId,
  templates,
  activeTemplateId,
  onChanged,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<
    | { kind: "create" }
    | { kind: "duplicate" }
    | { kind: "rename" }
    | null
  >(null)
  const [name, setName] = useState("")
  const [showDelete, setShowDelete] = useState(false)

  const active =
    templates.find((t) => t.id === activeTemplateId) ??
    templates.find((t) => t.isDefault) ??
    templates[0] ??
    null

  const goToTemplate = (id: string) => {
    router.push(
      `/admin/personalizar/temas/${themeId}/customize?target=product&productTemplate=${encodeURIComponent(id)}`,
    )
  }

  const handleSelect = (value: string) => {
    if (value === CREATE_VALUE) {
      setName("")
      setDialog({ kind: "create" })
      return
    }
    if (value === active?.id) return
    goToTemplate(value)
  }

  const openDialog = (kind: "create" | "duplicate" | "rename") => {
    setName(kind === "rename" ? active?.name ?? "" : "")
    setDialog({ kind })
  }

  const submitDialog = () => {
    const trimmed = name.trim()
    if (!trimmed || !dialog) return
    startTransition(async () => {
      try {
        if (dialog.kind === "create") {
          const tpl = await createProductTemplate(trimmed, { themeId })
          toast.success("Plantilla creada")
          setDialog(null)
          goToTemplate(tpl.id)
        } else if (dialog.kind === "duplicate") {
          if (!active) return
          const tpl = await duplicateProductTemplate(active.id, trimmed)
          toast.success("Plantilla duplicada")
          setDialog(null)
          goToTemplate(tpl.id)
        } else {
          if (!active) return
          await renameProductTemplate(active.id, trimmed)
          toast.success("Plantilla renombrada")
          setDialog(null)
          router.refresh()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error")
      }
    })
  }

  const handleSetDefault = () => {
    if (!active || active.isDefault) return
    startTransition(async () => {
      try {
        await setDefaultProductTemplate(active.id)
        toast.success("Plantilla marcada como predeterminada")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error")
      }
    })
  }

  const handleChrome = (next: { hideHeader?: boolean; hideFooter?: boolean }) => {
    if (!active) return
    const hideHeader = next.hideHeader ?? active.hideHeader
    const hideFooter = next.hideFooter ?? active.hideFooter
    startTransition(async () => {
      try {
        await updateProductTemplateChrome(active.id, hideHeader, hideFooter)
        router.refresh()
        onChanged?.()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error")
      }
    })
  }

  const handleDelete = () => {
    if (!active || active.isDefault) return
    startTransition(async () => {
      try {
        await deleteProductTemplate(active.id)
        toast.success("Plantilla eliminada")
        setShowDelete(false)
        // Fall back to the default template.
        router.push(
          `/admin/personalizar/temas/${themeId}/customize?target=product`,
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error")
      }
    })
  }

  const dialogTitle =
    dialog?.kind === "create"
      ? "Nueva plantilla de producto"
      : dialog?.kind === "duplicate"
        ? "Duplicar plantilla"
        : "Renombrar plantilla"

  return (
    <div className="border-b bg-background">
      <div className="flex items-center gap-1.5 px-3 py-2">
      <Select
        value={active?.id ?? ""}
        onValueChange={handleSelect}
        disabled={isPending}
      >
        <SelectTrigger className="h-8 text-xs flex-1">
          <SelectValue placeholder="Plantilla…" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              <span className="inline-flex items-center gap-1.5">
                {t.isDefault && <Star className="h-3 w-3 text-amber-500" />}
                {t.name}
              </span>
            </SelectItem>
          ))}
          <SelectItem value={CREATE_VALUE} className="text-primary">
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-3 w-3" />
              Crear plantilla
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openDialog("create")}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Crear plantilla
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openDialog("duplicate")}
            disabled={!active}
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            Duplicar actual
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openDialog("rename")}
            disabled={!active}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Renombrar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleSetDefault}
            disabled={!active || active.isDefault}
          >
            {active?.isDefault ? (
              <Check className="mr-2 h-3.5 w-3.5" />
            ) : (
              <Star className="mr-2 h-3.5 w-3.5" />
            )}
            {active?.isDefault ? "Es la predeterminada" : "Marcar predeterminada"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowDelete(true)}
            disabled={!active || active.isDefault}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      {/* Plan 19 — landing-style toggles: hide the global header/footer for
          products on this template. */}
      {active && (
        <div className="flex items-center gap-4 px-3 pb-2 text-[11px] text-muted-foreground">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch
              checked={!active.hideHeader}
              onCheckedChange={(v) => handleChrome({ hideHeader: !v })}
              disabled={isPending}
            />
            Encabezado
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch
              checked={!active.hideFooter}
              onCheckedChange={(v) => handleChrome({ hideFooter: !v })}
              disabled={isPending}
            />
            Pie de página
          </label>
        </div>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {dialog?.kind === "create"
                ? "Se crea copiando la plantilla predeterminada del tema."
                : dialog?.kind === "duplicate"
                  ? "Se crea una copia de la plantilla actual con sus secciones."
                  : "Cambia el nombre de la plantilla."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ptpl-name">Nombre</Label>
            <Input
              id="ptpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Landing promo"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submitDialog()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={submitDialog} disabled={isPending || !name.trim()}>
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar plantilla</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la plantilla <strong>{active?.name}</strong> y sus
              secciones. Los productos que la usaban volverán a la plantilla
              predeterminada del tema. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
            >
              {isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

"use client"

import { useTransition } from "react"
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
import { applyTemplateToProduct, type TemplateRow } from "@/actions/landing-templates"
import { toast } from "sonner"

interface Props {
  productId: string
  productSlug: string
  template: TemplateRow
  currentBlockCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplied: () => void
}

export function ApplyTemplateDialog({
  productId,
  template,
  currentBlockCount,
  open,
  onOpenChange,
  onApplied,
}: Props) {
  const [pending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await applyTemplateToProduct(productId, template.id)
        onApplied()
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al aplicar plantilla"
        toast.error(msg)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aplicar plantilla: {template.name}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Se REEMPLAZARÁN los {currentBlockCount}{" "}
              {currentBlockCount === 1 ? "bloque actual" : "bloques actuales"} del producto por los{" "}
              {template.blockCount} {template.blockCount === 1 ? "bloque" : "bloques"} de la plantilla. El
              producto quedará VINCULADO y los cambios futuros a la plantilla se aplicarán automáticamente.
            </span>
            <span className="block text-destructive font-medium">
              ⚠ Los bloques locales actuales se perderán. Esta acción no se puede deshacer.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={pending}>
            {pending ? "Aplicando..." : "Reemplazar y vincular"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

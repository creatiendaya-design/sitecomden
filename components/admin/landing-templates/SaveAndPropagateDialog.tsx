"use client"

import { useEffect, useState } from "react"
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
import { computeTemplateDiff } from "@/lib/blocks/template-diff"
import { countProductsUsingTemplate } from "@/actions/landing-templates"
import { getBlockDefinition } from "@/lib/blocks/registry"
import type { BlockInstance } from "@/lib/blocks/types"

interface Props {
  templateId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  original: BlockInstance[]
  current: BlockInstance[]
  onConfirm: () => void
  pending: boolean
}

function blockLabel(block: BlockInstance): string {
  const def = getBlockDefinition(block.type)
  return def?.label ?? String(block.type)
}

export function SaveAndPropagateDialog({
  templateId,
  open,
  onOpenChange,
  original,
  current,
  onConfirm,
  pending,
}: Props) {
  const diff = computeTemplateDiff(original, current)
  const [productCount, setProductCount] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    countProductsUsingTemplate(templateId)
      .then((n) => {
        if (!cancelled) setProductCount(n)
      })
      .catch(() => {
        if (!cancelled) setProductCount(null)
      })
    return () => {
      cancelled = true
    }
  }, [open, templateId])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Guardar y propagar cambios</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {productCount === null ? (
              <span className="block text-xs text-muted-foreground">
                Calculando productos vinculados…
              </span>
            ) : productCount === 0 ? (
              <span className="block">
                Esta plantilla aún no está vinculada a ningún producto. Los cambios
                se aplicarán a futuros productos que la usen.
              </span>
            ) : (
              <span className="block">
                Esta plantilla está vinculada a{" "}
                <strong>
                  {productCount} {productCount === 1 ? "producto" : "productos"}
                </strong>
                . Los cambios se aplicarán automáticamente a todos los bloques
                que no hayan sido editados localmente en esos productos.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="text-sm">
          <p className="font-medium mb-2">Resumen de cambios:</p>
          <ul className="space-y-1 text-xs max-h-48 overflow-auto">
            {diff.added.map((b) => (
              <li key={`add-${b.id}`} className="text-emerald-700 dark:text-emerald-300">
                • Bloque <strong>{blockLabel(b)}</strong> nuevo
              </li>
            ))}
            {diff.modified.map(({ after }) => (
              <li key={`mod-${after.id}`} className="text-amber-700 dark:text-amber-300">
                • Bloque <strong>{blockLabel(after)}</strong> modificado
              </li>
            ))}
            {diff.removed.map((b) => (
              <li key={`del-${b.id}`} className="text-destructive">
                • Bloque <strong>{blockLabel(b)}</strong> eliminado
              </li>
            ))}
            {diff.added.length + diff.modified.length + diff.removed.length === 0 && (
              <li className="text-muted-foreground">No hay cambios.</li>
            )}
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Guardando..." : "Guardar y propagar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

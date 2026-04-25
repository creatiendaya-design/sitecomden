"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Link2, Pencil, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { detachTemplateBlock, restoreTemplateBlock } from "@/actions/landing-templates"
import { useBuilderStore } from "../store"
import { toast } from "sonner"
import type { BlockInstance } from "@/lib/blocks/types"
import type { BuilderContext } from "../types"

interface Props {
  block: BlockInstance
  context?: BuilderContext
}

export function InheritanceBanner({ block, context }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (block.origin !== "template" && block.origin !== "detached") return null

  // Banner only meaningful in product context (template editor doesn't show it).
  if (context?.type !== "product") return null

  const productId = context.product.id
  const templateBlockId = block.sourceTemplateBlockId

  if (!templateBlockId) return null

  const handleDetach = () => {
    startTransition(async () => {
      try {
        await detachTemplateBlock(productId, templateBlockId)
        toast.success("Bloque desvinculado. Ahora podés editarlo localmente.")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al desvincular")
      }
    })
  }

  const handleRestore = () => {
    startTransition(async () => {
      try {
        await restoreTemplateBlock(productId, block.id)
        // The selection will be lost since the LandingBlock id disappears;
        // clear it explicitly so the panel doesn't show stale state.
        useBuilderStore.getState().selectBlock(null)
        toast.success("Bloque restaurado a la plantilla")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al restaurar")
      }
    })
  }

  if (block.origin === "template") {
    return (
      <div className="mx-3 mt-3 p-3 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900 text-xs space-y-2">
        <div className="flex items-start gap-2">
          <Link2 className="h-3.5 w-3.5 mt-0.5 text-blue-700 dark:text-blue-300 shrink-0" />
          <p className="text-blue-900 dark:text-blue-100">
            Este bloque viene de una plantilla. Sus campos están bloqueados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleDetach} disabled={pending} className="flex-1">
            <Pencil className="h-3 w-3 mr-1" />
            Editar localmente
          </Button>
        </div>
      </div>
    )
  }

  // detached
  return (
    <div className="mx-3 mt-3 p-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 text-xs space-y-2">
      <div className="flex items-start gap-2">
        <Pencil className="h-3.5 w-3.5 mt-0.5 text-amber-700 dark:text-amber-300 shrink-0" />
        <p className="text-amber-900 dark:text-amber-100">
          Este bloque está desvinculado de la plantilla. Tus cambios no afectan a la plantilla.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={handleRestore} disabled={pending} className="w-full">
        <RotateCcw className="h-3 w-3 mr-1" />
        Restaurar al template
      </Button>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Layers, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { toggleHideProductGrid } from "@/actions/categories-blocks"

interface Props {
  categoryId: string
  blockCount: number
  hideProductGrid: boolean
}

export function CategoryDesignSection({
  categoryId,
  blockCount,
  hideProductGrid: initialHide,
}: Props) {
  const router = useRouter()
  const [hideGrid, setHideGrid] = useState(initialHide)
  const [pending, startTransition] = useTransition()

  const handleToggle = (next: boolean) => {
    if (pending) return
    // Optimistic flip; revert on error.
    setHideGrid(next)
    startTransition(async () => {
      try {
        const res = await toggleHideProductGrid(categoryId)
        // Server is the source of truth — sync with what came back.
        setHideGrid(res.hideProductGrid)
        toast.success(
          res.hideProductGrid
            ? "Grid de productos oculto"
            : "Grid de productos visible",
        )
        router.refresh()
      } catch (err) {
        setHideGrid(initialHide)
        toast.error(
          err instanceof Error ? err.message : "No se pudo cambiar el ajuste",
        )
      }
    })
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" />
          Diseño de la página
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium">
              {blockCount === 0
                ? "Sin bloques personalizados"
                : `${blockCount} ${blockCount === 1 ? "bloque" : "bloques"} sobre el grid`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Agregá hero, descripción, FAQ u otros bloques arriba del listado
              de productos.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={`/admin/categorias/${categoryId}/builder`}>
              Editar diseño
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label htmlFor="hide-grid" className="text-sm font-medium">
              Ocultar grid de productos
            </Label>
            <p className="text-xs text-muted-foreground">
              Útil para landings 100% custom. Solo aplica cuando hay bloques
              autoreados.
            </p>
          </div>
          <Switch
            id="hide-grid"
            checked={hideGrid}
            onCheckedChange={handleToggle}
            disabled={pending}
          />
        </div>
      </CardContent>
    </Card>
  )
}

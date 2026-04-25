"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { saveProductLandingAsTemplate } from "@/actions/landing-templates"

interface SaveAsTemplateDialogProps {
  productId: string
  blockCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SaveAsTemplateDialog({
  productId,
  blockCount,
  open,
  onOpenChange,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = () => {
    if (!name.trim() || pending) return
    startTransition(async () => {
      try {
        const { templateId } = await saveProductLandingAsTemplate(productId, {
          name,
          description: description || undefined,
          category: category || undefined,
        })
        toast.success("Plantilla creada y producto vinculado")
        onOpenChange(false)
        router.push(`/admin/landing-plantillas/${templateId}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al guardar plantilla"
        toast.error(msg)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guardar como plantilla</DialogTitle>
          <DialogDescription className="space-y-2 pt-1">
            <span className="block">
              Al guardar, este producto quedará VINCULADO a la nueva plantilla. Los cambios
              futuros a la plantilla se aplicarán automáticamente a este producto.
            </span>
            <span className="block text-xs text-muted-foreground">
              Bloques a guardar: {blockCount}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="tpl-name" className="text-xs">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Plantilla de Auriculares"
            />
          </div>
          <div>
            <Label htmlFor="tpl-description" className="text-xs">
              Descripción
            </Label>
            <Textarea
              id="tpl-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="tpl-category" className="text-xs">
              Categoría
            </Label>
            <Input
              id="tpl-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Electrónica"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !name.trim()}>
            {pending ? "Guardando..." : "Guardar y vincular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

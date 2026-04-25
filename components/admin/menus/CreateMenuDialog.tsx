"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createMenu } from "@/actions/menus"

interface CreateMenuDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}

export function CreateMenuDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateMenuDialogProps) {
  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (isPending) return
    if (!next) {
      setSlug("")
      setTitle("")
      setDescription("")
    }
    onOpenChange(next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedSlug = slug.trim()
    if (!trimmedTitle || !trimmedSlug) return

    startTransition(async () => {
      try {
        const result = await createMenu({
          slug: trimmedSlug,
          title: trimmedTitle,
          description: description.trim() || undefined,
        })
        toast.success("Menú creado")
        onCreated(result.id)
        setSlug("")
        setTitle("")
        setDescription("")
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "No se pudo crear el menú"
        toast.error(msg)
      }
    })
  }

  const submitDisabled = isPending || !slug.trim() || !title.trim()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo menú</DialogTitle>
            <DialogDescription>
              Crea un menú de navegación para la tienda. El slug es un
              identificador interno (ej: <code>main</code>, <code>footer</code>).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="menu-slug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="menu-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="main"
                autoFocus
                maxLength={120}
                required
              />
              <p className="text-xs text-muted-foreground">
                Identificador interno usado en el código (no aparece en URLs).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="menu-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Menú principal"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-description">Descripción</Label>
              <Textarea
                id="menu-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notas internas sobre dónde se usa este menú"
                rows={2}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {isPending ? "Creando..." : "Crear menú"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

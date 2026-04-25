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
import { createPage } from "@/actions/pages"

interface CreatePageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}

export function CreatePageDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePageDialogProps) {
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
        const result = await createPage({
          slug: trimmedSlug,
          title: trimmedTitle,
          description: description.trim() || undefined,
        })
        toast.success("Página creada")
        onCreated(result.id)
        setSlug("")
        setTitle("")
        setDescription("")
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "No se pudo crear la página"
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
            <DialogTitle>Nueva página</DialogTitle>
            <DialogDescription>
              Crea una página estática editable con bloques.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="page-slug">
                Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="page-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="promociones-2026"
                autoFocus
                maxLength={120}
                required
              />
              <p className="text-xs text-muted-foreground">
                URL: <code>/{slug.trim() || "..."}</code>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="page-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Promociones de fin de año"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page-description">Descripción</Label>
              <Textarea
                id="page-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Resumen breve para SEO"
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
              {isPending ? "Creando..." : "Crear página"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

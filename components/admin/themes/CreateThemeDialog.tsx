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
import { createTheme } from "@/actions/themes"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}

export function CreateThemeDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [pending, startTransition] = useTransition()

  const handleClose = (next: boolean) => {
    if (pending) return
    if (!next) {
      setName("")
      setDescription("")
    }
    onOpenChange(next)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || pending) return
    startTransition(async () => {
      try {
        const { id } = await createTheme({
          name: name.trim(),
          description: description.trim() || undefined,
        })
        onCreated(id)
        setName("")
        setDescription("")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al crear tema")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo tema</DialogTitle>
            <DialogDescription>
              Un tema agrupa el diseño de tu tienda completa. Si es el primero,
              quedará automáticamente activo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-2">
              <Label htmlFor="theme-name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="theme-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tema Minimalista 2026"
                autoFocus
                required
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme-description">Descripción</Label>
              <Textarea
                id="theme-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Diseño limpio para temporada de verano"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Creando…" : "Crear tema"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

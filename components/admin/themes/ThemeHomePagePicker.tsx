"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { updateThemeMetadata } from "@/actions/themes"
import type { PageRow } from "@/actions/pages"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  themeId: string
  currentPageId: string | null
  pages: PageRow[]
  onSaved: () => void
}

const NONE_VALUE = "__none__"

export function ThemeHomePagePicker({
  open,
  onOpenChange,
  themeId,
  currentPageId,
  pages,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<string>(currentPageId ?? NONE_VALUE)
  const [pending, startTransition] = useTransition()

  // Only active pages can be assigned as home — an inactive page would
  // silently break "/" until the admin reactivates it.
  const eligible = pages.filter((p) => p.active)

  const handleSave = () => {
    if (pending) return
    const next = selected === NONE_VALUE ? null : selected
    startTransition(async () => {
      try {
        await updateThemeMetadata(themeId, { homePageId: next })
        toast.success("Página de inicio actualizada")
        onSaved()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setSelected(currentPageId ?? NONE_VALUE)
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Página de inicio</DialogTitle>
          <DialogDescription>
            Esta página se mostrará en la home (<code>/</code>) de la tienda.
            Si no asignás ninguna, se usará el layout por defecto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="theme-home-page">Página</Label>
          <Select value={selected} onValueChange={setSelected} disabled={pending}>
            <SelectTrigger id="theme-home-page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>
                Sin página asignada (usar home por defecto)
              </SelectItem>
              {eligible.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}{" "}
                  <span className="text-muted-foreground">/{p.slug}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {eligible.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No hay páginas activas todavía. Creá una desde{" "}
              <Link href="/admin/paginas" className="underline">
                Páginas
              </Link>
              .
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            La URL pública de la página seleccionada redirigirá a <code>/</code>{" "}
            para mantener una sola URL canónica.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

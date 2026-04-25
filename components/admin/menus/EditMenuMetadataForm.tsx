"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { updateMenuMetadata, type MenuWithItems } from "@/actions/menus"

interface EditMenuMetadataFormProps {
  menu: MenuWithItems
}

export function EditMenuMetadataForm({ menu }: EditMenuMetadataFormProps) {
  const router = useRouter()
  const [slug, setSlug] = useState(menu.slug)
  const [title, setTitle] = useState(menu.title)
  const [description, setDescription] = useState(menu.description ?? "")
  const [active, setActive] = useState(menu.active)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !slug.trim() || pending) return
    startTransition(async () => {
      try {
        await updateMenuMetadata(menu.id, {
          slug: slug.trim(),
          title: title.trim(),
          description: description.trim() || null,
          active,
        })
        toast.success("Menú actualizado")
        router.push("/admin/menus")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="menu-slug">
          Slug <span className="text-destructive">*</span>
        </Label>
        <Input
          id="menu-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          disabled={pending}
          placeholder="main"
          maxLength={120}
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
          required
          disabled={pending}
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="menu-description">Descripción</Label>
        <Textarea
          id="menu-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          disabled={pending}
          placeholder="Notas internas sobre dónde se usa este menú"
        />
      </div>

      <div className="flex items-center gap-3 border-t pt-5">
        <Switch
          id="menu-active"
          checked={active}
          onCheckedChange={setActive}
          disabled={pending}
        />
        <Label htmlFor="menu-active">Menú activo</Label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={pending || !title.trim() || !slug.trim()}
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/menus")}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

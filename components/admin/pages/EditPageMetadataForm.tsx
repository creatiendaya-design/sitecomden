"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { updatePageMetadata, type PageWithBlocks } from "@/actions/pages"

interface EditPageMetadataFormProps {
  page: PageWithBlocks
}

export function EditPageMetadataForm({ page }: EditPageMetadataFormProps) {
  const router = useRouter()
  const [slug, setSlug] = useState(page.slug)
  const [title, setTitle] = useState(page.title)
  const [description, setDescription] = useState(page.description ?? "")
  const [active, setActive] = useState(page.active)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !slug.trim() || pending) return
    startTransition(async () => {
      try {
        await updatePageMetadata(page.id, {
          slug: slug.trim(),
          title: title.trim(),
          description: description.trim() || null,
          active,
        })
        toast.success("Página actualizada")
        router.push("/admin/paginas")
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Error al guardar",
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="page-slug">
          Slug <span className="text-destructive">*</span>
        </Label>
        <Input
          id="page-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          disabled={pending}
          placeholder="promociones-2026"
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground">
          URL: <code>/{slug || "..."}</code>
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
          required
          disabled={pending}
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="page-description">Descripción (SEO)</Label>
        <Textarea
          id="page-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          disabled={pending}
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="page-active"
          checked={active}
          onCheckedChange={setActive}
          disabled={pending}
        />
        <Label htmlFor="page-active">
          Página activa (visible en la tienda)
        </Label>
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
          onClick={() => router.push("/admin/paginas")}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

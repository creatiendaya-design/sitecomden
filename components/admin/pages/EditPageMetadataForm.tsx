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
  const [seoTitle, setSeoTitle] = useState(page.seoTitle ?? "")
  const [seoDescription, setSeoDescription] = useState(page.seoDescription ?? "")
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
          seoTitle: seoTitle.trim() || null,
          seoDescription: seoDescription.trim() || null,
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
        <Label htmlFor="page-description">Descripción</Label>
        <Textarea
          id="page-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          disabled={pending}
          placeholder="Descripción visible / interna de la página"
        />
        <p className="text-xs text-muted-foreground">
          Se usa como descripción visible y como fallback de SEO si no
          completás los campos de SEO.
        </p>
      </div>

      <div className="border-t pt-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">SEO</h2>
          <p className="text-xs text-muted-foreground">
            Opcional. Si quedan vacíos, se usan el título y la descripción
            de arriba.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="page-seo-title">SEO title</Label>
          <Input
            id="page-seo-title"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            disabled={pending}
            maxLength={70}
            placeholder="Promociones | ShopGood Perú"
          />
          <p className="text-xs text-muted-foreground">
            {seoTitle.length}/70 caracteres recomendados.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="page-seo-description">SEO description</Label>
          <Textarea
            id="page-seo-description"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            rows={3}
            disabled={pending}
            maxLength={200}
            placeholder="Una descripción optimizada para resultados de búsqueda"
          />
          <p className="text-xs text-muted-foreground">
            {seoDescription.length}/160 caracteres recomendados (máximo 200).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t pt-5">
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

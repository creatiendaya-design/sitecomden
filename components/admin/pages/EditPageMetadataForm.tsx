"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Upload, X, Info } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { updatePageMetadata, type PageWithBlocks } from "@/actions/pages"

interface EditPageMetadataFormProps {
  page: PageWithBlocks
  isHome?: boolean
}

export function EditPageMetadataForm({ page, isHome = false }: EditPageMetadataFormProps) {
  const router = useRouter()
  const [slug, setSlug] = useState(page.slug)
  const [title, setTitle] = useState(page.title)
  const [description, setDescription] = useState(page.description ?? "")
  const [seoTitle, setSeoTitle] = useState(page.seoTitle ?? "")
  const [seoDescription, setSeoDescription] = useState(page.seoDescription ?? "")
  const [seoImage, setSeoImage] = useState<string | null>(page.seoImage ?? null)
  const [noIndex, setNoIndex] = useState(page.noIndex)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [active, setActive] = useState(page.active)
  const [pending, startTransition] = useTransition()

  async function handleImageUpload(file: File): Promise<void> {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const { url } = (await res.json()) as { url: string }
      setSeoImage(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la imagen")
    } finally {
      setUploadingImage(false)
    }
  }

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
          seoImage: seoImage || null,
          noIndex,
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

      {isHome ? (
        <div className="border-t pt-5">
          <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                SEO de la página de inicio
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Esta página es la <strong>home</strong> del tema activo. Su SEO
                (título, descripción, imagen Open Graph y keywords) se configura
                en{" "}
                <Link
                  href="/admin/configuracion"
                  className="underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-100"
                >
                  Configuración → SEO
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      ) : (
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

        <div className="space-y-2">
          <Label>Imagen para redes (Open Graph)</Label>
          <p className="text-xs text-muted-foreground">
            Aparece cuando alguien comparte el link en WhatsApp, Facebook,
            LinkedIn, etc. Recomendado 1200×630.
          </p>
          {seoImage ? (
            <div className="relative aspect-[1200/630] w-full max-w-md overflow-hidden rounded-md border bg-muted">
              <Image
                src={seoImage}
                alt="Vista previa OG"
                fill
                className="object-cover"
                unoptimized
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6 shadow"
                onClick={() => setSeoImage(null)}
                aria-label="Quitar imagen OG"
                disabled={pending || uploadingImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <label className="flex max-w-md cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-xs text-muted-foreground hover:bg-muted/40">
              <Upload className="h-3.5 w-3.5" />
              {uploadingImage ? "Subiendo..." : "Subir imagen"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={pending || uploadingImage}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImageUpload(f)
                  e.target.value = ""
                }}
              />
            </label>
          )}
        </div>

        <div className="flex items-center gap-3 rounded-md border p-3">
          <Switch
            id="page-noindex"
            checked={noIndex}
            onCheckedChange={setNoIndex}
            disabled={pending}
          />
          <div className="flex-1">
            <Label htmlFor="page-noindex" className="text-sm">
              No indexar en buscadores
            </Label>
            <p className="text-xs text-muted-foreground">
              Activá esto para landing internas o promociones temporales que no
              quieras que aparezcan en Google.
            </p>
          </div>
        </div>
      </div>
      )}

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

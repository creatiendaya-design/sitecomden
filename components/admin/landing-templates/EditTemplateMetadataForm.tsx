"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, X } from "lucide-react"
import { toast } from "sonner"
import { updateLandingTemplateMetadata } from "@/actions/landing-templates"
import type { TemplateWithBlocks } from "@/actions/landing-templates"

interface EditTemplateMetadataFormProps {
  template: TemplateWithBlocks
}

export function EditTemplateMetadataForm({ template }: EditTemplateMetadataFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)

  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description || "")
  const [category, setCategory] = useState(template.category || "")
  const [thumbnail, setThumbnail] = useState(template.thumbnail || "")

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const data = (await res.json()) as { url: string }
      setThumbnail(data.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir imagen")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }

    startTransition(async () => {
      try {
        await updateLandingTemplateMetadata(template.id, {
          name: name.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          thumbnail: thumbnail || null,
        })
        toast.success("Metadata actualizada")
        router.push("/admin/landing-plantillas")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <Label htmlFor="name" className="text-sm font-medium">
          Nombre
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la plantilla"
          disabled={isPending}
          required
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="text-sm font-medium">
          Descripción
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción de la plantilla"
          disabled={isPending}
          rows={4}
        />
      </div>

      {/* Category */}
      <div>
        <Label htmlFor="category" className="text-sm font-medium">
          Categoría
        </Label>
        <Input
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Categoría de la plantilla"
          disabled={isPending}
        />
      </div>

      {/* Thumbnail */}
      <div>
        <Label className="text-sm font-medium">Miniatura</Label>
        {thumbnail ? (
          <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-md border bg-muted">
            <Image src={thumbnail} alt="" fill className="object-cover" unoptimized />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 shadow"
              onClick={() => setThumbnail("")}
              aria-label="Quitar imagen"
              disabled={isPending}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <label className="mt-2 flex items-center justify-center gap-2 p-3 rounded-md border-2 border-dashed text-xs text-muted-foreground cursor-pointer hover:bg-muted/40">
            <Upload className="h-3.5 w-3.5" />
            {isUploading ? "Subiendo..." : "Subir imagen"}
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailUpload}
              disabled={isUploading || isPending}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/landing-plantillas")}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, X } from "lucide-react"
import { toast } from "sonner"
import { updateLandingTemplateMetadataVersioned } from "@/actions/landing-templates"
import type { TemplateWithBlocks } from "@/actions/landing-templates"
import { TEMPLATE_CATEGORIES } from "@/lib/template-categories"
import { useVersionAwareSave } from "@/components/admin/concurrency/use-version-aware-save"
import { ConflictDialog } from "@/components/admin/concurrency/ConflictDialog"

interface EditTemplateMetadataFormProps {
  template: TemplateWithBlocks
}

export function EditTemplateMetadataForm({ template }: EditTemplateMetadataFormProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)

  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description || "")
  const [category, setCategory] = useState(template.category || "")
  const [thumbnail, setThumbnail] = useState(template.thumbnail || "")

  const {
    state: saveState,
    save,
    acceptServerCopy,
    forceOverwrite,
    dismissConflict,
    setVersion,
  } = useVersionAwareSave({
    action: (expectedVersion, input: Parameters<typeof updateLandingTemplateMetadataVersioned>[2]) =>
      updateLandingTemplateMetadataVersioned(template.id, expectedVersion, input),
    initialVersion: template.version,
    onSuccess: () => {
      toast.success("Metadata actualizada")
      router.push("/admin/landing-plantillas")
    },
    onReload: () => router.refresh(),
    onError: (message) => toast.error(message),
  })
  const isPending = saveState.saving

  useEffect(() => {
    setVersion(template.version)
  }, [template.version, setVersion])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }

    await save({
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      thumbnail: thumbnail || null,
    })
  }

  return (
    <>
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
        <Select
          value={category || undefined}
          onValueChange={setCategory}
          disabled={isPending}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden>{c.emoji}</span>
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

    <ConflictDialog
      open={saveState.hasConflict}
      onOpenChange={(next) => {
        if (!next) dismissConflict()
      }}
      onReload={acceptServerCopy}
      onForce={forceOverwrite}
      resourceLabel="esta plantilla"
    />
    </>
  )
}

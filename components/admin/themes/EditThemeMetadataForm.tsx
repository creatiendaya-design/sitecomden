"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
import { updateThemeMetadata, type ThemeRow } from "@/actions/themes"
import type { TemplateRow } from "@/actions/landing-templates"

interface Props {
  theme: ThemeRow
  landingTemplates: TemplateRow[]
}

const NONE_VALUE = "__none__"

export function EditThemeMetadataForm({ theme, landingTemplates }: Props) {
  const router = useRouter()
  const [name, setName] = useState(theme.name)
  const [description, setDescription] = useState(theme.description ?? "")
  const [defaultId, setDefaultId] = useState<string>(
    theme.defaultProductLandingTemplateId ?? NONE_VALUE,
  )
  const [pending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || pending) return
    startTransition(async () => {
      try {
        await updateThemeMetadata(theme.id, {
          name: name.trim(),
          description: description.trim() || null,
          defaultProductLandingTemplateId:
            defaultId === NONE_VALUE ? null : defaultId,
        })
        toast.success("Tema actualizado")
        router.push("/admin/personalizar/temas")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="theme-name">
          Nombre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="theme-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="theme-description">Descripción</Label>
        <Textarea
          id="theme-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="default-product-template">
          Plantilla por defecto para productos
        </Label>
        <Select
          value={defaultId}
          onValueChange={setDefaultId}
          disabled={pending}
        >
          <SelectTrigger id="default-product-template">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Sin plantilla por defecto</SelectItem>
            {landingTemplates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Se aplica a productos que no tengan plantilla propia asignada.
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/personalizar/temas")}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

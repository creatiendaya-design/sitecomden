"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import RichTextEditor from "@/components/admin/RichTextEditor"
import {
  updatePolicy,
  type PolicyFull,
  type PolicyType,
} from "@/actions/policies"

interface Props {
  policy: PolicyFull
}

const POLICY_TYPE_OPTIONS: { value: PolicyType; label: string }[] = [
  { value: "TERMS", label: "Términos y condiciones" },
  { value: "PRIVACY", label: "Privacidad" },
  { value: "SHIPPING", label: "Envíos" },
  { value: "REFUND", label: "Devoluciones" },
  { value: "OTHER", label: "Otra" },
]

const NONE = "__none__"

export function PolicyEditor({ policy }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(policy.title)
  const [slug, setSlug] = useState(policy.slug)
  const [body, setBody] = useState(policy.body)
  const [policyType, setPolicyType] = useState<string>(
    policy.policyType ?? NONE,
  )
  const [active, setActive] = useState(policy.active)
  const [seoTitle, setSeoTitle] = useState(policy.seoTitle ?? "")
  const [seoDescription, setSeoDescription] = useState(
    policy.seoDescription ?? "",
  )
  const [seoImage, setSeoImage] = useState<string | null>(policy.seoImage ?? null)
  const [noIndex, setNoIndex] = useState(policy.noIndex)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [pending, startTransition] = useTransition()

  async function handleImageUpload(file: File): Promise<void> {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const { url } = (await res.json()) as { url: string }
      setSeoImage(url)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al subir la imagen",
      )
    } finally {
      setUploadingImage(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !slug.trim() || pending) return

    startTransition(async () => {
      try {
        await updatePolicy(policy.id, {
          slug: slug.trim(),
          title: title.trim(),
          body,
          policyType: policyType === NONE ? null : (policyType as PolicyType),
          seoTitle: seoTitle.trim() || null,
          seoDescription: seoDescription.trim() || null,
          seoImage: seoImage || null,
          noIndex,
          active,
        })
        toast.success("Política guardada")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/politicas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/politicas/${policy.slug}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver pública
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title + slug + type + active */}
        <section className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={pending}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/politicas/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  disabled={pending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={policyType}
                onValueChange={setPolicyType}
                disabled={pending}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin tipo</SelectItem>
                  {POLICY_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="active" className="text-sm font-medium">
                Visible públicamente
              </Label>
              <p className="text-xs text-muted-foreground">
                Cuando está oculta, la URL devuelve 404.
              </p>
            </div>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
              disabled={pending}
            />
          </div>
        </section>

        {/* Body */}
        <section className="rounded-lg border bg-card p-6 space-y-3">
          <div>
            <Label className="text-base font-semibold">Contenido</Label>
            <p className="text-xs text-muted-foreground">
              Texto legal completo de la política.
            </p>
          </div>
          <RichTextEditor
            content={body}
            onChange={setBody}
            placeholder="Escribí el texto completo de la política…"
          />
        </section>

        {/* SEO */}
        <section className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <Label className="text-base font-semibold">SEO</Label>
            <p className="text-xs text-muted-foreground">
              Sobrescribí el título y descripción que aparecen en los resultados
              de búsqueda y al compartir el enlace.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seoTitle">SEO title</Label>
            <Input
              id="seoTitle"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder={`(por defecto: ${title})`}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seoDescription">SEO description</Label>
            <Textarea
              id="seoDescription"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={3}
              maxLength={300}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label>Imagen Open Graph</Label>
            {seoImage ? (
              <div className="relative inline-block">
                <Image
                  src={seoImage}
                  alt="Open Graph"
                  width={400}
                  height={210}
                  className="rounded-md border object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => setSeoImage(null)}
                  disabled={pending}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
                  aria-label="Quitar imagen"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/50">
                <Upload className="h-4 w-4" />
                {uploadingImage
                  ? "Subiendo…"
                  : "Subir imagen (recomendado 1200×630)"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage || pending}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImageUpload(f)
                    e.target.value = ""
                  }}
                />
              </label>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="noindex" className="text-sm font-medium">
                No indexar
              </Label>
              <p className="text-xs text-muted-foreground">
                Excluir esta página de Google y otros buscadores.
              </p>
            </div>
            <Switch
              id="noindex"
              checked={noIndex}
              onCheckedChange={setNoIndex}
              disabled={pending}
            />
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" asChild disabled={pending}>
            <Link href="/admin/politicas">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}

"use client"

import { useRef, useState } from "react"
import { Star, Loader2, ImagePlus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"

interface WriteReviewButtonProps {
  productId: string
  buttonText: string
}

type SubmitState = "idle" | "submitting" | "done"

const MAX_PHOTOS = 5

/**
 * Storefront "write a review" button + modal form. Posts to
 * /api/reviews/submit (rate-limited). The review is created unapproved, so on
 * success we show a thank-you note instead of optimistically rendering it.
 *
 * Self-contained (no theme tokens beyond Tailwind utilities) so it can live
 * inside the server-rendered PRODUCT_REVIEWS section.
 */
export function WriteReviewButton({
  productId,
  buttonText,
}: WriteReviewButtonProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<SubmitState>("idle")
  const [error, setError] = useState<string | null>(null)

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [title, setTitle] = useState("")
  const [comment, setComment] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setState("idle")
    setError(null)
    setRating(0)
    setHoverRating(0)
    setCustomerName("")
    setCustomerEmail("")
    setTitle("")
    setComment("")
    setImages([])
    setUploading(false)
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)

    const remaining = MAX_PHOTOS - images.length
    if (remaining <= 0) {
      setError(`Máximo ${MAX_PHOTOS} fotos.`)
      return
    }

    const toUpload = Array.from(files).slice(0, remaining)
    setUploading(true)
    try {
      for (const file of toUpload) {
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch("/api/reviews/upload-photo", {
          method: "POST",
          body: fd,
        })
        const json = await res.json()
        if (!res.ok || !json.url) {
          setError(json.error || "No se pudo subir una imagen.")
          continue
        }
        setImages((prev) => [...prev, json.url])
      }
    } catch {
      setError("Error al subir la imagen. Intenta de nuevo.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (rating < 1) {
      setError("Elige una puntuación de 1 a 5 estrellas.")
      return
    }
    if (customerName.trim().length < 2) {
      setError("Ingresa tu nombre.")
      return
    }
    if (!customerEmail.includes("@")) {
      setError("Ingresa un email válido.")
      return
    }

    setState("submitting")
    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
          images: images.length > 0 ? images : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || "No se pudo enviar la reseña.")
        setState("idle")
        return
      }
      setState("done")
    } catch {
      setError("Error de red. Intenta nuevamente.")
      setState("idle")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {buttonText}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escribir una reseña</DialogTitle>
          <DialogDescription>
            Tu opinión ayuda a otros compradores. Se publicará tras una breve
            revisión.
          </DialogDescription>
        </DialogHeader>

        {state === "done" ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Star className="h-6 w-6 fill-emerald-500 text-emerald-500" />
            </div>
            <p className="font-medium">¡Gracias por tu reseña!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              La publicaremos en cuanto la revisemos.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Star picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Puntuación *</label>
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
                      className="p-0.5"
                    >
                      <Star
                        className={cn(
                          "h-7 w-7 transition-colors",
                          active
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/40"
                        )}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="rv-name" className="text-sm font-medium">
                  Nombre *
                </label>
                <input
                  id="rv-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  maxLength={120}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="rv-email" className="text-sm font-medium">
                  Email *
                </label>
                <input
                  id="rv-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  maxLength={255}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Tu email no se publica. Si compraste el producto, tu reseña se
              marcará como “compra verificada”.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="rv-title" className="text-sm font-medium">
                Título (opcional)
              </label>
              <input
                id="rv-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Resume tu experiencia"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rv-comment" className="text-sm font-medium">
                Comentario (opcional)
              </label>
              <textarea
                id="rv-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="¿Qué te pareció el producto?"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Photo uploader */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Fotos (opcional)
              </label>
              <div className="flex flex-wrap gap-2">
                {images.map((url) => (
                  <div key={url} className="relative h-16 w-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Foto de la reseña"
                      className="h-16 w-16 rounded-md object-cover border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      aria-label="Quitar foto"
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {images.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-input text-muted-foreground transition-colors hover:bg-accent disabled:opacity-60"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="h-5 w-5" />
                        <span className="text-[10px]">Subir</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <p className="text-xs text-muted-foreground">
                Hasta {MAX_PHOTOS} fotos · JPG, PNG o WebP · máx 5MB c/u
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={state === "submitting" || uploading}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {state === "submitting" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar reseña"
              )}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

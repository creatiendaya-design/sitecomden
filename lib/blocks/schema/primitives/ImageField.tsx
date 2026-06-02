"use client"

import { ImageControl } from "@/components/admin/page-builder/RightSidebar/controls/ImageControl"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"
import type { ImageFieldDef } from "../types"
import ImageMetaEditButton from "@/components/admin/media/ImageMetaEditButton"

interface Props {
  field: ImageFieldDef
  value: unknown
  onChange: (v: { desktop?: string; mobile?: string } | string | undefined) => void
}

export function ImageField({ field, value, onChange }: Props) {
  const deviceOverride = field.deviceOverride ?? true

  if (deviceOverride) {
    return (
      <ImageControl
        label={field.label ?? ""}
        value={value as { desktop?: string; mobile?: string } | undefined}
        onChange={onChange}
      />
    )
  }

  return <SingleImage field={field} value={value as string | undefined} onChange={(v) => onChange(v)} />
}

function SingleImage({
  field,
  value,
  onChange,
}: {
  field: ImageFieldDef
  value?: string
  onChange: (v: string | undefined) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const data = (await res.json()) as { url: string }
      onChange(data.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir imagen")
    } finally {
      setLoading(false)
      e.target.value = ""
    }
  }

  return (
    <div>
      {field.label && <Label className="text-xs mb-1 block">{field.label}</Label>}
      {value ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
          <Image src={value} alt="" fill className="object-cover" unoptimized />
          <div className="absolute top-1 right-1 flex gap-1">
            <ImageMetaEditButton url={value} onRenamed={(u) => onChange(u)} />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-6 w-6 shadow"
              onClick={() => onChange(undefined)}
              aria-label="Quitar imagen"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 p-3 rounded-md border-2 border-dashed text-xs text-muted-foreground cursor-pointer hover:bg-muted/40">
          <Upload className="h-3.5 w-3.5" />
          {loading ? "Subiendo..." : "Subir imagen"}
          <input type="file" accept="image/*" onChange={handleFile} disabled={loading} className="hidden" />
        </label>
      )}
    </div>
  )
}

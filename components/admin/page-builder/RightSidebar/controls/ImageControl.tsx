"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Monitor, Smartphone, Upload, X } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"

interface DeviceImage {
  desktop?: string
  mobile?: string
}

interface ImageControlProps {
  label: string
  value: DeviceImage | undefined
  onChange: (next: DeviceImage | undefined) => void
}

/**
 * Image control with ALWAYS-on Desktop/Mobile tabs. Unlike opt-in device
 * overrides on style fields, images are the place where per-device choice
 * is a default expectation — landscape hero on desktop, vertical crop on
 * mobile.
 *
 * Uploads go through the same /api/upload endpoint used elsewhere in the
 * admin (Vercel Blob). On success we store the returned URL in either the
 * desktop or mobile slot.
 */
export function ImageControl({ label, value, onChange }: ImageControlProps) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
        {label}
      </Label>
      <div className="space-y-2">
        <DeviceRow icon="desktop">
          <ImageSlot
            url={value?.desktop}
            onUpload={(url) => onChange({ ...value, desktop: url })}
            onRemove={() => {
              const next = { ...value, desktop: undefined }
              const isEmpty = !next.desktop && !next.mobile
              onChange(isEmpty ? undefined : next)
            }}
          />
        </DeviceRow>
        <DeviceRow icon="mobile">
          <ImageSlot
            url={value?.mobile}
            onUpload={(url) => onChange({ ...value, mobile: url })}
            onRemove={() => {
              const next = { ...value, mobile: undefined }
              const isEmpty = !next.desktop && !next.mobile
              onChange(isEmpty ? undefined : next)
            }}
          />
        </DeviceRow>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        Si dejas mobile vacío, se usa la imagen desktop también en mobile.
      </p>
    </div>
  )
}

function DeviceRow({ icon, children }: { icon: "desktop" | "mobile"; children: React.ReactNode }) {
  const Icon = icon === "desktop" ? Monitor : Smartphone
  const label = icon === "desktop" ? "Desktop" : "Mobile"
  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center gap-1 pt-2 text-muted-foreground shrink-0">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] font-medium w-10">{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function ImageSlot({
  url,
  onUpload,
  onRemove,
}: {
  url?: string
  onUpload: (url: string) => void
  onRemove: () => void
}) {
  const [loading, setLoading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const data = (await res.json()) as { url: string }
      if (!data.url) throw new Error("No URL returned from upload")
      onUpload(data.url)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al subir la imagen"
      toast.error(message)
    } finally {
      setLoading(false)
      e.target.value = ""
    }
  }

  if (url) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
        <Image src={url} alt="" fill className="object-cover" unoptimized />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 shadow"
          onClick={onRemove}
          aria-label="Quitar imagen"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <label className="flex items-center justify-center gap-2 p-3 rounded-md border-2 border-dashed text-xs text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors">
      <Upload className="h-3.5 w-3.5" />
      {loading ? "Subiendo..." : "Subir imagen"}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={loading}
        className="hidden"
      />
    </label>
  )
}

"use client"

import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageControl } from "../../RightSidebar/controls/ImageControl"
import type { BlockContentV2 } from "@/lib/blocks/types"

const RichTextEditor = dynamic(
  () => import("@/components/admin/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-24 animate-pulse bg-muted rounded" /> }
)

interface Data {
  title?: string
  description: string
  imagePosition: "left" | "right"
  imageAlt: string
  ctaText?: string
  ctaUrl?: string
  ratioImageToText?: "40-60" | "50-50" | "60-40"
}

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

export function ImageTextContentForm({ content, onChange }: Props) {
  const data = content.data as unknown as Data
  const patch = (delta: Partial<Data>) =>
    onChange({ ...content, data: { ...data, ...delta } as unknown as Record<string, unknown> })

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Título</Label>
        <Input
          value={data.title ?? ""}
          onChange={(e) => patch({ title: e.target.value })}
          className="mt-1 text-sm"
        />
      </div>

      <div>
        <Label className="text-xs">Descripción</Label>
        <div className="mt-1">
          <RichTextEditor content={data.description ?? ""} onChange={(html: string) => patch({ description: html })} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Posición de la imagen (en desktop)</Label>
        <Select value={data.imagePosition ?? "left"} onValueChange={(v) => patch({ imagePosition: v as "left" | "right" })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Izquierda</SelectItem>
            <SelectItem value="right">Derecha</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground mt-1">En mobile siempre aparece arriba del texto.</p>
      </div>

      <div>
        <Label className="text-xs">Proporción imagen/texto</Label>
        <Select value={data.ratioImageToText ?? "50-50"} onValueChange={(v) => patch({ ratioImageToText: v as Data["ratioImageToText"] })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="40-60">40 / 60</SelectItem>
            <SelectItem value="50-50">50 / 50</SelectItem>
            <SelectItem value="60-40">60 / 40</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Texto alternativo de la imagen (accesibilidad)</Label>
        <Input
          value={data.imageAlt ?? ""}
          onChange={(e) => patch({ imageAlt: e.target.value })}
          placeholder="Descripción breve para lectores de pantalla"
          className="mt-1 text-sm"
        />
      </div>

      <ImageControl
        label="Imagen"
        value={content.media?.image}
        onChange={(v) => onChange({ ...content, media: { ...content.media, image: v } })}
      />

      <div>
        <Label className="text-xs">Texto del botón CTA (opcional)</Label>
        <Input
          value={data.ctaText ?? ""}
          onChange={(e) => patch({ ctaText: e.target.value })}
          className="mt-1 text-sm"
        />
      </div>

      <div>
        <Label className="text-xs">URL del CTA (opcional — si vacío, usa el CTA principal)</Label>
        <Input
          value={data.ctaUrl ?? ""}
          onChange={(e) => patch({ ctaUrl: e.target.value })}
          placeholder="https://…"
          className="mt-1 text-sm"
        />
      </div>
    </div>
  )
}

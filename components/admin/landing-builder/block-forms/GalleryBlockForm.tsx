"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import type { GalleryBlockContent } from "@/lib/types/landing-blocks";
import ImageMetaEditButton from "@/components/admin/media/ImageMetaEditButton";

interface GalleryBlockFormProps {
  content: GalleryBlockContent;
  onChange: (content: GalleryBlockContent) => void;
}

export default function GalleryBlockForm({ content, onChange }: GalleryBlockFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.url as string;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const urls = await Promise.all(Array.from(files).map(uploadImage));
    onChange({ ...content, images: [...content.images, ...urls] });
  };

  const removeImage = (index: number) =>
    onChange({ ...content, images: content.images.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center flex-wrap">
        <Label>Tipo de display</Label>
        <div className="flex gap-2">
          {(["slider", "stacked"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ ...content, displayType: type })}
              className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
                content.displayType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background"
              }`}
            >
              {type === "slider" ? "Slider" : "Apilado"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={content.showBuyButton}
          onCheckedChange={(v) => onChange({ ...content, showBuyButton: v })}
        />
        <Label>Mostrar botón de compra</Label>
      </div>

      {content.showBuyButton && (
        <div>
          <Label className="mb-1 block">Texto del botón</Label>
          <Input
            value={content.buyButtonText ?? ""}
            onChange={(e) => onChange({ ...content, buyButtonText: e.target.value })}
            placeholder="Comprar ahora"
          />
        </div>
      )}

      <div>
        <Label className="mb-2 block">Imágenes</Label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {content.images.map((url, i) => (
            <div key={i} className="relative aspect-square rounded border overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageMetaEditButton
                  url={url}
                  onRenamed={(u) =>
                    onChange({
                      ...content,
                      images: content.images.map((x, idx) => (idx === i ? u : x)),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 shadow"
                  onClick={() => removeImage(i)}
                  aria-label="Quitar imagen"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3 w-3 mr-1" /> Subir imágenes
        </Button>
      </div>
    </div>
  );
}

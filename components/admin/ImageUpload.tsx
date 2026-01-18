"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Loader2, Edit2 } from "lucide-react";
import Image from "next/image";
import ImageMetadataEditor from "./ImageMetadataEditor";

interface ImageMetadata {
  url: string;
  alt?: string;
  name?: string;
}

interface ImageUploadProps {
  images: ImageMetadata[] | string[];
  onChange: (images: ImageMetadata[]) => void;
  maxImages?: number;
}

export default function ImageUpload({
  images,
  onChange,
  maxImages = 5,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Normalizar imágenes al formato de objetos
  const normalizedImages: ImageMetadata[] = images.map((img) =>
    typeof img === "string" ? { url: img } : img
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Error al subir imagen");

        const data = await response.json();
        
        // Crear objeto con metadata inicial
        return {
          url: data.url,
          alt: "",
          name: file.name.replace(/\.[^/.]+$/, ""), // Nombre sin extensión
        };
      });

      const newImages = await Promise.all(uploadPromises);
      onChange([...normalizedImages, ...newImages].slice(0, maxImages));
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Error al subir imágenes");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    onChange(normalizedImages.filter((_, i) => i !== index));
  };

  const updateImageMetadata = (index: number, metadata: ImageMetadata) => {
    const newImages = [...normalizedImages];
    newImages[index] = metadata;
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      {normalizedImages.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {normalizedImages.map((image, index) => (
            <div
              key={index}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-slate-100"
            >
              <Image
                src={image.url}
                alt={image.alt || `Imagen ${index + 1}`}
                fill
                className="object-cover"
              />
              
              {/* Botones de acción */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={() => setEditingIndex(index)}
                  className="h-8 w-8"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={() => removeImage(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Badges */}
              {index === 0 && (
                <div className="absolute bottom-2 left-2 rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
                  Principal
                </div>
              )}
              {image.alt && (
                <div className="absolute top-2 left-2 rounded bg-green-500 px-2 py-1 text-xs text-white">
                  SEO ✓
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {normalizedImages.length < maxImages && (
        <div>
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <label htmlFor="image-upload">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              className="w-full"
              onClick={() => document.getElementById("image-upload")?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir Imágenes ({normalizedImages.length}/{maxImages})
                </>
              )}
            </Button>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            La primera imagen será la principal. Haz clic en <Edit2 className="inline h-3 w-3" /> para editar SEO de cada imagen.
          </p>
        </div>
      )}

      {/* Modal de edición */}
      {editingIndex !== null && (
        <ImageMetadataEditor
          image={normalizedImages[editingIndex]}
          onSave={(metadata) => updateImageMetadata(editingIndex, metadata)}
          onClose={() => setEditingIndex(null)}
          open={editingIndex !== null}
        />
      )}
    </div>
  );
}
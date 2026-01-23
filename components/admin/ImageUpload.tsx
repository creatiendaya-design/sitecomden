"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Loader2, Edit2, AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import ImageMetadataEditor from "./ImageMetadataEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface ImageMetadata {
  url: string;
  alt?: string;
  name?: string;
}

interface ImageUploadProps {
  images: ImageMetadata[] | string[];
  onChange: (images: ImageMetadata[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

export default function ImageUploadWithProgress({
  images,
  onChange,
  maxImages = 5,
  maxSizeMB = 10,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const normalizedImages: ImageMetadata[] = images.map((img) =>
    typeof img === "string" ? { url: img } : img
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress([]);

    try {
      // Validaciones previas
      const totalImages = normalizedImages.length + files.length;
      if (totalImages > maxImages) {
        setError(
          `Solo puedes subir ${maxImages} imágenes. Actualmente tienes ${normalizedImages.length}.`
        );
        setUploading(false);
        e.target.value = "";
        return;
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const oversizedFiles = files.filter((file) => file.size > maxSizeBytes);

      if (oversizedFiles.length > 0) {
        const fileList = oversizedFiles
          .map((f) => `"${f.name}" (${(f.size / 1024 / 1024).toFixed(2)}MB)`)
          .join(", ");

        setError(
          `${oversizedFiles.length === 1 ? "El archivo" : "Los archivos"} ${fileList} ${
            oversizedFiles.length === 1 ? "excede" : "exceden"
          } el límite de ${maxSizeMB}MB.`
        );
        setUploading(false);
        e.target.value = "";
        return;
      }

      // Inicializar progreso para cada archivo
      const initialProgress: UploadProgress[] = files.map((file) => ({
        fileName: file.name,
        progress: 0,
        status: "uploading",
      }));
      setUploadProgress(initialProgress);

      // Subir archivos uno por uno (para mostrar progreso individual)
      const newImages: ImageMetadata[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          // Simular progreso (XMLHttpRequest para progreso real requiere más complejidad)
          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, progress: 30 } : p
            )
          );

          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, progress: 80 } : p
            )
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error al subir ${file.name}`);
          }

          const data = await response.json();

          newImages.push({
            url: data.url,
            alt: "",
            name: file.name.replace(/\.[^/.]+$/, ""),
          });

          // Marcar como completado
          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, progress: 100, status: "success" } : p
            )
          );
        } catch (err) {
          // Marcar como error
          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i
                ? {
                    ...p,
                    progress: 0,
                    status: "error",
                    error: err instanceof Error ? err.message : "Error desconocido",
                  }
                : p
            )
          );

          throw err;
        }
      }

      onChange([...normalizedImages, ...newImages].slice(0, maxImages));
      e.target.value = "";

      // Limpiar progreso después de 2 segundos
      setTimeout(() => {
        setUploadProgress([]);
      }, 2000);
    } catch (error) {
      console.error("Error uploading images:", error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Error al subir imágenes. Por favor, intenta de nuevo.");
      }
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    onChange(normalizedImages.filter((_, i) => i !== index));
    setError(null);
  };

  const updateImageMetadata = (index: number, metadata: ImageMetadata) => {
    const newImages = [...normalizedImages];
    newImages[index] = metadata;
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-slate-50 p-4">
          {uploadProgress.map((progress, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[200px]">
                  {progress.fileName}
                </span>
                <div className="flex items-center gap-2">
                  {progress.status === "uploading" && (
                    <span className="text-muted-foreground">
                      {progress.progress}%
                    </span>
                  )}
                  {progress.status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {progress.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              <Progress value={progress.progress} className="h-2" />
              {progress.error && (
                <p className="text-xs text-red-500">{progress.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

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
              onClick={() => {
                setError(null);
                document.getElementById("image-upload")?.click();
              }}
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
            La primera imagen será la principal. Haz clic en{" "}
            <Edit2 className="inline h-3 w-3" /> para editar SEO.
            <br />
            <strong>Máximo: {maxSizeMB}MB por imagen.</strong> Formatos: JPG,
            PNG, WebP, GIF, SVG.
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
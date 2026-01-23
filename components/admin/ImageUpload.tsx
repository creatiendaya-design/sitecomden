"use client";

import { useState, useRef, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, Loader2, Edit2, AlertCircle, CheckCircle2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import ImageMetadataEditor from "./ImageMetadataEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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

export default function ImageUpload({
  images,
  onChange,
  maxImages = 5,
  maxSizeMB = 10,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizedImages: ImageMetadata[] = images.map((img) =>
    typeof img === "string" ? { url: img } : img
  );

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress([]);

    try {
      // Validaciones previas
      const totalImages = normalizedImages.length + fileArray.length;
      if (totalImages > maxImages) {
        setError(
          `Solo puedes subir ${maxImages} imágenes. Actualmente tienes ${normalizedImages.length}.`
        );
        setUploading(false);
        return;
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const oversizedFiles = fileArray.filter((file) => file.size > maxSizeBytes);

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
        return;
      }

      // Inicializar progreso para cada archivo
      const initialProgress: UploadProgress[] = fileArray.map((file) => ({
        fileName: file.name,
        progress: 0,
        status: "uploading",
      }));
      setUploadProgress(initialProgress);

      // Subir archivos uno por uno
      const newImages: ImageMetadata[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];

        try {
          setUploadProgress((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, progress: 30 } : p))
          );

          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          setUploadProgress((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, progress: 80 } : p))
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

          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, progress: 100, status: "success" } : p
            )
          );
        } catch (err) {
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await handleFiles(files);
      e.target.value = "";
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFiles(files);
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

  const openFileDialog = () => {
    fileInputRef.current?.click();
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
                <span className="truncate max-w-[200px]">{progress.fileName}</span>
                <div className="flex items-center gap-2">
                  {progress.status === "uploading" && (
                    <span className="text-muted-foreground">{progress.progress}%</span>
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
              {progress.error && <p className="text-xs text-red-500">{progress.error}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Drag & Drop Zone */}
      {normalizedImages.length < maxImages && (
        <div
          className={cn(
            "relative rounded-lg border-2 border-dashed transition-all duration-200",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-slate-300 bg-slate-50 hover:bg-slate-100",
            uploading && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="image-upload"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />

          <div
            className="flex flex-col items-center justify-center py-12 px-6 cursor-pointer"
            onClick={openFileDialog}
          >
            {uploading ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-sm font-medium text-slate-700">Subiendo imágenes...</p>
                <p className="text-xs text-slate-500 mt-1">Por favor espera</p>
              </>
            ) : isDragging ? (
              <>
                <Upload className="h-12 w-12 text-primary mb-4" />
                <p className="text-sm font-medium text-slate-700">
                  Suelta las imágenes aquí
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Se subirán automáticamente
                </p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <ImageIcon className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">
                  Arrastra y suelta tus imágenes aquí
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  o haz click para seleccionar archivos
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>PNG, JPG, WebP, GIF, SVG</span>
                  <span>•</span>
                  <span>Máx. {maxSizeMB}MB por imagen</span>
                  <span>•</span>
                  <span>
                    {normalizedImages.length}/{maxImages} imágenes
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Image Grid */}
      {normalizedImages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700">
              Imágenes ({normalizedImages.length}/{maxImages})
            </p>
            {normalizedImages.length < maxImages && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openFileDialog}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Agregar más
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {normalizedImages.map((image, index) => (
              <div
                key={index}
                className="group relative aspect-square overflow-hidden rounded-lg border-2 bg-slate-100 transition-all hover:border-primary"
              >
                <Image
                  src={image.url}
                  alt={image.alt || `Imagen ${index + 1}`}
                  fill
                  className="object-cover"
                />

                {/* Overlay con botones */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={() => setEditingIndex(index)}
                    className="h-9 w-9 shadow-lg"
                    title="Editar metadatos SEO"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => removeImage(index)}
                    className="h-9 w-9 shadow-lg"
                    title="Eliminar imagen"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Badge Principal */}
                {index === 0 && (
                  <div className="absolute bottom-2 left-2 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-lg">
                    Principal
                  </div>
                )}

                {/* Badge SEO */}
                {image.alt && (
                  <div className="absolute top-2 left-2 rounded-md bg-green-500 px-2 py-1 text-xs font-medium text-white shadow-lg">
                    SEO ✓
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            💡 <strong>Tip:</strong> La primera imagen será la principal. Haz click en{" "}
            <Edit2 className="inline h-3 w-3" /> para agregar texto alternativo (SEO).
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
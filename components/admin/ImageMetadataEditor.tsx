"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Save } from "lucide-react";
import Image from "next/image";

interface ImageMetadata {
  url: string;
  alt?: string;
  name?: string;
}

interface ImageMetadataEditorProps {
  image: ImageMetadata;
  onSave: (metadata: ImageMetadata) => void;
  onClose: () => void;
  open: boolean;
}

export default function ImageMetadataEditor({
  image,
  onSave,
  onClose,
  open,
}: ImageMetadataEditorProps) {
  const [metadata, setMetadata] = useState<ImageMetadata>({
    url: image.url,
    alt: image.alt || "",
    name: image.name || "",
  });

  const handleSave = () => {
    onSave(metadata);
    onClose();
  };

  // Extraer nombre del archivo de la URL
  const getFileNameFromUrl = (url: string) => {
    try {
      const urlParts = url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      return fileName.split("?")[0]; // Remover query params
    } catch {
      return "imagen";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Información de Imagen (SEO)</DialogTitle>
          <DialogDescription>
            Agrega texto alternativo y nombre descriptivo para mejorar el SEO
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vista previa de imagen */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-slate-100">
            <Image
              src={image.url}
              alt={metadata.alt || "Imagen del producto"}
              fill
              className="object-contain"
            />
          </div>

          {/* URL de la imagen (solo lectura) */}
          <div>
            <Label>URL de la imagen</Label>
            <Input
              value={getFileNameFromUrl(image.url)}
              disabled
              className="bg-slate-50"
            />
          </div>

          {/* Nombre de la imagen */}
          <div>
            <Label htmlFor="name">Nombre de la imagen</Label>
            <Input
              id="name"
              value={metadata.name}
              onChange={(e) =>
                setMetadata({ ...metadata, name: e.target.value })
              }
              placeholder="Ej: zapatillas-nike-air-max-rojas"
              maxLength={100}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Usado para organización interna. {metadata.name?.length || 0}/100
              caracteres.
            </p>
          </div>

          {/* Texto alternativo (ALT) */}
          <div>
            <Label htmlFor="alt">
              Texto Alternativo (ALT) *{" "}
              <span className="font-normal text-muted-foreground">
                - Importante para SEO
              </span>
            </Label>
            <Input
              id="alt"
              value={metadata.alt}
              onChange={(e) =>
                setMetadata({ ...metadata, alt: e.target.value })
              }
              placeholder="Ej: Zapatillas Nike Air Max rojas para running"
              maxLength={125}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Describe lo que muestra la imagen. Los motores de búsqueda usan
              esto para entender tu imagen. {metadata.alt?.length || 0}/125
              caracteres.
            </p>
          </div>

          {/* Consejos de SEO */}
          <div className="rounded-lg border bg-blue-50 p-3 text-sm">
            <p className="font-medium text-blue-900">💡 Consejos para el ALT:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-blue-800">
              <li>Sé descriptivo pero conciso</li>
              <li>Incluye palabras clave relevantes</li>
              <li>No uses "imagen de" o "foto de"</li>
              <li>Describe qué se ve en la imagen</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
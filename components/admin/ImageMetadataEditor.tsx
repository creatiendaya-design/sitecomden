"use client";

import { useEffect, useState } from "react";
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
import { Loader2, Save } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { getMediaMetaByUrl, updateMediaMetaByUrl } from "@/actions/media";

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
  const [name, setName] = useState(image.name || "");
  const [alt, setAlt] = useState(image.alt || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Whether this URL is registered in the media library (MediaFile). External
  // / stock URLs aren't, so we fall back to purely-local editing for them.
  const [tracked, setTracked] = useState(true);

  // Load the library's current name/alt on open — the MediaFile is the source
  // of truth, so the product/page JSON (which often only stores the URL) can't
  // be trusted to show what was last saved.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getMediaMetaByUrl(image.url)
      .then((meta) => {
        if (cancelled) return;
        if (!meta) {
          setTracked(false);
          setName(image.name || "");
          setAlt(image.alt || "");
          return;
        }
        setTracked(true);
        setName(meta.displayName ?? "");
        setAlt(meta.alt ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setTracked(false);
        setName(image.name || "");
        setAlt(image.alt || "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // image.url identifies the file; name/alt are only fallback seeds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, image.url]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedAlt = alt.trim();

    // External / untracked URL: keep the legacy purely-local behavior so the
    // caller can still store alt/name in its own JSON if it wants.
    if (!tracked) {
      onSave({ url: image.url, name: trimmedName, alt: trimmedAlt });
      onClose();
      return;
    }

    setSaving(true);
    try {
      const result = await updateMediaMetaByUrl({
        url: image.url,
        displayName: trimmedName,
        alt: trimmedAlt,
      });
      if (!result.success) {
        toast.error(result.error ?? "No se pudo guardar");
        return;
      }
      // When the name changed the blob is renamed and its URL changes; re-point
      // the caller to the new URL (the old blob no longer exists).
      const finalUrl =
        result.url && result.url !== image.url ? result.url : image.url;
      toast.success("Datos de la imagen actualizados");
      onSave({ url: finalUrl, name: trimmedName, alt: trimmedAlt });
      onClose();
    } finally {
      setSaving(false);
    }
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
              alt={alt || "Imagen del producto"}
              fill
              className="object-contain"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !tracked ? (
            <>
              <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-800">
                Esta imagen no está registrada en tu biblioteca de archivos (puede
                ser una URL externa), así que los cambios solo se guardarán en este
                producto, no en Contenido → Archivos.
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

              <div>
                <Label htmlFor="name">Nombre de la imagen</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: zapatillas-nike-air-max-rojas"
                  maxLength={120}
                />
              </div>

              <div>
                <Label htmlFor="alt">
                  Texto Alternativo (ALT){" "}
                  <span className="font-normal text-muted-foreground">
                    - Importante para SEO
                  </span>
                </Label>
                <Input
                  id="alt"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="Ej: Zapatillas Nike Air Max rojas para running"
                  maxLength={125}
                />
              </div>
            </>
          ) : (
            <>
              {/* Nombre de la imagen */}
              <div>
                <Label htmlFor="name">Nombre del archivo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: zapatillas-nike-air-max-rojas"
                  maxLength={120}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Cambia la URL del archivo (mejor para SEO) y se sincroniza con
                  Contenido → Archivos. Las referencias se actualizan
                  automáticamente. {name.length}/120 caracteres.
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
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="Ej: Zapatillas Nike Air Max rojas para running"
                  maxLength={125}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Describe lo que muestra la imagen. Los motores de búsqueda usan
                  esto para entender tu imagen. {alt.length}/125 caracteres.
                </p>
              </div>

              {/* Consejos de SEO */}
              <div className="rounded-lg border bg-blue-50 p-3 text-sm">
                <p className="font-medium text-blue-900">
                  💡 Consejos para el ALT:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-blue-800">
                  <li>Sé descriptivo pero conciso</li>
                  <li>Incluye palabras clave relevantes</li>
                  <li>No uses &quot;imagen de&quot; o &quot;foto de&quot;</li>
                  <li>Describe qué se ve en la imagen</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

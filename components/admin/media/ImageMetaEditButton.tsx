"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMediaMetaByUrl, updateMediaMetaByUrl } from "@/actions/media";

interface ImageMetaEditButtonProps {
  url: string;
  /** Optional override for the trigger button classes (positioning). */
  className?: string;
  /**
   * Called when the file was renamed and its URL changed. Consumers MUST update
   * the stored value to the new URL (the old blob no longer exists).
   */
  onRenamed?: (newUrl: string) => void;
}

/**
 * Shopify-style "edit image" affordance for the page-builder image picker.
 * Opens a dialog to edit the file's display name + alt text, persisted to the
 * media library (MediaFile) by URL. The blob URL never changes, so all
 * references stay valid.
 */
export default function ImageMetaEditButton({ url, className, onRenamed }: ImageMetaEditButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tracked, setTracked] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [alt, setAlt] = useState("");
  const [isImage, setIsImage] = useState(true);

  const openDialog = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const meta = await getMediaMetaByUrl(url);
      if (!meta) {
        setTracked(false);
        return;
      }
      setTracked(true);
      setDisplayName(meta.displayName ?? "");
      setAlt(meta.alt ?? "");
      setIsImage(meta.isImage);
    } catch {
      setTracked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateMediaMetaByUrl({ url, displayName, alt });
      if (!result.success) {
        toast.error(result.error ?? "No se pudo guardar");
        return;
      }
      // If the file was renamed its URL changed — tell the consumer to re-point.
      if (result.url && result.url !== url) {
        onRenamed?.(result.url);
      }
      toast.success("Datos del archivo actualizados");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className={className ?? "h-6 w-6 shadow"}
        onClick={openDialog}
        aria-label="Editar nombre y alt"
        title="Editar nombre y texto alternativo"
      >
        <Pencil className="h-3 w-3" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar imagen</DialogTitle>
            <DialogDescription>
              Edita el nombre del archivo y el texto alternativo (ALT) para SEO.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-slate-50 dark:bg-slate-900">
              {/* Plain <img> — avoids next/image domain constraints for arbitrary URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={alt || "Vista previa"} className="h-full w-full object-contain" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : !tracked ? (
              <p className="rounded-md border bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Esta imagen no está registrada en tu biblioteca de archivos (puede ser
                una URL externa), así que su nombre y ALT no se pueden editar aquí.
              </p>
            ) : (
              <>
                <div>
                  <Label htmlFor="img-meta-name">Nombre del archivo</Label>
                  <Input
                    id="img-meta-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej: banner-principal-verano"
                    maxLength={120}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cambia la URL del archivo (mejor para SEO). Las referencias se
                    actualizan automáticamente. {displayName.length}/120
                  </p>
                </div>

                {isImage && (
                  <div>
                    <Label htmlFor="img-meta-alt">
                      Texto alternativo (ALT){" "}
                      <span className="font-normal text-muted-foreground">— SEO</span>
                    </Label>
                    <Input
                      id="img-meta-alt"
                      value={alt}
                      onChange={(e) => setAlt(e.target.value)}
                      placeholder="Ej: Mujer corriendo con zapatillas rojas"
                      maxLength={125}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Describe la imagen para buscadores y lectores de pantalla. {alt.length}/125
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || loading || !tracked}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

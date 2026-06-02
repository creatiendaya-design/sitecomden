"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2, Loader2, Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { updateMediaMetadata, deleteMediaFile } from "@/actions/media";
import { refreshVideoStatus } from "@/actions/media-video";
import { formatBytes, formatMediaDate } from "@/lib/media/format";
import MediaThumbnail from "./MediaThumbnail";
import type { MediaItem } from "./types";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface MediaDetailDialogProps {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function MediaDetailDialog({
  item,
  open,
  onOpenChange,
  canEdit,
  canDelete,
}: MediaDetailDialogProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [alt, setAlt] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Reset the form whenever a different file is opened.
  useEffect(() => {
    if (item) {
      setDisplayName(item.displayName ?? "");
      setAlt(item.alt ?? "");
      setCopied(false);
    }
  }, [item]);

  if (!item) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateMediaMetadata({
        id: item.id,
        displayName,
        alt,
        expectedVersion: item.version,
      });
      if (!result.success) {
        toast.error(result.error ?? "No se pudo guardar");
        return;
      }
      toast.success("Cambios guardados");
      router.refresh();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteMediaFile(item.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo eliminar");
        return;
      }
      toast.success("Archivo eliminado");
      setConfirmOpen(false);
      onOpenChange(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      const result = await refreshVideoStatus(item.id);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo actualizar el estado");
        return;
      }
      toast.success("Estado actualizado");
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar la URL");
    }
  };

  const dimensions =
    item.width && item.height ? `${item.width} × ${item.height} px` : null;

  const isCloudflareVideo = item.provider === "cloudflare_stream";
  const isBlobVideo = !item.isImage && !isCloudflareVideo && item.mimeType.startsWith("video/");
  const videoReady = item.status === "ready";

  const renderPreview = () => {
    if (isCloudflareVideo) {
      if (videoReady) {
        return (
          <iframe
            src={item.url}
            title={item.displayName || item.filename}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
            className="h-full w-full border-0"
          />
        );
      }
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
          {item.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl}
              alt={item.filename}
              className="max-h-32 rounded object-contain opacity-70"
            />
          )}
          <p className="text-sm text-muted-foreground">
            {item.status === "error"
              ? "Hubo un error al procesar el video."
              : "Cloudflare está procesando el video. Esto puede tardar unos minutos."}
          </p>
          <Button variant="outline" size="sm" onClick={handleRefreshStatus} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar estado
          </Button>
        </div>
      );
    }

    if (isBlobVideo) {
      return (
        <video src={item.url} controls className="h-full w-full object-contain">
          Tu navegador no soporta video.
        </video>
      );
    }

    return <MediaThumbnail item={item} optimized={false} className="object-contain" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">
            {item.displayName || item.filename}
          </DialogTitle>
          <DialogDescription>
            {item.isImage
              ? "Edita el nombre y el texto alternativo (ALT) para SEO."
              : "Edita el nombre del archivo."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Preview */}
          <div className="space-y-3">
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-slate-50 dark:bg-slate-900">
              {renderPreview()}
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir en pestaña nueva
            </a>
          </div>

          {/* Form + metadata */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="media-name">Nombre del archivo</Label>
              <Input
                id="media-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={item.filename}
                maxLength={120}
                disabled={!canEdit}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Cambiar el nombre renombra la URL del archivo (mejor para SEO) y
                actualiza automáticamente todas las referencias.
              </p>
            </div>

            {item.isImage && (
              <div>
                <Label htmlFor="media-alt">
                  Texto alternativo (ALT){" "}
                  <span className="font-normal text-muted-foreground">— SEO</span>
                </Label>
                <Input
                  id="media-alt"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="Ej: Zapatillas rojas para running"
                  maxLength={125}
                  disabled={!canEdit}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Describe la imagen. {alt.length}/125
                </p>
              </div>
            )}

            <div>
              <Label>URL</Label>
              <div className="flex gap-2">
                <Input value={item.url} readOnly className="bg-slate-50 text-xs dark:bg-slate-900" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="font-medium">{item.mimeType}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tamaño</dt>
                <dd className="font-medium">{formatBytes(item.size)}</dd>
              </div>
              {dimensions && (
                <div>
                  <dt className="text-muted-foreground">Dimensiones</dt>
                  <dd className="font-medium">{dimensions}</dd>
                </div>
              )}
              {item.durationSeconds ? (
                <div>
                  <dt className="text-muted-foreground">Duración</dt>
                  <dd className="font-medium">{formatDuration(item.durationSeconds)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">Subido</dt>
                <dd className="font-medium">{formatMediaDate(item.uploadedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          {canDelete ? (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {canEdit && (
              <Button onClick={handleSave} disabled={saving}>
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
            )}
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{item.displayName || item.filename}</strong> del
              almacenamiento de forma permanente. Si está en uso en algún producto,
              página o bloque, esa imagen dejará de cargar. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

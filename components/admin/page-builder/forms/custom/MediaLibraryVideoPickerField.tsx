"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Film, Search, X, Loader2, Play, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  listLibraryVideos,
  createVideoUpload,
  registerVideoUpload,
  registerBlobVideo,
  type LibraryVideo,
} from "@/actions/media-video";
import type { LibraryVideoSelection } from "@/lib/types/landing-blocks";

interface CustomFieldProps {
  value: unknown;
  onChange: (v: unknown) => void;
  label?: string;
  helpText?: string;
}

function asSelection(value: unknown): LibraryVideoSelection | undefined {
  if (value && typeof value === "object" && "url" in value && "kind" in value) {
    return value as LibraryVideoSelection;
  }
  return undefined;
}

/**
 * Page-builder custom field: pick a video from the media library
 * (Cloudflare Stream or uploaded blob). Stores a LibraryVideoSelection object;
 * when set it overrides the manual URL field on the same video item.
 */
export function MediaLibraryVideoPickerField({
  value,
  onChange,
  label,
  helpText,
}: CustomFieldProps) {
  const selection = asSelection(value);

  return (
    <div className="space-y-2">
      {label && <Label className="text-xs">{label}</Label>}

      {selection ? (
        <div className="flex items-center gap-2 rounded-md border bg-card p-1.5">
          <div className="relative flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
            {selection.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selection.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Film className="h-4 w-4 text-muted-foreground" />
            )}
            <Play className="absolute h-4 w-4 fill-white/90 text-white drop-shadow" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{selection.title || "Video"}</p>
            <p className="text-[10px] text-muted-foreground">
              {selection.kind === "cloudflare" ? "Cloudflare Stream" : "Subido"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="p-1 text-muted-foreground hover:text-destructive"
            aria-label="Quitar video"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <VideoPickerDialog
        onPick={(v) => {
          const next: LibraryVideoSelection = {
            mediaFileId: v.id,
            kind: v.kind,
            url: v.url,
            streamUid: v.streamUid ?? undefined,
            thumbnailUrl: v.thumbnailUrl ?? undefined,
            title: v.title,
          };
          onChange(next);
        }}
        hasSelection={Boolean(selection)}
      />

      {helpText && <p className="text-[11px] text-muted-foreground">{helpText}</p>}
    </div>
  );
}

function VideoPickerDialog({
  onPick,
  hasSelection,
}: {
  onPick: (v: LibraryVideo) => void;
  hasSelection: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(() => {
      listLibraryVideos(query)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .catch(() => {
          if (!cancelled) toast.error("Error al cargar videos");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [open, query, reloadKey]);

  // Upload a new video without leaving the picker (Shopify-style). Routes to
  // Cloudflare Stream when configured, otherwise falls back to Vercel Blob.
  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const created = await createVideoUpload({ filename: file.name });

      if (created.success && created.uploadURL && created.uid) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(created.uploadURL, { method: "POST", body: fd });
        if (!res.ok) throw new Error("Cloudflare rechazó la subida del video");
        const reg = await registerVideoUpload({
          uid: created.uid,
          filename: file.name,
          size: file.size,
        });
        if (!reg.success) throw new Error(reg.error || "No se pudo registrar el video");
      } else if (created.error?.includes("no está configurado")) {
        // Fallback: Vercel Blob client-direct upload.
        const blob = await upload(`videos/${Date.now()}-${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        const reg = await registerBlobVideo({
          url: blob.url,
          filename: file.name,
          size: file.size,
        });
        if (!reg.success) throw new Error(reg.error || "No se pudo registrar el video");
      } else {
        throw new Error(created.error || "No se pudo iniciar la subida");
      }

      toast.success("Video subido. Puede tardar unos minutos en procesarse.");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir el video");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full">
          <Film className="mr-1 h-3 w-3" />
          {hasSelection ? "Cambiar video" : "Elegir de la biblioteca"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Elegir video de la biblioteca</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar video…"
              className="pl-8"
              autoFocus
            />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Subiendo…
              </>
            ) : (
              <>
                <Upload className="mr-1 h-3 w-3" />
                Subir video
              </>
            )}
          </Button>
        </div>

        <div className="max-h-[420px] overflow-auto">
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">
              No hay videos en la biblioteca. Súbelos desde Contenido → Archivos.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {results.map((v) => {
                const disabled = !v.ready;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onPick(v);
                      setOpen(false);
                    }}
                    className="group overflow-hidden rounded-lg border text-left transition-shadow enabled:hover:shadow-md disabled:opacity-60"
                    title={v.title}
                  >
                    <div className="relative flex aspect-video items-center justify-center bg-slate-100 dark:bg-slate-800">
                      {v.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Film className="h-6 w-6 text-muted-foreground" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                        {disabled ? (
                          <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">
                            Procesando
                          </span>
                        ) : (
                          <Play className="h-6 w-6 fill-white/90 text-white drop-shadow" />
                        )}
                      </div>
                    </div>
                    <p className="truncate p-1.5 text-[11px] font-medium">{v.title}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

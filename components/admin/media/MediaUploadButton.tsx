"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createVideoUpload, registerVideoUpload } from "@/actions/media-video";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov"];

interface MediaUploadButtonProps {
  /** Where videos go: Cloudflare Stream (when configured) or Vercel Blob fallback. */
  videoProvider: "cloudflare" | "vercel";
}

/**
 * Uploads one or more files into the media library.
 * - Images → /api/upload (server-side, Vercel Blob).
 * - Videos → Cloudflare Stream (direct creator upload) when configured,
 *   otherwise the Vercel Blob client-direct flow as a fallback.
 */
export default function MediaUploadButton({ videoProvider }: MediaUploadButtonProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadVideoToCloudflare = async (file: File) => {
    const created = await createVideoUpload({ filename: file.name });
    if (!created.success || !created.uploadURL || !created.uid) {
      throw new Error(created.error || "No se pudo iniciar la subida del video");
    }

    // The one-time URL accepts a basic multipart POST with a `file` field.
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(created.uploadURL, { method: "POST", body: formData });
    if (!res.ok) {
      throw new Error("Cloudflare rechazó la subida del video");
    }

    const registered = await registerVideoUpload({
      uid: created.uid,
      filename: file.name,
      size: file.size,
    });
    if (!registered.success) {
      throw new Error(registered.error || "No se pudo registrar el video");
    }
  };

  const uploadVideoToBlob = async (file: File) => {
    await upload(`videos/${Date.now()}-${file.name}`, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
    });
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setUploading(true);

    let ok = 0;

    for (const file of files) {
      try {
        const ext = (file.name.split(".").pop() ?? "").toLowerCase();
        const isVideo = VIDEO_EXTENSIONS.includes(ext) || file.type.startsWith("video/");

        if (isVideo) {
          if (videoProvider === "cloudflare") {
            await uploadVideoToCloudflare(file);
          } else {
            await uploadVideoToBlob(file);
          }
        } else if (IMAGE_TYPES.includes(file.type)) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Error al subir");
          }
        } else {
          throw new Error("Tipo de archivo no permitido");
        }
        ok++;
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : "Error al subir"}`);
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    if (ok > 0) {
      toast.success(`${ok} archivo${ok > 1 ? "s" : ""} subido${ok > 1 ? "s" : ""}`);
      router.refresh();
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Subir archivos
          </>
        )}
      </Button>
    </>
  );
}

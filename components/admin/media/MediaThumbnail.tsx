"use client";

import Image from "next/image";
import { FileVideo, FileText, File as FileIcon, Play, Loader2 } from "lucide-react";
import { extensionFromPath } from "@/lib/media/blob-meta";
import type { MediaItem } from "./types";

interface MediaThumbnailProps {
  item: MediaItem;
  /** Use the Next.js optimizer (grid). Detail view passes false for full res. */
  optimized?: boolean;
  className?: string;
}

/**
 * Renders a preview for a media item. Raster images go through next/image;
 * SVG/ICO use a plain <img> (the optimizer blocks SVG without
 * dangerouslyAllowSVG), and non-images show a typed icon.
 */
export default function MediaThumbnail({ item, optimized = true, className }: MediaThumbnailProps) {
  const ext = extensionFromPath(item.filename || item.url);
  const isRaster =
    item.isImage && item.mimeType !== "image/svg+xml" && ext !== "svg";
  const isSvg = item.isImage && (item.mimeType === "image/svg+xml" || ext === "svg");
  const alt = item.alt || item.displayName || item.filename;

  // Video with a poster (Cloudflare Stream) → show the thumbnail + play overlay.
  if (!item.isImage && item.thumbnailUrl) {
    const processing = item.status === "processing";
    return (
      <div className="relative h-full w-full">
        {/* Cloudflare thumbnails aren't in the next/image allowlist — use <img>. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnailUrl}
          alt={alt}
          className={className ?? "h-full w-full object-cover"}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          {processing ? (
            <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white">
              <Loader2 className="h-3 w-3 animate-spin" />
              Procesando
            </span>
          ) : (
            <Play className="h-8 w-8 fill-white/90 text-white drop-shadow" />
          )}
        </div>
      </div>
    );
  }

  if (isRaster) {
    return (
      <Image
        src={item.url}
        alt={alt}
        fill
        sizes="(max-width: 768px) 33vw, 200px"
        unoptimized={!optimized}
        className={className ?? "object-cover"}
      />
    );
  }

  if (isSvg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt={alt} className={className ?? "h-full w-full object-contain p-4"} />;
  }

  // Non-image file (video, pdf, other) → typed icon + extension label.
  const Icon = item.mimeType.startsWith("video/")
    ? FileVideo
    : ext === "pdf"
    ? FileText
    : FileIcon;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <Icon className="h-10 w-10" />
      {ext && <span className="text-xs font-medium uppercase">{ext}</span>}
    </div>
  );
}

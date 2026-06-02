/**
 * Helpers for deriving MediaFile metadata from a blob url / pathname.
 *
 * Shared by the upload route (records new uploads) and the backfill script
 * (imports pre-existing blobs via @vercel/blob `list()`), so both produce
 * consistent rows.
 */

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "avif", "ico"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  ico: "image/x-icon",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  pdf: "application/pdf",
};

/** Extract the lowercase extension (no dot) from a pathname or url. */
export function extensionFromPath(path: string): string {
  const clean = path.split("?")[0].split("#")[0];
  const base = clean.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

/** Derive the blob pathname from a full Vercel Blob url. */
export function pathnameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    return decodeURIComponent(pathname.replace(/^\/+/, ""));
  } catch {
    return url;
  }
}

/** Best-effort original filename from a pathname (basename, query stripped). */
export function filenameFromPath(path: string): string {
  const clean = path.split("?")[0].split("#")[0];
  return clean.split("/").pop() || "archivo";
}

export function isImageExtension(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext);
}

export function isVideoExtension(ext: string): boolean {
  return VIDEO_EXTENSIONS.has(ext);
}

/** Map an extension to a best-guess mime type. Falls back to octet-stream. */
export function mimeFromExtension(ext: string): string {
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

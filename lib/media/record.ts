/**
 * Records an uploaded blob into the MediaFile library.
 *
 * Best-effort: a failure here must NEVER break the upload itself — the blob is
 * already stored in Vercel Blob and the caller has the URL. We just log and
 * move on, leaving the row to be picked up later by the backfill script.
 */
import { prisma } from "@/lib/db";
import {
  filenameFromPath,
  isImageExtension,
  pathnameFromUrl,
  extensionFromPath,
} from "./blob-meta";

export interface RecordMediaInput {
  url: string;
  /** Original filename as uploaded (preferred over the blob pathname). */
  filename?: string | null;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  uploadedById?: string | null;
}

export async function recordMediaFile(input: RecordMediaInput): Promise<void> {
  try {
    const pathname = pathnameFromUrl(input.url);
    const ext = extensionFromPath(input.filename || pathname);
    const isImage = input.mimeType.startsWith("image/") || isImageExtension(ext);

    await prisma.mediaFile.upsert({
      where: { url: input.url },
      // Re-uploads of the same URL are rare (urls are unique-per-upload), but
      // keep it idempotent and refresh metadata when it happens.
      update: {
        mimeType: input.mimeType,
        size: input.size,
        width: input.width ?? undefined,
        height: input.height ?? undefined,
        deletedAt: null,
      },
      create: {
        url: input.url,
        pathname,
        filename: input.filename || filenameFromPath(pathname),
        mimeType: input.mimeType,
        size: input.size,
        width: input.width ?? null,
        height: input.height ?? null,
        isImage,
        uploadedById: input.uploadedById ?? null,
      },
    });
  } catch (error) {
    console.error("[media] Failed to record uploaded blob", {
      url: input.url,
      error,
    });
  }
}

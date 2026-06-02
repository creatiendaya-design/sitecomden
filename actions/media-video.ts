"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";
import { getCurrentUserOrNull } from "@/lib/auth";
import {
  createDirectUpload,
  getCloudflareStreamConfig,
  getVideoStatus,
  mapStreamState,
  streamIframeUrl,
  streamThumbnailUrl,
} from "@/lib/media/cloudflare-stream";
import { recordMediaFile } from "@/lib/media/record";
import { extensionFromPath, mimeFromExtension } from "@/lib/media/blob-meta";

const LIBRARY_PATH = "/admin/contenido/archivos";

export interface CreateVideoUploadResult {
  success: boolean;
  error?: string;
  uploadURL?: string;
  uid?: string;
}

export interface VideoActionResult {
  success: boolean;
  error?: string;
}

/**
 * Step 1 of the Cloudflare Stream upload: asks Cloudflare for a one-time
 * direct-upload URL. The browser then POSTs the file straight to that URL,
 * so the video bytes never pass through our server.
 */
export async function createVideoUpload(input: {
  filename: string;
}): Promise<CreateVideoUploadResult> {
  await protectRoute("media:view");

  const cfg = getCloudflareStreamConfig();
  if (!cfg) {
    return { success: false, error: "Cloudflare Stream no está configurado." };
  }

  const filename = z.string().trim().min(1).max(255).safeParse(input.filename);
  if (!filename.success) {
    return { success: false, error: "Nombre de archivo inválido." };
  }

  try {
    const { uid, uploadURL } = await createDirectUpload(cfg, { name: filename.data });
    return { success: true, uid, uploadURL };
  } catch (error) {
    console.error("[media-video] createDirectUpload failed", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo iniciar la subida.",
    };
  }
}

const registerSchema = z.object({
  uid: z.string().trim().min(1).max(128),
  filename: z.string().trim().min(1).max(255),
  size: z.number().int().nonnegative().default(0),
});

/**
 * Step 2: after the browser finishes uploading to Cloudflare, persist the
 * MediaFile row. Status starts as "processing" — Cloudflare transcodes async.
 */
export async function registerVideoUpload(input: {
  uid: string;
  filename: string;
  size: number;
}): Promise<VideoActionResult> {
  await protectRoute("media:view");

  const cfg = getCloudflareStreamConfig();
  if (!cfg) {
    return { success: false, error: "Cloudflare Stream no está configurado." };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos." };
  }
  const { uid, filename, size } = parsed.data;

  const actor = await getCurrentUserOrNull();

  try {
    await prisma.mediaFile.upsert({
      where: { url: streamIframeUrl(uid, cfg) },
      update: {},
      create: {
        url: streamIframeUrl(uid, cfg),
        pathname: `cloudflare-stream/${uid}`,
        filename,
        mimeType: "video/mp4",
        size,
        isImage: false,
        provider: "cloudflare_stream",
        providerId: uid,
        thumbnailUrl: streamThumbnailUrl(uid, cfg),
        status: "processing",
        uploadedById: actor?.id ?? null,
      },
    });
  } catch (error) {
    console.error("[media-video] registerVideoUpload failed", error);
    return { success: false, error: "No se pudo registrar el video." };
  }

  revalidatePath(LIBRARY_PATH);
  return { success: true };
}

/**
 * Polls Cloudflare for the current encoding state of a video and updates the
 * row (status, duration). Called from the detail dialog's "refresh" button —
 * we don't auto-poll the whole grid to avoid hammering the API.
 */
export async function refreshVideoStatus(id: string): Promise<VideoActionResult> {
  await protectRoute("media:view");

  const cfg = getCloudflareStreamConfig();
  if (!cfg) {
    return { success: false, error: "Cloudflare Stream no está configurado." };
  }

  const file = await prisma.mediaFile.findUnique({ where: { id } });
  if (!file || !file.providerId || file.provider !== "cloudflare_stream") {
    return { success: false, error: "Video no encontrado." };
  }

  try {
    const status = await getVideoStatus(cfg, file.providerId);
    await prisma.mediaFile.update({
      where: { id },
      data: {
        status: mapStreamState(status.state),
        durationSeconds: status.durationSeconds ?? file.durationSeconds,
        // Cloudflare's own thumbnail URL once ready; fall back to the computed one.
        thumbnailUrl:
          status.thumbnailUrl ?? streamThumbnailUrl(file.providerId, cfg),
      },
    });
  } catch (error) {
    console.error("[media-video] refreshVideoStatus failed", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo actualizar el estado.",
    };
  }

  revalidatePath(LIBRARY_PATH);
  return { success: true };
}

const blobVideoSchema = z.object({
  url: z.string().url().max(2048),
  filename: z.string().trim().min(1).max(255),
  size: z.number().int().nonnegative().default(0),
});

/**
 * Registers a video uploaded to Vercel Blob (the fallback when Cloudflare
 * Stream isn't configured). Cloudflare videos use registerVideoUpload instead.
 */
export async function registerBlobVideo(input: {
  url: string;
  filename: string;
  size: number;
}): Promise<VideoActionResult> {
  await protectRoute("media:view");

  const parsed = blobVideoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos." };
  }
  const { url, filename, size } = parsed.data;

  const actor = await getCurrentUserOrNull();
  const ext = extensionFromPath(filename);

  await recordMediaFile({
    url,
    filename,
    mimeType: mimeFromExtension(ext),
    size,
    uploadedById: actor?.id ?? null,
  });

  revalidatePath(LIBRARY_PATH);
  return { success: true };
}

export interface LibraryVideo {
  id: string;
  title: string;
  kind: "cloudflare" | "blob";
  url: string;
  streamUid: string | null;
  thumbnailUrl: string | null;
  status: string | null;
  /** Ready to embed/play (Cloudflare videos are "ready"; blobs always true). */
  ready: boolean;
}

/**
 * Lists video files from the media library for the page-builder picker.
 * Returns Cloudflare Stream videos + any uploaded video blobs. Non-video files
 * (pdf, etc.) are excluded.
 */
export async function listLibraryVideos(query?: string): Promise<LibraryVideo[]> {
  await protectRoute("media:view");

  const term = query?.trim();
  const files = await prisma.mediaFile.findMany({
    where: {
      deletedAt: null,
      isImage: false,
      ...(term
        ? {
            OR: [
              { filename: { contains: term, mode: "insensitive" } },
              { displayName: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { uploadedAt: "desc" },
    take: 60,
  });

  return files
    .filter((f) => f.provider === "cloudflare_stream" || f.mimeType.startsWith("video/"))
    .map((f) => {
      const kind: "cloudflare" | "blob" =
        f.provider === "cloudflare_stream" ? "cloudflare" : "blob";
      return {
        id: f.id,
        title: f.displayName || f.filename,
        kind,
        url: f.url,
        streamUid: f.providerId,
        thumbnailUrl: f.thumbnailUrl,
        status: f.status,
        ready: kind === "cloudflare" ? f.status === "ready" : true,
      };
    });
}

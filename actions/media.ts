"use server";

import { z } from "zod";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";
import { getCurrentUserOrNull, getCurrentUserIdOrNull } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit-log";
import {
  deleteStreamVideo,
  getCloudflareStreamConfig,
} from "@/lib/media/cloudflare-stream";
import { renameBlobAndRepoint, isVercelBlobUrl } from "@/lib/media/rename";

const LIBRARY_PATH = "/admin/contenido/archivos";

export interface MediaActionResult {
  success: boolean;
  error?: string;
  /** Fresh server version on a successful save (optimistic-locking). */
  version?: number;
  /** New URL when the file was renamed (the blob moved). */
  url?: string;
}

/**
 * Decides whether a name change should trigger a real file rename:
 * only for Vercel-Blob-stored files when the display name actually changed to
 * a non-empty value. Cloudflare Stream videos and external URLs are skipped.
 */
function shouldRename(
  current: { url: string; provider: string; displayName: string | null },
  nextDisplayName: string | null
): boolean {
  if (!nextDisplayName) return false;
  if (current.provider !== "vercel_blob") return false;
  if (!isVercelBlobUrl(current.url)) return false;
  return nextDisplayName !== (current.displayName ?? "");
}

const updateSchema = z.object({
  id: z.string().min(1),
  displayName: z
    .string()
    .trim()
    .max(120, "El nombre no debe superar 120 caracteres")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  alt: z
    .string()
    .trim()
    .max(125, "El texto alternativo no debe superar 125 caracteres")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  expectedVersion: z.number().int().nonnegative(),
});

export type UpdateMediaInput = {
  id: string;
  displayName?: string;
  alt?: string;
  expectedVersion: number;
};

/**
 * Updates the display name + alt text of a media file. When the name changes,
 * the underlying Vercel Blob is renamed to an SEO-friendly URL and every
 * reference in the DB is re-pointed (Shopify-style). Optimistically locked on
 * `version`.
 */
export async function updateMediaMetadata(
  input: UpdateMediaInput
): Promise<MediaActionResult> {
  await protectRoute("media:update");

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { id, displayName, alt, expectedVersion } = parsed.data;

  const existing = await prisma.mediaFile.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return { success: false, error: "El archivo no existe o fue eliminado" };
  }
  if (existing.version !== expectedVersion) {
    return {
      success: false,
      error: "El archivo fue modificado por otra persona. Recarga la página e inténtalo de nuevo.",
    };
  }

  // Real rename when the name changed (moves the blob + repoints references).
  let urlPatch: { url: string; pathname: string; filename: string } | null = null;
  if (shouldRename(existing, displayName)) {
    try {
      const renamed = await renameBlobAndRepoint(existing.url, displayName!);
      urlPatch = { url: renamed.newUrl, pathname: renamed.newPathname, filename: renamed.newFilename };
    } catch (error) {
      console.error("[media] rename failed", error);
      return { success: false, error: "No se pudo renombrar el archivo. Inténtalo de nuevo." };
    }
  }

  await prisma.mediaFile.update({
    where: { id },
    data: {
      displayName,
      alt,
      version: { increment: 1 },
      ...(urlPatch ?? {}),
    },
  });

  revalidatePath(LIBRARY_PATH);
  return {
    success: true,
    version: expectedVersion + 1,
    url: urlPatch?.url,
  };
}

/**
 * Permanently deletes a media file: removes the blob from Vercel Blob storage
 * AND soft-deletes the library row.
 *
 * WARNING: this is a real deletion. If the file is still referenced by a
 * product, page, or block, that image will break. We don't track references,
 * so the UI must warn before calling this (mirrors Shopify's behavior).
 */
export async function deleteMediaFile(id: string): Promise<MediaActionResult> {
  await protectRoute("media:delete");

  const file = await prisma.mediaFile.findUnique({ where: { id } });
  if (!file) {
    return { success: false, error: "El archivo no existe" };
  }

  // Remove from the underlying storage first. If this fails we abort so the
  // row still points at a real file (avoids a "ghost" that looks deleted).
  try {
    if (file.provider === "cloudflare_stream" && file.providerId) {
      const cfg = getCloudflareStreamConfig();
      if (!cfg) {
        return {
          success: false,
          error: "Cloudflare Stream no está configurado; no se puede eliminar el video.",
        };
      }
      await deleteStreamVideo(cfg, file.providerId);
    } else {
      await del(file.url);
    }
  } catch (error) {
    console.error("[media] Failed to delete underlying file", {
      url: file.url,
      provider: file.provider,
      error,
    });
    return {
      success: false,
      error: "No se pudo eliminar el archivo del almacenamiento. Inténtalo de nuevo.",
    };
  }

  await prisma.mediaFile.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  const actor = await getCurrentUserOrNull();
  await logAudit({
    userId: actor?.id ?? null,
    userEmail: actor?.email ?? null,
    action: "media.delete",
    entityType: "MediaFile",
    entityId: id,
    before: { url: file.url, filename: file.filename },
  });

  revalidatePath(LIBRARY_PATH);
  return { success: true };
}

export interface MediaMetaByUrl {
  id: string;
  filename: string;
  displayName: string | null;
  alt: string | null;
  isImage: boolean;
}

/**
 * Looks up a library file's editable metadata by its URL. Used by the
 * page-builder image picker to load the current name/alt for editing.
 * Returns null when the file isn't tracked (e.g. an external/stock URL) or the
 * user lacks media:view — callers treat null as "not editable here".
 *
 * Uses a soft permission check (not protectRoute) so a missing permission
 * doesn't redirect the whole editor away.
 */
export async function getMediaMetaByUrl(url: string): Promise<MediaMetaByUrl | null> {
  const userId = await getCurrentUserIdOrNull();
  if (!userId || !(await hasPermission(userId, "media:view"))) return null;

  const f = await prisma.mediaFile.findUnique({ where: { url } });
  if (!f || f.deletedAt) return null;

  return {
    id: f.id,
    filename: f.filename,
    displayName: f.displayName,
    alt: f.alt,
    isImage: f.isImage,
  };
}

/**
 * Updates a library file's display name + alt text by URL (Shopify-style edit
 * from the image picker). When the name changes, the blob is renamed to an
 * SEO-friendly URL and all references are re-pointed; the new URL is returned
 * so the caller can update the block it was editing from.
 */
export async function updateMediaMetaByUrl(input: {
  url: string;
  displayName?: string;
  alt?: string;
}): Promise<MediaActionResult> {
  const userId = await getCurrentUserIdOrNull();
  if (!userId || !(await hasPermission(userId, "media:update"))) {
    return { success: false, error: "No tienes permiso para editar archivos." };
  }

  const displayName = input.displayName?.trim() || null;
  const alt = input.alt?.trim() || null;
  if (displayName && displayName.length > 120) {
    return { success: false, error: "El nombre no debe superar 120 caracteres." };
  }
  if (alt && alt.length > 125) {
    return { success: false, error: "El texto alternativo no debe superar 125 caracteres." };
  }

  const f = await prisma.mediaFile.findUnique({ where: { url: input.url } });
  if (!f || f.deletedAt) {
    return { success: false, error: "Esta imagen no está en tu biblioteca de archivos." };
  }

  let urlPatch: { url: string; pathname: string; filename: string } | null = null;
  if (shouldRename(f, displayName)) {
    try {
      const renamed = await renameBlobAndRepoint(f.url, displayName!);
      urlPatch = { url: renamed.newUrl, pathname: renamed.newPathname, filename: renamed.newFilename };
    } catch (error) {
      console.error("[media] rename failed", error);
      return { success: false, error: "No se pudo renombrar el archivo. Inténtalo de nuevo." };
    }
  }

  await prisma.mediaFile.update({
    where: { id: f.id },
    data: { displayName, alt, version: { increment: 1 }, ...(urlPatch ?? {}) },
  });

  revalidatePath(LIBRARY_PATH);
  return { success: true, url: urlPatch?.url };
}

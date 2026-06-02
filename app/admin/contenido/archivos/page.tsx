export const dynamic = "force-dynamic";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";
import { hasPermission } from "@/lib/permissions";
import { isCloudflareStreamConfigured } from "@/lib/media/cloudflare-stream";
import MediaLibrary from "@/components/admin/media/MediaLibrary";
import type { MediaItem, MediaTypeFilter } from "@/components/admin/media/types";

const PAGE_SIZE = 48;

interface ArchivosPageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    page?: string;
  }>;
}

function parseType(value: string | undefined): MediaTypeFilter {
  if (value === "image" || value === "file") return value;
  return "all";
}

export default async function ArchivosPage({ searchParams }: ArchivosPageProps) {
  const userId = await protectRoute("media:view");
  const [canEdit, canDelete] = await Promise.all([
    hasPermission(userId, "media:update"),
    hasPermission(userId, "media:delete"),
  ]);

  const { search, type: typeParam, page: pageParam } = await searchParams;
  const type = parseType(typeParam);
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.MediaFileWhereInput = { deletedAt: null };

  if (type === "image") where.isImage = true;
  if (type === "file") where.isImage = false;

  const term = search?.trim();
  if (term) {
    where.OR = [
      { filename: { contains: term, mode: "insensitive" } },
      { displayName: { contains: term, mode: "insensitive" } },
      { alt: { contains: term, mode: "insensitive" } },
    ];
  }

  const [totalCount, files] = await Promise.all([
    prisma.mediaFile.count({ where }),
    prisma.mediaFile.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const items: MediaItem[] = files.map((f) => ({
    id: f.id,
    url: f.url,
    filename: f.filename,
    displayName: f.displayName,
    alt: f.alt,
    mimeType: f.mimeType,
    size: f.size,
    width: f.width,
    height: f.height,
    isImage: f.isImage,
    provider: f.provider,
    providerId: f.providerId,
    thumbnailUrl: f.thumbnailUrl,
    status: f.status,
    durationSeconds: f.durationSeconds,
    uploadedAt: f.uploadedAt.toISOString(),
    version: f.version,
  }));

  return (
    <MediaLibrary
      items={items}
      totalCount={totalCount}
      page={page}
      totalPages={totalPages}
      search={term ?? ""}
      type={type}
      canEdit={canEdit}
      canDelete={canDelete}
      videoProvider={isCloudflareStreamConfigured() ? "cloudflare" : "vercel"}
    />
  );
}

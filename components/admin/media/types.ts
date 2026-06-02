/** Serialized MediaFile shape passed from the server page to client components. */
export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  displayName: string | null;
  alt: string | null;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  isImage: boolean;
  provider: string; // "vercel_blob" | "cloudflare_stream"
  providerId: string | null;
  thumbnailUrl: string | null;
  status: string | null; // "processing" | "ready" | "error" | null
  durationSeconds: number | null;
  uploadedAt: string; // ISO string
  version: number;
}

export type MediaTypeFilter = "all" | "image" | "file";

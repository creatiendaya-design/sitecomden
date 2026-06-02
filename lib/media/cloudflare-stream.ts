/**
 * Cloudflare Stream integration (server-only).
 *
 * Stream is a dedicated video platform: it transcodes uploads and serves them
 * via adaptive HLS, so we use it for videos instead of Vercel Blob (which is
 * plain storage). Images stay on Vercel Blob.
 *
 * The whole feature is gated on env vars being present. Until the store owner
 * adds credentials, `isCloudflareStreamConfigured()` returns false and the app
 * falls back to uploading videos to Vercel Blob — nothing breaks.
 *
 * Required env:
 *   CLOUDFLARE_ACCOUNT_ID            — Cloudflare account id
 *   CLOUDFLARE_STREAM_API_TOKEN      — API token with "Stream: Edit" permission
 * Optional env:
 *   CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN — e.g. "customer-abc123.cloudflarestream.com"
 *                                          (defaults to the public videodelivery.net domain)
 */

const API_BASE = "https://api.cloudflare.com/client/v4";

/** Max accepted video length (Cloudflare requires this for direct uploads). */
const MAX_DURATION_SECONDS = 3600; // 1 hour

export interface CloudflareStreamConfig {
  accountId: string;
  apiToken: string;
  customerSubdomain: string | null;
}

export function getCloudflareStreamConfig(): CloudflareStreamConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return {
    accountId,
    apiToken,
    customerSubdomain: process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN ?? null,
  };
}

export function isCloudflareStreamConfigured(): boolean {
  return getCloudflareStreamConfig() !== null;
}

/** Iframe embed URL for a video uid. */
export function streamIframeUrl(uid: string, cfg: CloudflareStreamConfig): string {
  return cfg.customerSubdomain
    ? `https://${cfg.customerSubdomain}/${uid}/iframe`
    : `https://iframe.videodelivery.net/${uid}`;
}

/** HLS manifest URL for a video uid. */
export function streamHlsUrl(uid: string, cfg: CloudflareStreamConfig): string {
  const host = cfg.customerSubdomain ?? "videodelivery.net";
  return `https://${host}/${uid}/manifest/video.m3u8`;
}

/** Thumbnail/poster URL for a video uid. */
export function streamThumbnailUrl(uid: string, cfg: CloudflareStreamConfig): string {
  const host = cfg.customerSubdomain ?? "videodelivery.net";
  return `https://${host}/${uid}/thumbnails/thumbnail.jpg`;
}

interface DirectUploadResult {
  uid: string;
  uploadURL: string;
}

/**
 * Requests a one-time direct-creator-upload URL. The browser uploads the file
 * straight to `uploadURL` (the bytes never touch our server), and we already
 * know the final `uid` so we can persist the MediaFile row.
 */
export async function createDirectUpload(
  cfg: CloudflareStreamConfig,
  opts: { name?: string }
): Promise<DirectUploadResult> {
  const res = await fetch(
    `${API_BASE}/accounts/${cfg.accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: MAX_DURATION_SECONDS,
        requireSignedURLs: false,
        ...(opts.name ? { meta: { name: opts.name } } : {}),
      }),
    }
  );

  const json = (await res.json()) as {
    success: boolean;
    result?: { uid: string; uploadURL: string };
    errors?: { message: string }[];
  };

  if (!res.ok || !json.success || !json.result) {
    const message = json.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Cloudflare Stream: ${message}`);
  }

  return { uid: json.result.uid, uploadURL: json.result.uploadURL };
}

export interface StreamVideoStatus {
  uid: string;
  state: string; // "downloading" | "queued" | "inprogress" | "ready" | "error"
  durationSeconds: number | null;
  thumbnailUrl: string | null;
}

/** Fetches the current processing state of a video (for status refresh). */
export async function getVideoStatus(
  cfg: CloudflareStreamConfig,
  uid: string
): Promise<StreamVideoStatus> {
  const res = await fetch(`${API_BASE}/accounts/${cfg.accountId}/stream/${uid}`, {
    headers: { Authorization: `Bearer ${cfg.apiToken}` },
  });

  const json = (await res.json()) as {
    success: boolean;
    result?: {
      uid: string;
      status?: { state?: string };
      duration?: number;
      thumbnail?: string;
    };
    errors?: { message: string }[];
  };

  if (!res.ok || !json.success || !json.result) {
    const message = json.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Cloudflare Stream: ${message}`);
  }

  const duration = json.result.duration;
  return {
    uid: json.result.uid,
    state: json.result.status?.state ?? "inprogress",
    durationSeconds: typeof duration === "number" && duration > 0 ? Math.round(duration) : null,
    thumbnailUrl: json.result.thumbnail ?? null,
  };
}

/** Deletes a video from Cloudflare Stream. */
export async function deleteStreamVideo(
  cfg: CloudflareStreamConfig,
  uid: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/accounts/${cfg.accountId}/stream/${uid}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${cfg.apiToken}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Cloudflare Stream: no se pudo eliminar (HTTP ${res.status})`);
  }
}

/** Maps a Cloudflare state to our MediaFile.status vocabulary. */
export function mapStreamState(state: string): "processing" | "ready" | "error" {
  if (state === "ready") return "ready";
  if (state === "error") return "error";
  return "processing";
}

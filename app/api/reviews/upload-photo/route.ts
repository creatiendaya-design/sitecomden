import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { uploadRateLimiter, withRateLimit } from "@/lib/rate-limit";

/**
 * Public, unauthenticated image upload for storefront review photos.
 *
 * Distinct from /api/upload (which requires an admin session): customers
 * aren't logged in. To stay safe for an open endpoint we:
 *  - rate-limit per IP (shares the 20/h upload limiter),
 *  - allow only raster photos (JPG/PNG/WebP) — no SVG (XML/script risk),
 *    no GIF (avoids animated payloads),
 *  - verify real content via magic bytes (defeats content-type spoofing),
 *  - cap at 5MB and store under a dedicated `reviews/` prefix.
 *
 * Returns { url }. The client collects URLs and passes them as `images[]`
 * to /api/reviews/submit. Reviews are unapproved until an admin moderates
 * them, so an uploaded photo never appears publicly without review.
 */
export const maxDuration = 30;

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Magic byte signatures — same approach as /api/upload, raster only.
const MAGIC_SIGNATURES = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
] as const;

function detectImageType(buffer: Uint8Array): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    if (sig.bytes.every((b, i) => buffer[i] === b)) {
      if (sig.mime === "image/webp") {
        const webp = [0x57, 0x45, 0x42, 0x50];
        if (!webp.every((b, i) => buffer[8 + i] === b)) continue;
      }
      return sig.mime;
    }
  }
  return null;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const rateLimitResponse = await withRateLimit(request, uploadRateLimiter, {
    action: "review_photo_upload",
    errorMessage: "Demasiadas imágenes. Intenta más tarde.",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ninguna imagen" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: `Imagen demasiado grande (${(file.size / 1024 / 1024).toFixed(
            1
          )}MB). Máximo: 5MB.`,
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const detectedMime = detectImageType(buffer);

    if (!detectedMime) {
      return NextResponse.json(
        { error: "Formato no válido. Sube una foto JPG, PNG o WebP." },
        { status: 400 }
      );
    }

    const ext = EXT_BY_MIME[detectedMime];
    const uniqueName = `reviews/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}.${ext}`;

    const blob = await put(
      uniqueName,
      new Blob([buffer], { type: detectedMime }),
      { access: "public" }
    );

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[REVIEW PHOTO UPLOAD] Error:", error);
    return NextResponse.json(
      { error: "No se pudo subir la imagen. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

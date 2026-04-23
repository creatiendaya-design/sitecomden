import { put } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadRateLimiter, withRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const ALLOWED_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov"]);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;   // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;  // 100MB

// Magic byte signatures to verify actual image content (prevents content-type spoofing)
const MAGIC_SIGNATURES = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",  bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif",  bytes: [0x47, 0x49, 0x46, 0x38] },
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

export async function POST(request: Request) {
  // Auth — only logged-in admins may upload
  const { response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const contentType = request.headers.get("content-type") ?? "";

  // ── Path A: Client-side direct upload for videos (bypasses 10MB body limit) ──
  // The browser's `upload()` from @vercel/blob/client posts JSON requesting a token,
  // then uploads directly to Vercel Blob. The server never receives the file body.
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as HandleUploadBody;

      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          const ext = (pathname.split(".").pop() ?? "").toLowerCase();
          if (!ALLOWED_VIDEO_EXTENSIONS.has(ext)) {
            throw new Error("Solo se permiten videos: MP4, WebM, MOV");
          }
          return {
            allowedContentTypes: [...ALLOWED_VIDEO_TYPES],
            maximumSizeInBytes: MAX_VIDEO_SIZE,
          };
        },
        onUploadCompleted: async ({ blob }) => {
          // Vercel Blob calls this after the direct upload finishes
          console.log("[UPLOAD] Video upload completed:", blob.url);
        },
      });

      return NextResponse.json(jsonResponse);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Error al procesar upload de video" },
        { status: 400 }
      );
    }
  }

  // ── Path B: Server-side FormData upload for images ──
  // Rate limiting — 20 uploads per hour per IP
  const rateLimitResponse = await withRateLimit(request, uploadRateLimiter, {
    action: "upload",
    errorMessage: "Demasiados uploads. Límite: 20 por hora.",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Tipo de imagen no permitido. Se permiten: JPG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `Extensión no permitida: .${ext}` }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Imagen demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: 10MB.` },
        { status: 413 }
      );
    }

    // Verify actual content via magic bytes (prevents content-type spoofing)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const detectedMime = detectImageType(buffer);

    if (!detectedMime) {
      return NextResponse.json({ error: "El archivo no es una imagen válida" }, { status: 400 });
    }

    if (detectedMime !== file.type && file.type !== "image/jpg") {
      return NextResponse.json(
        { error: "El contenido del archivo no coincide con el tipo declarado" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const uniqueName = `products/${timestamp}-${random}.${ext}`;

    const blob = await put(uniqueName, new Blob([buffer], { type: detectedMime }), {
      access: "public",
    });

    return NextResponse.json({ url: blob.url, filename: file.name, size: file.size, type: detectedMime });
  } catch (error) {
    console.error("[UPLOAD] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("blob") || error.message.includes("BLOB_")) {
        return NextResponse.json(
          { error: "Error de configuración del servidor. Contacta al administrador." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Error al subir la imagen. Intenta de nuevo." }, { status: 500 });
  }
}

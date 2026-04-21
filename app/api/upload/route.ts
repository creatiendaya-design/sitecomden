import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadRateLimiter, withRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Magic byte signatures to verify actual file content (client MIME type can be forged)
const MAGIC_SIGNATURES = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",  bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif",  bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF (+ WEBP at offset 8)
] as const;

function detectImageType(buffer: Uint8Array): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    if (sig.bytes.every((b, i) => buffer[i] === b)) {
      if (sig.mime === "image/webp") {
        // WebP requires WEBP marker at bytes 8-11
        const webp = [0x57, 0x45, 0x42, 0x50];
        if (!webp.every((b, i) => buffer[8 + i] === b)) continue;
      }
      return sig.mime;
    }
  }

  return null;
}

export async function POST(request: Request) {
  // 1. Admin authentication — only logged-in admin users may upload
  const { response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  // 2. Rate limiting — 20 uploads per hour per IP
  const rateLimitResponse = await withRateLimit(request, uploadRateLimiter, {
    action: "upload",
    errorMessage: "Demasiados uploads. Límite: 20 por hora.",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // 3. Validate declared MIME type (first gate)
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo se permiten: JPG, PNG, WebP, GIF, SVG" },
        { status: 400 }
      );
    }

    // 4. Validate file extension against allowlist
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Extensión no permitida: .${ext}` },
        { status: 400 }
      );
    }

    // 5. Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: 10MB.` },
        { status: 413 }
      );
    }

    // 6. Read bytes and verify actual content (prevents content-type spoofing)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const detectedMime = detectImageType(buffer);

    if (!detectedMime) {
      return NextResponse.json(
        { error: "El archivo no es una imagen válida" },
        { status: 400 }
      );
    }

    // Declared and detected MIME type must agree (both must be image/*)
    if (detectedMime !== file.type && file.type !== "image/jpg") {
      return NextResponse.json(
        { error: "El contenido del archivo no coincide con el tipo declarado" },
        { status: 400 }
      );
    }

    // 7. Build safe unique filename (extension already validated)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const uniqueName = `products/${timestamp}-${random}.${ext}`;

    // 8. Upload validated bytes to Vercel Blob
    const blob = await put(uniqueName, new Blob([buffer], { type: detectedMime }), {
      access: "public",
    });

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: detectedMime,
    });
  } catch (error) {
    console.error("[UPLOAD] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("blob") || error.message.includes("BLOB_")) {
        return NextResponse.json(
          { error: "Error de configuración del servidor. Contacta al administrador." },
          { status: 500 }
        );
      }
      if (error.message.includes("body") || error.message.includes("payload")) {
        return NextResponse.json(
          { error: "El archivo es demasiado grande. Máximo: 10MB." },
          { status: 413 }
        );
      }
    }

    return NextResponse.json(
      { error: "Error al subir el archivo. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

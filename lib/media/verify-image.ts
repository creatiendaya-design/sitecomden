/**
 * Validación de imágenes subidas, compartida por todos los caminos de upload.
 *
 * Vivía sólo dentro de `app/api/upload/route.ts`, así que las rutas
 * alternativas (p. ej. el upload de logo/favicon) aceptaban cualquier
 * `image/*` — incluido SVG sin sanitizar, que se sirve desde nuestro dominio
 * y por tanto puede ejecutar JS con nuestro origen. Centralizarla evita que
 * la próxima ruta de upload vuelva a nacer sin defensas.
 */

import { sanitizeSvg } from "@/lib/media/sanitize-svg";

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export const ALLOWED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "svg",
]);

/** Firmas de bytes reales — impiden falsificar el content-type. */
const MAGIC_SIGNATURES = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
] as const;

export function detectImageType(buffer: Uint8Array): string | null {
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

export type VerifiedImage =
  | { ok: true; body: Blob | File; contentType: string; extension: string }
  | { ok: false; error: string };

interface VerifyOptions {
  /** Tamaño máximo para rasters. Los SVG usan su propio límite (2MB). */
  maxBytes: number;
  /** Extensiones permitidas para este destino concreto. */
  allowedExtensions?: Set<string>;
}

const MAX_SVG_SIZE = 2 * 1024 * 1024;

/**
 * Verifica un archivo subido y devuelve el cuerpo listo para almacenar.
 * Los SVG se devuelven ya sanitizados; los rasters se validan por magic bytes.
 */
export async function verifyImageUpload(
  file: File,
  { maxBytes, allowedExtensions = ALLOWED_IMAGE_EXTENSIONS }: VerifyOptions,
): Promise<VerifiedImage> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: "Tipo de archivo no permitido" };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.has(extension)) {
    return { ok: false, error: "Extensión de archivo no permitida" };
  }

  if (file.type === "image/svg+xml" || extension === "svg") {
    if (file.size > MAX_SVG_SIZE) {
      return { ok: false, error: "El SVG no debe superar 2MB" };
    }

    const svgText = await file.text();
    const clean = await sanitizeSvg(svgText);
    if (!clean) {
      return { ok: false, error: "El SVG no es válido o contiene contenido no permitido" };
    }

    return {
      ok: true,
      body: new Blob([clean], { type: "image/svg+xml" }),
      contentType: "image/svg+xml",
      extension: "svg",
    };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `La imagen no debe superar ${(maxBytes / 1024 / 1024).toFixed(0)}MB`,
    };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectImageType(buffer);

  if (!detectedMime) {
    return { ok: false, error: "El archivo no es una imagen válida" };
  }

  // `image/jpg` no es un MIME real pero algunos navegadores lo emiten.
  if (detectedMime !== file.type && file.type !== "image/jpg") {
    return {
      ok: false,
      error: "El contenido del archivo no coincide con el tipo declarado",
    };
  }

  return { ok: true, body: file, contentType: detectedMime, extension };
}

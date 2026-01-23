import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // ✅ CAMBIO 1: Validar tipo de archivo con más detalle
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Tipo de archivo no permitido: ${file.type}. Solo se permiten: JPG, PNG, WebP, GIF, SVG`,
        },
        { status: 400 }
      );
    }

    // ✅ CAMBIO 2: Aumentar límite de 5MB a 10MB
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      return NextResponse.json(
        {
          error: `El archivo es demasiado grande (${fileSizeMB}MB). El tamaño máximo permitido es 10MB. Por favor, comprime la imagen antes de subirla.`,
        },
        { status: 413 } // 413 = Payload Too Large
      );
    }

    // ✅ CAMBIO 3: Log para debugging
    console.log(
      `📤 Subiendo imagen: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, ${file.type})`
    );

    // Generar nombre único (mantener tu estructura)
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split(".").pop();
    const uniqueName = `products/${timestamp}-${randomString}.${extension}`;

    // Subir a Vercel Blob
    const blob = await put(uniqueName, file, {
      access: "public",
    });

    console.log(`✅ Imagen subida exitosamente: ${blob.url}`);

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("❌ Error al subir imagen a blob:", error);

    // ✅ CAMBIO 4: Manejo de errores mejorado
    if (error instanceof Error) {
      // Error de tamaño del body (Edge Runtime)
      if (error.message.includes("body") || error.message.includes("payload")) {
        return NextResponse.json(
          {
            error:
              "El archivo es demasiado grande para procesarse. Máximo permitido: 10MB. Por favor, comprime la imagen con herramientas como TinyPNG.",
          },
          { status: 413 }
        );
      }

      // Error de Vercel Blob
      if (error.message.includes("blob") || error.message.includes("storage")) {
        return NextResponse.json(
          {
            error:
              "Error al almacenar la imagen en el servidor. Por favor, intenta de nuevo.",
          },
          { status: 500 }
        );
      }

      // Error genérico con mensaje específico
      return NextResponse.json(
        { error: `Error al subir archivo: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Error desconocido al subir el archivo. Por favor, intenta de nuevo más tarde." },
      { status: 500 }
    );
  }
}

// ⚠️ IMPORTANTE: Edge Runtime tiene límites más estrictos
// Si tienes problemas con archivos >4.5MB, considera remover esta línea
// y usar Node.js runtime por defecto (más lento pero sin límites)
export const runtime = "edge";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

// ✅ Configurar timeout más largo para Node.js runtime
export const maxDuration = 60; // 60 segundos (plan Pro de Vercel)

export async function POST(request: Request) {
  try {
    console.log("📤 [UPLOAD] Iniciando subida de archivo...");

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.error("❌ [UPLOAD] No se proporcionó archivo");
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    console.log(`📄 [UPLOAD] Archivo recibido: ${file.name}`);
    console.log(`📊 [UPLOAD] Tamaño: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`🏷️ [UPLOAD] Tipo: ${file.type}`);

    // ✅ Validar tipo de archivo
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];

    if (!validTypes.includes(file.type)) {
      console.error(`❌ [UPLOAD] Tipo no válido: ${file.type}`);
      return NextResponse.json(
        {
          error: `Tipo de archivo no permitido: ${file.type}. Solo se permiten: JPG, PNG, WebP, GIF, SVG`,
        },
        { status: 400 }
      );
    }

    // ✅ Validar tamaño (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      console.error(`❌ [UPLOAD] Archivo muy grande: ${fileSizeMB}MB`);
      return NextResponse.json(
        {
          error: `El archivo es demasiado grande (${fileSizeMB}MB). El tamaño máximo permitido es 10MB.`,
        },
        { status: 413 }
      );
    }

    // ✅ Generar nombre único
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split(".").pop();
    const uniqueName = `products/${timestamp}-${randomString}.${extension}`;

    console.log(`📦 [UPLOAD] Nombre único: ${uniqueName}`);
    console.log(`☁️ [UPLOAD] Subiendo a Vercel Blob...`);

    // ✅ Subir a Vercel Blob (sin timeout complicado, Vercel maneja esto)
    const blob = await put(uniqueName, file, {
      access: "public",
    });

    console.log(`✅ [UPLOAD] Subida exitosa: ${blob.url}`);

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("❌ [UPLOAD] Error detallado:", error);

    // ✅ Manejo específico de errores
    if (error instanceof Error) {
      console.error(`❌ [UPLOAD] Mensaje de error: ${error.message}`);
      console.error(`❌ [UPLOAD] Stack: ${error.stack}`);

      // Error de Vercel Blob
      if (error.message.includes("blob") || error.message.includes("BLOB_")) {
        return NextResponse.json(
          {
            error:
              "Error de configuración del servidor. Por favor, contacta al administrador. (Error: Variables de entorno no configuradas)",
          },
          { status: 500 }
        );
      }

      // Error de tamaño
      if (error.message.includes("body") || error.message.includes("payload")) {
        return NextResponse.json(
          {
            error:
              "El archivo es demasiado grande para procesarse. Máximo permitido: 10MB.",
          },
          { status: 413 }
        );
      }

      // Error genérico con mensaje
      return NextResponse.json(
        { error: `Error al subir archivo: ${error.message}` },
        { status: 500 }
      );
    }

    // Error desconocido
    return NextResponse.json(
      {
        error:
          "Error desconocido al subir el archivo. Por favor, intenta de nuevo más tarde.",
      },
      { status: 500 }
    );
  }
}
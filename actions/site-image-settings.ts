"use server";

import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";

export type SiteImageSettings = {
  logo: string | null;
  favicon: string | null;
};

/**
 * Subir logo o favicon
 */
export async function uploadSiteImage(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const imageType = formData.get("imageType") as "logo" | "favicon";

    if (!file) {
      return { success: false, error: "No se proporcionó archivo" };
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: "El archivo no debe superar 2MB" };
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Solo se permiten imágenes" };
    }

    // Para favicon, validar que sea pequeño (preferiblemente .ico o .png)
    if (imageType === "favicon") {
      const validFaviconTypes = ["image/x-icon", "image/png", "image/svg+xml"];
      if (!validFaviconTypes.includes(file.type)) {
        return {
          success: false,
          error: "El favicon debe ser .ico, .png o .svg",
        };
      }
    }

    // Subir a Vercel Blob
    const blob = await put(`site/${imageType}-${Date.now()}.${file.name.split(".").pop()}`, file, {
      access: "public",
    });

    // Guardar URL en la base de datos
    const settingKey = imageType === "logo" ? "site_logo" : "site_favicon";
    await prisma.setting.upsert({
      where: { key: settingKey },
      update: {
        value: blob.url,
      },
      create: {
        key: settingKey,
        value: blob.url,
        category: "general",
        description: imageType === "logo" ? "Logo del sitio" : "Favicon del sitio",
      },
    });

    return {
      success: true,
      url: blob.url,
    };
  } catch (error) {
    console.error("Error uploading site image:", error);
    return {
      success: false,
      error: "Error al subir la imagen",
    };
  }
}

/**
 * Eliminar logo o favicon
 */
export async function deleteSiteImage(imageType: "logo" | "favicon") {
  try {
    const settingKey = imageType === "logo" ? "site_logo" : "site_favicon";

    await prisma.setting.update({
      where: { key: settingKey },
      data: {
        value: "",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting site image:", error);
    return {
      success: false,
      error: "Error al eliminar la imagen",
    };
  }
}

/**
 * Obtener configuración actual de imágenes
 */
export async function getSiteImageSettings(): Promise<SiteImageSettings> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["site_logo", "site_favicon"],
        },
      },
    });

    const logo = settings.find((s) => s.key === "site_logo")?.value as string;
    const favicon = settings.find((s) => s.key === "site_favicon")?.value as string;

    return {
      logo: logo || null,
      favicon: favicon || null,
    };
  } catch (error) {
    console.error("Error getting site image settings:", error);
    return {
      logo: null,
      favicon: null,
    };
  }
}
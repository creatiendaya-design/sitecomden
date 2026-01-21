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

    // Guardar URL en la base de datos como objeto JSON
    const settingKey = imageType === "logo" ? "site_logo" : "site_favicon";
    await prisma.setting.upsert({
      where: { key: settingKey },
      update: {
        value: { url: blob.url },
      },
      create: {
        key: settingKey,
        value: { url: blob.url },
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
      error: error instanceof Error ? error.message : "Error al subir la imagen",
    };
  }
}

/**
 * Eliminar logo o favicon
 */
export async function deleteSiteImage(imageType: "logo" | "favicon") {
  try {
    const settingKey = imageType === "logo" ? "site_logo" : "site_favicon";

    await prisma.setting.deleteMany({
      where: { key: settingKey },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting site image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar la imagen",
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

    console.log("📦 Raw settings from DB:", JSON.stringify(settings, null, 2));

    // Extraer URLs de los objetos JSON
    const logoSetting = settings.find((s) => s.key === "site_logo");
    const faviconSetting = settings.find((s) => s.key === "site_favicon");

    console.log("🔍 Logo setting:", logoSetting);
    console.log("🔍 Favicon setting:", faviconSetting);

    // Parsear el JSON correctamente
    let logo: string | null = null;
    let favicon: string | null = null;

    if (logoSetting?.value) {
      const value = logoSetting.value;
      console.log("🔍 Logo value type:", typeof value, value);
      
      // Si ya es un objeto con url
      if (typeof value === "object" && value !== null && "url" in value) {
        logo = String(value.url);
      }
      // Si es string directo (legacy)
      else if (typeof value === "string") {
        logo = value;
      }
    }

    if (faviconSetting?.value) {
      const value = faviconSetting.value;
      console.log("🔍 Favicon value type:", typeof value, value);
      
      // Si ya es un objeto con url
      if (typeof value === "object" && value !== null && "url" in value) {
        favicon = String(value.url);
      }
      // Si es string directo (legacy)
      else if (typeof value === "string") {
        favicon = value;
      }
    }

    console.log("✅ Final result:", { logo, favicon });

    return {
      logo,
      favicon,
    };
  } catch (error) {
    console.error("Error getting site image settings:", error);
    return {
      logo: null,
      favicon: null,
    };
  }
}
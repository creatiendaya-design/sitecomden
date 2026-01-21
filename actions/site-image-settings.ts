"use server";

import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";

export type SiteImageSettings = {
  logo: string | null;
  favicon: string | null;
  ogImage: string | null; // ✅ Agregado
};

/**
 * Subir logo, favicon u og-image
 */
export async function uploadSiteImage(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const imageType = formData.get("imageType") as "logo" | "favicon" | "ogImage"; // ✅ Agregado ogImage

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
    const settingKey = 
      imageType === "logo" ? "site_logo" : 
      imageType === "favicon" ? "site_favicon" : 
      "seo_home_og_image"; // ✅ Agregado

    await prisma.setting.upsert({
      where: { key: settingKey },
      update: {
        value: { url: blob.url },
      },
      create: {
        key: settingKey,
        value: { url: blob.url },
        category: imageType === "ogImage" ? "seo" : "general", // ✅ Categoría correcta
        description: 
          imageType === "logo" ? "Logo del sitio" : 
          imageType === "favicon" ? "Favicon del sitio" :
          "Imagen Open Graph", // ✅ Agregado
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
 * Eliminar logo, favicon u og-image
 */
export async function deleteSiteImage(imageType: "logo" | "favicon" | "ogImage") { // ✅ Agregado ogImage
  try {
    const settingKey = 
      imageType === "logo" ? "site_logo" : 
      imageType === "favicon" ? "site_favicon" :
      "seo_home_og_image"; // ✅ Agregado

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
          in: ["site_logo", "site_favicon", "seo_home_og_image"], // ✅ Agregado
        },
      },
    });

    // Extraer URLs de los objetos JSON
    const logoSetting = settings.find((s) => s.key === "site_logo");
    const faviconSetting = settings.find((s) => s.key === "site_favicon");
    const ogImageSetting = settings.find((s) => s.key === "seo_home_og_image"); // ✅ Agregado

    // Parsear el JSON correctamente
    let logo: string | null = null;
    let favicon: string | null = null;
    let ogImage: string | null = null; // ✅ Agregado

    if (logoSetting?.value) {
      const value = logoSetting.value;
      if (typeof value === "object" && value !== null && "url" in value) {
        logo = String(value.url);
      } else if (typeof value === "string") {
        logo = value;
      }
    }

    if (faviconSetting?.value) {
      const value = faviconSetting.value;
      if (typeof value === "object" && value !== null && "url" in value) {
        favicon = String(value.url);
      } else if (typeof value === "string") {
        favicon = value;
      }
    }

    // ✅ Agregado: Procesar OG Image
    if (ogImageSetting?.value) {
      const value = ogImageSetting.value;
      if (typeof value === "object" && value !== null && "url" in value) {
        ogImage = String(value.url);
      } else if (typeof value === "string") {
        ogImage = value;
      }
    }

    return {
      logo,
      favicon,
      ogImage, // ✅ Agregado
    };
  } catch (error) {
    console.error("Error getting site image settings:", error);
    return {
      logo: null,
      favicon: null,
      ogImage: null, // ✅ Agregado
    };
  }
}
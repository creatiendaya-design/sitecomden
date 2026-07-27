"use server";

import { put } from "@vercel/blob";
import { updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { verifyImageUpload } from "@/lib/media/verify-image";

const MAX_SITE_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

/** Extensiones aceptadas por destino. El favicon no admite formatos pesados. */
const ALLOWED_BY_TYPE: Record<string, Set<string>> = {
  logo: new Set(["png", "webp", "svg", "jpg", "jpeg"]),
  favicon: new Set(["png", "svg"]),
  ogImage: new Set(["png", "jpg", "jpeg", "webp"]),
};

export type SiteImageSettings = {
  logo: string | null;
  favicon: string | null;
  ogImage: string | null; // ✅ Agregado
};

/**
 * Subir logo, favicon u og-image
 */
export async function uploadSiteImage(formData: FormData) {
  // Reemplaza el logo/favicon del sitio: sin guard, cualquier visitante podía
  // repintar la marca de la tienda o servir un SVG con script desde nuestro
  // propio origen.
  const { response } = await requirePermission("settings:update");
  if (response) {
    return { success: false, error: "No autorizado para cambiar las imágenes del sitio" };
  }

  try {
    const file = formData.get("file");
    const imageType = formData.get("imageType") as "logo" | "favicon" | "ogImage";

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "No se proporcionó archivo" };
    }

    const allowedExtensions = ALLOWED_BY_TYPE[imageType];
    if (!allowedExtensions) {
      return { success: false, error: "Tipo de imagen no válido" };
    }

    // Mismo pipeline que /api/upload: magic bytes para rasters y sanitización
    // XML para SVG.
    const verified = await verifyImageUpload(file, {
      maxBytes: MAX_SITE_IMAGE_SIZE,
      allowedExtensions,
    });

    if (!verified.ok) {
      return { success: false, error: verified.error };
    }

    // Subir a Vercel Blob
    const blob = await put(
      `site/${imageType}-${Date.now()}.${verified.extension}`,
      verified.body,
      {
        access: "public",
        contentType: verified.contentType,
      },
    );

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

    // Plan 12: bust the cached site settings so the new logo/favicon/og
    // image surfaces on the next storefront request.
    updateTag("site-settings");

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
  const { response } = await requirePermission("settings:update");
  if (response) {
    return { success: false, error: "No autorizado para cambiar las imágenes del sitio" };
  }

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
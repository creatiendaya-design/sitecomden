// Utilidad para obtener la URL de la imagen de un producto
// Soporta tanto el formato antiguo (string[]) como el nuevo (objeto con metadata)

interface ImageMetadata {
  url: string;
  alt?: string;
  name?: string;
}

export function getProductImageUrl(images: unknown, index: number = 0): string | null {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return null;
  }

  const image = images[index];

  if (!image) {
    return null;
  }

  // Si es string, retornar directamente
  if (typeof image === "string") {
    return image;
  }

  // Si es objeto, retornar la propiedad url
  if (typeof image === "object" && image !== null && "url" in image && typeof (image as { url: unknown }).url === "string") {
    return (image as { url: string }).url;
  }

  return null;
}

export function getProductImageAlt(images: unknown, productName: string, index: number = 0): string {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return productName;
  }

  const image = images[index];

  if (!image) {
    return productName;
  }

  // Si es objeto con alt, retornar el alt
  if (typeof image === "object" && image !== null && "alt" in image && typeof (image as { alt: unknown }).alt === "string") {
    return (image as { alt: string }).alt;
  }

  // Fallback al nombre del producto
  return productName;
}

export function getAllProductImages(images: unknown): ImageMetadata[] {
  if (!images || !Array.isArray(images)) {
    return [];
  }

  return images.map((image) => {
    if (typeof image === "string") {
      return { url: image };
    }
    if (typeof image === "object" && image !== null && "url" in image) {
      const img = image as { url?: unknown; alt?: unknown; name?: unknown };
      return {
        url: typeof img.url === "string" ? img.url : "",
        alt: typeof img.alt === "string" ? img.alt : undefined,
        name: typeof img.name === "string" ? img.name : undefined,
      };
    }
    return { url: "" };
  }).filter(img => img.url);
}

// Función para normalizar imágenes antes de guardar en la base de datos
// Convierte automáticamente strings a objetos con metadata
export function normalizeImagesForSave(images: unknown): ImageMetadata[] {
  if (!images || !Array.isArray(images)) {
    return [];
  }

  // ⭐ FIX: Separar en dos pasos para TypeScript
  const mapped = images.map((image): ImageMetadata | null => {
    // Si ya es un objeto con url, mantenerlo
    if (typeof image === "object" && image !== null && "url" in image) {
      const img = image as { url?: unknown; alt?: unknown; name?: unknown };
      if (typeof img.url === "string" && img.url) {
        return {
          url: img.url,
          alt: typeof img.alt === "string" ? img.alt : "",
          name: typeof img.name === "string" ? img.name : "",
        };
      }
    }

    // Si es un string, convertirlo a objeto
    if (typeof image === "string") {
      return {
        url: image,
        alt: "",
        name: "",
      };
    }

    return null;
  });

  // ⭐ FIX: Type guard explícito
  return mapped.filter((img): img is ImageMetadata => {
    return img !== null && img.url !== "";
  });
}

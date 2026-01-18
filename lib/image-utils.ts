// Utilidad para obtener la URL de la imagen de un producto
// Soporta tanto el formato antiguo (string[]) como el nuevo (objeto con metadata)

interface ImageMetadata {
  url: string;
  alt?: string;
  name?: string;
}

export function getProductImageUrl(images: any, index: number = 0): string | null {
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
  if (typeof image === "object" && image.url) {
    return image.url;
  }

  return null;
}

export function getProductImageAlt(images: any, productName: string, index: number = 0): string {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return productName;
  }

  const image = images[index];
  
  if (!image) {
    return productName;
  }

  // Si es objeto con alt, retornar el alt
  if (typeof image === "object" && image.alt) {
    return image.alt;
  }

  // Fallback al nombre del producto
  return productName;
}

export function getAllProductImages(images: any): ImageMetadata[] {
  if (!images || !Array.isArray(images)) {
    return [];
  }

  return images.map((image, index) => {
    if (typeof image === "string") {
      return { url: image };
    }
    if (typeof image === "object" && image.url) {
      return {
        url: image.url,
        alt: image.alt,
        name: image.name,
      };
    }
    return { url: "" };
  }).filter(img => img.url);
}

// Función para normalizar imágenes antes de guardar en la base de datos
// Convierte automáticamente strings a objetos con metadata
export function normalizeImagesForSave(images: any): ImageMetadata[] {
  if (!images || !Array.isArray(images)) {
    return [];
  }

  return images.map((image) => {
    // Si ya es un objeto con url, mantenerlo
    if (typeof image === "object" && image.url) {
      return {
        url: image.url,
        alt: image.alt || "",
        name: image.name || "",
      };
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
  }).filter((img): img is ImageMetadata => img !== null && img.url !== "");
}
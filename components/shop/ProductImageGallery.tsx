"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getAllProductImages } from "@/lib/image-utils";

interface ProductImageGalleryProps {
  images: any;
  name: string;
}

export default function ProductImageGallery({
  images,
  name,
}: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  // 🆕 Estado para imagen de variante temporal
  const [variantImage, setVariantImage] = useState<string | null>(null);
  
  // Normalizar imágenes del producto (SOLO para thumbnails)
  const normalizedImages = getAllProductImages(images);

  // 🆕 Escuchar cambios de imagen de variante
  useEffect(() => {
    const handleVariantImageChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const imageUrl = customEvent.detail?.imageUrl;

      if (!imageUrl) {
        // Si no hay imagen, resetear a imagen seleccionada del producto
        setVariantImage(null);
        return;
      }

      console.log("🖼️ Mostrando imagen de variante:", imageUrl);
      setVariantImage(imageUrl);
    };

    window.addEventListener("variant-image-changed", handleVariantImageChange);

    return () => {
      window.removeEventListener("variant-image-changed", handleVariantImageChange);
    };
  }, []);

  // 🆕 Resetear imagen de variante cuando el usuario selecciona un thumbnail
  const handleThumbnailClick = (index: number) => {
    setSelectedImage(index);
    setVariantImage(null); // Limpiar imagen de variante
  };

  if (normalizedImages.length === 0) {
    return (
      <div className="product-gallery-wrapper">
        <div className="product-gallery-main">
          <div className="flex items-center justify-center h-full">
            <span className="text-slate-400 text-sm">Sin imagen</span>
          </div>
        </div>
      </div>
    );
  }

  // 🆕 Determinar qué imagen mostrar en grande
  const mainImageUrl = variantImage || normalizedImages[selectedImage].url;
  const mainImageAlt = variantImage 
    ? `${name} - Variante`
    : (normalizedImages[selectedImage].alt || `${name} - Imagen ${selectedImage + 1}`);

  return (
    <div className="product-gallery-wrapper">
      {/* Main Image */}
      <div className="product-gallery-main">
        <Image
          src={mainImageUrl}
          alt={mainImageAlt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
          priority={selectedImage === 0 && !variantImage}
          quality={90}
          className="select-none"
          style={{ objectFit: 'contain' }}
          key={mainImageUrl} // 🆕 Force re-render cuando cambia la imagen
        />
      </div>

      {/* Thumbnails - SOLO imágenes del producto */}
      {normalizedImages.length > 1 && (
        <div className="product-gallery-thumbnails">
          {normalizedImages.map((image, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`product-gallery-thumbnail ${
                selectedImage === index && !variantImage ? 'active' : ''
              }`}
              type="button"
              aria-label={`Ver imagen ${index + 1} de ${normalizedImages.length}`}
              aria-pressed={selectedImage === index && !variantImage}
            >
              <Image
                src={image.url}
                alt={image.alt || `${name} - Miniatura ${index + 1}`}
                fill
                sizes="(max-width: 640px) 20vw, (max-width: 1024px) 15vw, 120px"
                quality={60}
                className="select-none"
              />
            </button>
          ))}
        </div>
      )}

      {/* 🆕 Indicador visual cuando se está mostrando imagen de variante */}
      {variantImage && (
        <div className="mt-2 text-center">
          <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Mostrando imagen de variante seleccionada
          </span>
        </div>
      )}
    </div>
  );
}
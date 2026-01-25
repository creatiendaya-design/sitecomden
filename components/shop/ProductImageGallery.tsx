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
  
  // Normalizar imágenes a formato consistente
  const normalizedImages = getAllProductImages(images);

  // 🆕 Escuchar cambios de imagen de variante
  useEffect(() => {
    const handleVariantImageChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const imageUrl = customEvent.detail?.imageUrl;

      if (!imageUrl) return;

      console.log("🖼️ Evento de cambio de imagen recibido:", imageUrl);

      // Buscar el índice de la imagen en el array
      const imageIndex = normalizedImages.findIndex(
        (img) => img.url === imageUrl
      );

      if (imageIndex !== -1) {
        console.log("✅ Imagen encontrada en índice:", imageIndex);
        setSelectedImage(imageIndex);
      } else {
        console.log("⚠️ Imagen no encontrada en galería, agregándola temporalmente");
        // Si la imagen no está en la galería, podríamos agregarla dinámicamente
        // Por ahora, solo loguear que no se encontró
      }
    };

    window.addEventListener("variant-image-changed", handleVariantImageChange);

    return () => {
      window.removeEventListener("variant-image-changed", handleVariantImageChange);
    };
  }, [normalizedImages]);

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

  return (
    <div className="product-gallery-wrapper">
      {/* Main Image */}
      <div className="product-gallery-main">
        <Image
          src={normalizedImages[selectedImage].url}
          alt={normalizedImages[selectedImage].alt || `${name} - Imagen ${selectedImage + 1}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
          priority={selectedImage === 0}
          quality={90}
          className="select-none"
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Thumbnails */}
      {normalizedImages.length > 1 && (
        <div className="product-gallery-thumbnails">
          {normalizedImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`product-gallery-thumbnail ${
                selectedImage === index ? 'active' : ''
              }`}
              type="button"
              aria-label={`Ver imagen ${index + 1} de ${normalizedImages.length}`}
              aria-pressed={selectedImage === index}
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
    </div>
  );
}
"use client";

import { useState } from "react";
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
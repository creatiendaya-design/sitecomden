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
      <div className="aspect-square w-full rounded-lg bg-slate-100 flex items-center justify-center">
        <span className="text-muted-foreground">Sin imagen</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100">
        <Image
          src={normalizedImages[selectedImage].url}
          alt={normalizedImages[selectedImage].alt || `${name} - Imagen ${selectedImage + 1}`}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Thumbnails */}
      {normalizedImages.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {normalizedImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`relative aspect-square overflow-hidden rounded-lg bg-slate-100 ${
                selectedImage === index
                  ? "ring-2 ring-primary ring-offset-2"
                  : "hover:opacity-75"
              }`}
            >
              <Image
                src={image.url}
                alt={image.alt || `${name} - Miniatura ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
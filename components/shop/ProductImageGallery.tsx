"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { getAllProductImages } from "@/lib/image-utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductImageGalleryProps {
  images: unknown;
  name: string;
}

export default function ProductImageGallery({
  images,
  name,
}: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  // 🆕 Estado para imagen de variante temporal
  const [variantImage, setVariantImage] = useState<string | null>(null);
  // Lightbox: amplía la imagen al hacer clic y muestra su texto alternativo.
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
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

  // Navegación dentro del lightbox (vuelve siempre a las imágenes del producto).
  const showPrevImage = () => {
    setVariantImage(null);
    setSelectedImage(
      (prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length,
    );
  };
  const showNextImage = () => {
    setVariantImage(null);
    setSelectedImage((prev) => (prev + 1) % normalizedImages.length);
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
      {/* Main Image — clic para ampliar (lightbox) */}
      <div className="product-gallery-main">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group absolute inset-0 h-full w-full cursor-zoom-in"
          aria-label={`Ampliar imagen: ${mainImageAlt}`}
        >
          <Image
            src={mainImageUrl}
            alt={mainImageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
            priority={selectedImage === 0 && !variantImage}
            quality={90}
            className="select-none"
            style={{ objectFit: "contain" }}
            key={mainImageUrl} // 🆕 Force re-render cuando cambia la imagen
          />
          <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
            Ampliar
          </span>
        </button>
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

      {/* Lightbox: imagen ampliada + texto alternativo (editable en el admin) */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="w-[96vw] max-w-5xl overflow-hidden p-0">
          <DialogTitle className="sr-only">{mainImageAlt}</DialogTitle>
          <div className="relative h-[70vh] w-full bg-slate-50">
            <Image
              src={mainImageUrl}
              alt={mainImageAlt}
              fill
              sizes="96vw"
              quality={95}
              className="select-none"
              style={{ objectFit: "contain" }}
              key={`lightbox-${mainImageUrl}`}
            />

            {normalizedImages.length > 1 && !variantImage && (
              <>
                <button
                  type="button"
                  onClick={showPrevImage}
                  aria-label="Imagen anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow transition-colors hover:bg-white"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  aria-label="Imagen siguiente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow transition-colors hover:bg-white"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {/* Caption: muestra el ALT de la imagen */}
          <div className="flex items-center justify-between gap-4 border-t bg-white px-4 py-3">
            <p className="line-clamp-2 text-sm text-slate-700">
              {mainImageAlt}
            </p>
            {normalizedImages.length > 1 && !variantImage && (
              <span className="shrink-0 text-xs text-slate-400">
                {selectedImage + 1} / {normalizedImages.length}
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import GalleryLightbox from "@/components/shop/GalleryLightbox";
import type { GalleryBlockContent } from "@/lib/types/landing-blocks";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface GalleryBlockProps {
  content: GalleryBlockContent | unknown;
  onBuyClick?: () => void;
}

export default function GalleryBlock({ content: rawContent, onBuyClick }: GalleryBlockProps) {
  const content = readContent<GalleryBlockContent>(rawContent, "GALLERY");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);
  const { displayType, images, showBuyButton, buyButtonText } = content;
  if (!images?.length) return null;

  const buttonLabel = buyButtonText?.trim() || "Comprar ahora";

  if (displayType === "stacked") {
    return <GalleryStacked images={images} showBuyButton={showBuyButton} buttonLabel={buttonLabel} onBuyClick={onBuyClick} styleClass={styleClass} inlineStyle={inlineStyle} />;
  }
  return <GallerySlider images={images} showBuyButton={showBuyButton} buttonLabel={buttonLabel} onBuyClick={onBuyClick} styleClass={styleClass} inlineStyle={inlineStyle} />;
}

function GallerySlider({
  images,
  showBuyButton,
  buttonLabel,
  onBuyClick,
  styleClass,
  inlineStyle,
}: {
  images: string[];
  showBuyButton: boolean;
  buttonLabel: string;
  onBuyClick?: () => void;
  styleClass?: string;
  inlineStyle?: React.CSSProperties;
}) {
  const [current, setCurrent] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const prev = useCallback(() => setCurrent((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent((i) => (i + 1) % images.length), [images.length]);

  return (
    <section className={cn("landing-section py-12 @container", styleClass)} style={inlineStyle}>
      <div className="container mx-auto px-4">
        {/* Main image */}
        <div className="relative aspect-[4/3] @md:aspect-video max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-lg mb-4">
          <Image
            src={images[current]}
            alt={`Imagen ${current + 1}`}
            fill
            className="object-cover cursor-zoom-in transition-opacity duration-300"
            onClick={() => setLightboxIndex(current)}
            unoptimized
          />
          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Centered thumbnails */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2 overflow-x-auto pb-2 px-4">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`relative w-16 h-16 rounded-lg shrink-0 overflow-hidden border-2 transition-colors ${
                  i === current ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <Image src={img} alt="" fill className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        )}

        {showBuyButton && (
          <div className="flex justify-center mt-6">
            <button
              onClick={onBuyClick}
              className="landing-cta-btn rounded-full px-8 py-3 font-semibold shadow-md hover:scale-105 transition-transform active:scale-95"
            >
              {buttonLabel}
            </button>
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <GalleryLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}

function GalleryStacked({
  images,
  showBuyButton,
  buttonLabel,
  onBuyClick,
  styleClass,
  inlineStyle,
}: {
  images: string[];
  showBuyButton: boolean;
  buttonLabel: string;
  onBuyClick?: () => void;
  styleClass?: string;
  inlineStyle?: React.CSSProperties;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <section className={cn("landing-section py-12 @container", styleClass)} style={inlineStyle}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
          {images.map((img, i) => (
            <div key={i} className="group relative">
              <div
                className="relative w-full rounded-xl overflow-hidden shadow-md cursor-zoom-in"
                onClick={() => setLightboxIndex(i)}
              >
                <Image
                  src={img}
                  alt={`Imagen ${i + 1}`}
                  width={0}
                  height={0}
                  sizes="100vw"
                  className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
              </div>
              {showBuyButton && (
                <button
                  onClick={onBuyClick}
                  className="landing-cta-btn w-full mt-2 rounded-full py-2 font-semibold text-sm hover:scale-105 transition-transform active:scale-95"
                >
                  {buttonLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <GalleryLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}

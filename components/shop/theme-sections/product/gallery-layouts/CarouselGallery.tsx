"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CarouselGalleryProps {
  images: string[]
  altBase: string
  aspectClass: string
  showThumbnails?: boolean
  autoplay?: boolean
}

const AUTOPLAY_INTERVAL_MS = 5000

/**
 * Single-image carousel with prev/next controls + keyboard support.
 * Optional autoplay (5s rotation, pauses when the user interacts).
 */
export function CarouselGallery({
  images,
  altBase,
  aspectClass,
  showThumbnails = true,
  autoplay = false,
}: CarouselGalleryProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const count = images.length

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + count) % count)
  }, [count])
  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % count)
  }, [count])

  useEffect(() => {
    if (!autoplay || paused || count <= 1) return
    const id = window.setInterval(goNext, AUTOPLAY_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [autoplay, paused, count, goNext])

  // Keyboard navigation when the carousel has focus.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      goPrev()
      setPaused(true)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      goNext()
      setPaused(true)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        tabIndex={0}
        role="region"
        aria-roledescription="carrusel"
        aria-label={`Galería de ${altBase}`}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className={`relative ${aspectClass} rounded-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
      >
        {images.map((url, i) => (
          <Image
            key={url + i}
            src={url}
            alt={`${altBase} — imagen ${i + 1}`}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className={`object-cover transition-opacity duration-300 ${
              i === index ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            priority={i === 0}
          />
        ))}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => {
                goPrev()
                setPaused(true)
              }}
              aria-label="Imagen anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                goNext()
                setPaused(true)
              }}
              aria-label="Imagen siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <span
                  key={i}
                  aria-current={i === index ? "true" : undefined}
                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                    i === index ? "bg-primary w-4" : "bg-foreground/30"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {showThumbnails && count > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => {
                setIndex(i)
                setPaused(true)
              }}
              aria-label={`Mostrar imagen ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={`relative aspect-square h-16 w-16 shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                i === index ? "border-primary" : "border-transparent opacity-60"
              }`}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

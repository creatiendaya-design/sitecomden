import Image from "next/image"

interface StackedGalleryProps {
  images: string[]
  altBase: string
  aspectClass: string
  showThumbnails?: boolean
}

/**
 * Vertical stack — every image rendered full-width, one below the other.
 * Common in fashion / longform product pages.
 */
export function StackedGallery({
  images,
  altBase,
  aspectClass,
}: StackedGalleryProps) {
  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      {images.map((url, idx) => (
        <div
          key={url + idx}
          className={`relative ${aspectClass} rounded-lg overflow-hidden`}
        >
          <Image
            src={url}
            alt={`${altBase} — imagen ${idx + 1}`}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            priority={idx === 0}
          />
        </div>
      ))}
    </div>
  )
}

import Image from "next/image"

interface GridGalleryProps {
  images: string[]
  altBase: string
  aspectClass: string
  showThumbnails?: boolean
}

/**
 * Compact grid. 2×2 when 4 or fewer images; 3×N for more. Each cell uses
 * the configured aspect ratio.
 */
export function GridGallery({
  images,
  altBase,
  aspectClass,
}: GridGalleryProps) {
  const cols = images.length <= 4 ? "grid-cols-2" : "grid-cols-3"
  return (
    <div className={`grid ${cols} gap-2 sm:gap-3`}>
      {images.map((url, idx) => (
        <div
          key={url + idx}
          className={`relative ${aspectClass} rounded-lg overflow-hidden`}
        >
          <Image
            src={url}
            alt={`${altBase} — imagen ${idx + 1}`}
            fill
            sizes="(min-width: 1024px) 17vw, 33vw"
            className="object-cover"
            priority={idx === 0}
          />
        </div>
      ))}
    </div>
  )
}

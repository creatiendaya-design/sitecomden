import Image from "next/image"

interface TwoColumnGalleryProps {
  images: string[]
  altBase: string
  aspectClass: string
  showThumbnails?: boolean
}

/**
 * 2-column grid of images. First image renders alone if there's only one;
 * otherwise images flow into a 2-column grid (left/right).
 */
export function TwoColumnGallery({
  images,
  altBase,
  aspectClass,
}: TwoColumnGalleryProps) {
  if (images.length === 1) {
    return (
      <div className={`relative ${aspectClass} rounded-lg overflow-hidden`}>
        <Image
          src={images[0]}
          alt={altBase}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {images.map((url, idx) => (
        <div
          key={url + idx}
          className={`relative ${aspectClass} rounded-lg overflow-hidden`}
        >
          <Image
            src={url}
            alt={`${altBase} — imagen ${idx + 1}`}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
            priority={idx === 0}
          />
        </div>
      ))}
    </div>
  )
}

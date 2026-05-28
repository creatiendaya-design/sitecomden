import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { getAllProductImages } from "@/lib/image-utils"
import { SubBlockWrapper } from "../_helpers"
import type { ProductForRender } from "./types"
import { CarouselGallery } from "./gallery-layouts/CarouselGallery"
import { TwoColumnGallery } from "./gallery-layouts/TwoColumnGallery"
import { StackedGallery } from "./gallery-layouts/StackedGallery"
import { GridGallery } from "./gallery-layouts/GridGallery"

interface ProductGalleryProps {
  block: ResolvedThemeSectionBlock
  product: ProductForRender
}

interface ProductGalleryContent {
  layout?: "carousel" | "two_column" | "stacked" | "grid"
  showThumbnails?: boolean
  autoplay?: boolean
  aspectRatio?: "square" | "portrait" | "landscape"
}

const ASPECT_CLASS: Record<NonNullable<ProductGalleryContent["aspectRatio"]>, string> = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
}

export function ProductGallery({ block, product }: ProductGalleryProps) {
  const content = block.content as ProductGalleryContent
  const layout = content.layout ?? "two_column"
  const showThumbnails = content.showThumbnails ?? true
  const autoplay = content.autoplay ?? false
  const aspectClass = ASPECT_CLASS[content.aspectRatio ?? "square"]

  const images = getAllProductImages(product.images)

  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )

  if (images.length === 0) {
    return (
      <SubBlockWrapper
        block={block}
        className={className}
        style={style}
        colorScheme={dataColorScheme}
      >
        <div
          className={`${aspectClass} flex items-center justify-center rounded-lg bg-muted text-muted-foreground`}
        >
          Sin imagen
        </div>
      </SubBlockWrapper>
    )
  }

  const commonProps = {
    images: images.map((i) => i.url),
    altBase: product.name,
    aspectClass,
    showThumbnails,
  }

  // Mobile always uses the carousel — stacked / grid / two-column layouts
  // don't make sense on narrow screens (they'd either turn into a stacked
  // mess or shrink images below usability). The admin's `layout` choice
  // only takes effect from `md` (≥768px) up. `autoplay` and `showThumbnails`
  // are shared between mobile and desktop.
  const desktopGallery =
    layout === "carousel" ? (
      <CarouselGallery {...commonProps} autoplay={autoplay} />
    ) : layout === "stacked" ? (
      <StackedGallery {...commonProps} />
    ) : layout === "grid" ? (
      <GridGallery {...commonProps} />
    ) : (
      <TwoColumnGallery {...commonProps} />
    )

  return (
    <SubBlockWrapper
      block={block}
      className={className}
      style={style}
      colorScheme={dataColorScheme}
    >
      <div className="md:hidden">
        <CarouselGallery {...commonProps} autoplay={autoplay} />
      </div>
      <div className="hidden md:block">{desktopGallery}</div>
    </SubBlockWrapper>
  )
}

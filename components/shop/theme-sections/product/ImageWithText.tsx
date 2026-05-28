import Image from "next/image"
import Link from "next/link"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import RichTextContent from "@/components/RichTextContent"
import { Button } from "@/components/ui/button"
import { SectionWrapper } from "../_helpers"

interface ImageWithTextProps {
  section: ResolvedThemeSection
}

interface ImageWithTextContent {
  image?: string
  imagePosition?: "left" | "right"
  heading?: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
}

export function ImageWithText({ section }: ImageWithTextProps) {
  const content = section.content as ImageWithTextContent
  const image = content.image?.trim() ?? ""
  const position = content.imagePosition === "right" ? "right" : "left"
  const heading = content.heading?.trim() ?? ""
  const body = content.body?.trim() ?? ""
  const ctaLabel = content.ctaLabel?.trim() ?? ""
  const ctaHref = content.ctaHref?.trim() ?? ""

  if (!image && !heading && !body) return null

  const imageNode = image ? (
    <div className="relative aspect-square sm:aspect-[4/3] w-full rounded-lg overflow-hidden">
      <Image
        src={image}
        alt={heading || "Imagen"}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  ) : null

  const textNode = (
    <div className="flex flex-col justify-center gap-4">
      {heading && (
        <h2
          className="text-2xl sm:text-3xl font-bold"
          data-content-field="heading"
        >
          {heading}
        </h2>
      )}
      {body && <RichTextContent content={body} />}
      {ctaLabel && ctaHref && (
        <div>
          <Button asChild>
            <Link href={ctaHref} data-content-field="ctaLabel">
              {ctaLabel}
            </Link>
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <SectionWrapper section={section} as="section" className="py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {position === "left" ? (
            <>
              {imageNode}
              {textNode}
            </>
          ) : (
            <>
              {textNode}
              {imageNode}
            </>
          )}
        </div>
      </div>
    </SectionWrapper>
  )
}

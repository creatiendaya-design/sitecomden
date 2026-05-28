import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text"
import { SectionWrapper } from "../_helpers"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface FooterBannerContent {
  image?: string
  imagePosition?: "left" | "right" | "background"
  heading?: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
}

export function FooterBanner({ section }: Props) {
  const data = section.content as FooterBannerContent
  const position = data.imagePosition ?? "left"
  const hasCta = Boolean(data.ctaLabel && data.ctaHref)

  if (position === "background") {
    return (
      <SectionWrapper section={section} as="div">
        <div className="relative w-full overflow-hidden">
          {data.image && (
            <Image
              src={data.image}
              alt=""
              width={1600}
              height={500}
              className="absolute inset-0 h-full w-full object-cover"
              priority={false}
            />
          )}
          {/* Subtle overlay so the text stays legible regardless of
           *  the photo. Skip when the section has no image so an
           *  admin who picks bg=background but never uploads still
           *  sees their scheme bg through. */}
          {data.image && (
            <div className="absolute inset-0 bg-black/40" />
          )}
          <div className="relative container mx-auto px-4 py-16 text-center text-white">
            {data.heading && (
              <h2
                data-content-field="heading"
                className="text-3xl font-semibold mb-3"
              >
                {data.heading}
              </h2>
            )}
            {data.body && (
              <div
                className="text-base max-w-2xl mx-auto mb-6"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(data.body) }}
              />
            )}
            {hasCta && (
              <Button asChild>
                <Link href={data.ctaHref ?? "#"}>{data.ctaLabel}</Link>
              </Button>
            )}
          </div>
        </div>
      </SectionWrapper>
    )
  }

  const imageOnLeft = position === "left"
  return (
    <SectionWrapper section={section} as="div">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          {data.image && (
            <div className={imageOnLeft ? "md:order-1" : "md:order-2"}>
              <Image
                src={data.image}
                alt=""
                width={800}
                height={500}
                className="w-full h-auto rounded-md object-cover"
              />
            </div>
          )}
          <div className={imageOnLeft ? "md:order-2" : "md:order-1"}>
            {data.heading && (
              <h2
                data-content-field="heading"
                className="text-2xl font-semibold mb-3"
              >
                {data.heading}
              </h2>
            )}
            {data.body && (
              <div
                className="text-sm mb-5"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichText(data.body),
                }}
              />
            )}
            {hasCta && (
              <Button asChild>
                <Link href={data.ctaHref ?? "#"}>{data.ctaLabel}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

import Link from "next/link"
import Image from "next/image"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface HeaderPromoBannerContent {
  image?: string
  linkHref?: string
  altText?: string
}

export function HeaderPromoBanner({ section }: Props) {
  const data = section.content as HeaderPromoBannerContent
  if (!data.image) return null
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  const img = (
    <div className="relative w-full h-24 md:h-32">
      <Image
        src={data.image}
        alt={data.altText ?? ""}
        fill
        className="object-cover"
      />
    </div>
  )
  return (
    <div className={className} style={style} data-color-scheme={dataColorScheme}>
      {data.linkHref ? <Link href={data.linkHref}>{img}</Link> : img}
    </div>
  )
}

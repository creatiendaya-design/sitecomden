import Link from "next/link"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface AnnouncementBarContent {
  message?: string
  linkHref?: string
  openInNewTab?: boolean
}

export function AnnouncementBar({ section }: Props) {
  const data = section.content as AnnouncementBarContent
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  if (!data.message) return null

  const inner = <span>{data.message}</span>

  return (
    <div
      className={`text-center text-xs md:text-sm py-2 ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
    >
      {data.linkHref ? (
        <Link
          href={data.linkHref}
          target={data.openInNewTab ? "_blank" : undefined}
          rel={data.openInNewTab ? "noopener noreferrer" : undefined}
        >
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  )
}

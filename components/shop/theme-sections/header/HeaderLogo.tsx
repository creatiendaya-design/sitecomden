import Link from "next/link"
import Image from "next/image"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { getSiteSettings } from "@/lib/site-settings"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

export async function HeaderLogo({ section }: Props) {
  const settings = await getSiteSettings()
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  return (
    <div
      className={`container mx-auto px-4 py-3 flex justify-center ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
    >
      <Link href="/">
        {settings.site_logo ? (
          <Image
            src={settings.site_logo}
            alt={settings.site_name}
            width={140}
            height={40}
            className="h-10 w-auto"
            priority
          />
        ) : (
          <span className="text-lg font-bold">{settings.site_name}</span>
        )}
      </Link>
    </div>
  )
}

import { getSiteSettings } from "@/lib/site-settings"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface FooterCopyrightContent {
  text?: string
}

export async function FooterCopyright({ section }: Props) {
  const settings = await getSiteSettings()
  const data = section.content as FooterCopyrightContent
  const text = (
    data.text ?? "© {{year}} {{siteName}}. Todos los derechos reservados."
  )
    .replace("{{year}}", String(new Date().getFullYear()))
    .replace("{{siteName}}", settings.site_name)
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  return (
    <div
      className={`container mx-auto px-4 py-4 text-center text-xs ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
      data-preview-target={`section:${section.id}`}
    >
      {text}
    </div>
  )
}

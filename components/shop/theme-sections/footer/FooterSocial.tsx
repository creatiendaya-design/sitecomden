import { Facebook, Instagram, Twitter, type LucideIcon } from "lucide-react"
import { getSiteSettings } from "@/lib/site-settings"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface FooterSocialContent {
  title?: string
}

interface SocialLink {
  href: string
  Icon: LucideIcon
  label: string
}

export async function FooterSocial({ section }: Props) {
  const settings = await getSiteSettings()
  const data = section.content as FooterSocialContent
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  const candidates: Array<{
    href: string
    Icon: LucideIcon
    label: string
  }> = [
    { href: settings.social_facebook, Icon: Facebook, label: "Facebook" },
    { href: settings.social_instagram, Icon: Instagram, label: "Instagram" },
    { href: settings.social_twitter, Icon: Twitter, label: "Twitter" },
  ]
  const links: SocialLink[] = candidates.filter(
    (l): l is SocialLink => Boolean(l.href),
  )
  if (links.length === 0) return null
  return (
    <div
      className={`container mx-auto px-4 py-6 ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
      data-preview-target={`section:${section.id}`}
    >
      {data.title && (
        <h3 data-content-field="title" className="text-sm font-semibold mb-3 text-center">{data.title}</h3>
      )}
      <div className="flex justify-center gap-4">
        {links.map(({ href, Icon, label }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="hover:text-primary"
          >
            <Icon className="h-5 w-5" />
          </a>
        ))}
      </div>
    </div>
  )
}

import { Facebook, Instagram, Twitter, type LucideIcon } from "lucide-react"
import { getSiteSettings } from "@/lib/site-settings"
import { SubBlockWrapper } from "../../_helpers"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"

interface Props {
  block: ResolvedThemeSectionBlock
}

interface SocialContent {
  title?: string
}

interface SocialLink {
  href: string
  Icon: LucideIcon
  label: string
}

export async function SocialBlock({ block }: Props) {
  const settings = await getSiteSettings()
  const data = block.content as SocialContent
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
    <SubBlockWrapper block={block}>
      {data.title && (
        <h3
          data-content-field="title"
          className="text-sm font-semibold mb-3 text-center"
        >
          {data.title}
        </h3>
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
    </SubBlockWrapper>
  )
}

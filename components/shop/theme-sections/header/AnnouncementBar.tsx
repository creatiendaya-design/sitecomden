import Link from "next/link"
import { cn } from "@/lib/utils"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { BlockStyle } from "@/lib/blocks/types"
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
  const style = section.content.style as BlockStyle | undefined
  const { className, style: inlineStyle, dataColorScheme } =
    applyThemeSectionStyle(style)
  if (!data.message) return null

  // Brand bg/text classes are ALWAYS applied (not conditional on whether
  // a custom bg/text is set). When the admin sets a custom color, the
  // inline `style.backgroundColor` / `color` overrides via specificity.
  // Keeping the class on the element unconditionally is what lets the
  // customizer's live-preview restore the brand fallback by simply
  // clearing the inline style — without re-rendering the section.
  //
  // The chain `bg-brand-bg` → `var(--theme-bg)` continues to follow the
  // active color scheme (rebound via `data-color-scheme`), so picking a
  // different scheme repaints the bar to match that scheme's bg slot.
  // We deliberately use `bg-brand-bg` (not `bg-brand-primary`) so the
  // bar tracks the scheme's first / dominant color — the "bg" dot the
  // admin sees in the scheme picker — instead of the brand accent.
  const inner = <span>{data.message}</span>

  return (
    <div
      className={cn(
        "text-center text-xs md:text-sm py-2",
        "bg-brand-bg text-brand-text",
        className,
      )}
      style={inlineStyle}
      data-color-scheme={dataColorScheme}
      data-preview-target={`section:${section.id}`}
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

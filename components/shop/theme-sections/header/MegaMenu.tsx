import Link from "next/link"
import Image from "next/image"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface MegaMenuPanelContent {
  trigger?: string
  featuredImage?: string
  featuredImageHref?: string
  links?: Array<{ label: string; href: string; openInNewTab?: boolean }>
}

export function MegaMenu({ section }: Props) {
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  return (
    <nav
      className={`hidden md:flex border-t justify-center gap-8 ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
      data-preview-target={`section:${section.id}`}
    >
      {section.blocks.map((block) => {
        const panel = block.content as MegaMenuPanelContent
        return (
          <div key={block.id} className="group relative py-3">
            <button className="text-sm font-medium hover:text-primary">
              {panel.trigger ?? "Menú"}
            </button>
            <div className="absolute left-0 top-full hidden group-hover:flex gap-6 bg-background border shadow-lg p-6 min-w-[400px] z-50">
              {panel.featuredImage && (
                <Link
                  href={panel.featuredImageHref ?? "#"}
                  className="shrink-0"
                >
                  <Image
                    src={panel.featuredImage}
                    alt=""
                    width={160}
                    height={120}
                    className="rounded object-cover"
                  />
                </Link>
              )}
              <ul className="space-y-2 text-sm">
                {(panel.links ?? []).map((link, i) => (
                  <li key={i}>
                    <Link
                      href={link.href}
                      target={link.openInNewTab ? "_blank" : undefined}
                      rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                      className="hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )
      })}
    </nav>
  )
}

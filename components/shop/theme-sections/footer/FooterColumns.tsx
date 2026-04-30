import Link from "next/link"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface FooterColumnsContent {
  aboutTitle?: string
  aboutText?: string
}

interface LinkColumnContent {
  title?: string
  links?: Array<{ label: string; href: string; openInNewTab?: boolean }>
}

interface TextColumnContent {
  title?: string
  body?: string
}

export function FooterColumns({ section }: Props) {
  const data = section.content as FooterColumnsContent
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  return (
    <div
      className={`container mx-auto px-4 py-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
    >
      {(data.aboutTitle || data.aboutText) && (
        <div>
          {data.aboutTitle && (
            <h3 className="mb-4 text-lg font-semibold">{data.aboutTitle}</h3>
          )}
          {data.aboutText && (
            <div
              className="text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{
                __html: sanitizeRichText(data.aboutText),
              }}
            />
          )}
        </div>
      )}
      {section.blocks.map((block) => {
        if (block.type === "LINK_COLUMN") {
          const c = block.content as LinkColumnContent
          return (
            <div key={block.id}>
              {c.title && (
                <h3 className="mb-4 text-lg font-semibold">{c.title}</h3>
              )}
              <ul className="space-y-2 text-sm">
                {(c.links ?? []).map((link, i) => (
                  <li key={i}>
                    <Link
                      href={link.href}
                      target={link.openInNewTab ? "_blank" : undefined}
                      rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                      className="hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        if (block.type === "TEXT_COLUMN") {
          const c = block.content as TextColumnContent
          return (
            <div key={block.id}>
              {c.title && (
                <h3 className="mb-4 text-lg font-semibold">{c.title}</h3>
              )}
              {c.body && (
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichText(c.body),
                  }}
                />
              )}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

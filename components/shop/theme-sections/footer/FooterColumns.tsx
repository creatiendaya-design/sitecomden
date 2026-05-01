import Link from "next/link"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text"
import { getMenuById } from "@/lib/menus/get-menu-by-id"
import { resolveMenuItemHref } from "@/lib/menus/resolve-link"
import type { ResolvedMenu } from "@/lib/menus/resolve-menu"
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
  menuId?: string | null
}

interface TextColumnContent {
  title?: string
  body?: string
}

export async function FooterColumns({ section }: Props) {
  const data = section.content as FooterColumnsContent
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )

  // Resolve every LINK_COLUMN's referenced menu in parallel. The
  // `getMenuById` helper is `unstable_cache`-backed per id, so duplicate
  // ids across columns dedupe to a single Postgres roundtrip.
  const linkColumnMenuIds = section.blocks
    .filter((b) => b.type === "LINK_COLUMN")
    .map((b) => (b.content as LinkColumnContent).menuId)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
  const uniqueIds = Array.from(new Set(linkColumnMenuIds))
  const resolvedMenus = await Promise.all(uniqueIds.map((id) => getMenuById(id)))
  const menuById = new Map<string, ResolvedMenu>(
    resolvedMenus
      .filter((m): m is ResolvedMenu => m !== null)
      .map((m) => [m.id, m]),
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
          const menu = c.menuId ? (menuById.get(c.menuId) ?? null) : null
          // Top-level items only — the column already has its own title,
          // so we don't need a second level of grouping.
          const items = menu?.items ?? []
          return (
            <div key={block.id}>
              {c.title && (
                <h3 className="mb-4 text-lg font-semibold">{c.title}</h3>
              )}
              {items.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {items.map((item) => {
                    const href = resolveMenuItemHref(item)
                    if (!href) return null
                    const isExternal = item.linkType === "EXTERNAL_URL"
                    return (
                      <li key={item.id}>
                        {isExternal ? (
                          <a
                            href={href}
                            target={item.openInNewTab ? "_blank" : undefined}
                            rel={
                              item.openInNewTab
                                ? "noopener noreferrer"
                                : undefined
                            }
                            className="hover:underline"
                          >
                            {item.label}
                          </a>
                        ) : (
                          <Link
                            href={href}
                            target={item.openInNewTab ? "_blank" : undefined}
                            className="hover:underline"
                          >
                            {item.label}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
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

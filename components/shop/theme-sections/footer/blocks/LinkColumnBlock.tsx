import Link from "next/link"
import { resolveMenuItemHref } from "@/lib/menus/resolve-link"
import type { ResolvedMenu } from "@/lib/menus/resolve-menu"
import { SubBlockWrapper } from "../../_helpers"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"

interface Props {
  block: ResolvedThemeSectionBlock
  menu: ResolvedMenu | null
}

interface LinkColumnContent {
  title?: string
  menuId?: string | null
}

export function LinkColumnBlock({ block, menu }: Props) {
  const c = block.content as LinkColumnContent
  const items = menu?.items ?? []
  return (
    <SubBlockWrapper block={block}>
      {c.title && (
        <h3
          data-content-field="title"
          className="mb-4 text-lg font-semibold"
        >
          {c.title}
        </h3>
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
                      item.openInNewTab ? "noopener noreferrer" : undefined
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
    </SubBlockWrapper>
  )
}

// Re-export the content shape so FooterRoot can read menuIds for parallel
// menu fetching without duplicating the type definition.
export type { LinkColumnContent }

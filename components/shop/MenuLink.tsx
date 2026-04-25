import Link from "next/link"
import { resolveMenuItemHref, type ResolvableMenuItem } from "@/lib/menus/resolve-link"

interface Props {
  item: ResolvableMenuItem & {
    label: string
    openInNewTab: boolean
  }
  className?: string
  children?: React.ReactNode
}

/**
 * Renders a menu item as the right kind of element:
 *  - Internal link (PAGE / PRODUCT / CATEGORY / HOME / *_INDEX) → next/link
 *  - External link (EXTERNAL_URL) → <a> with rel="noopener noreferrer"
 *  - Items whose target is missing (deleted page, empty URL) → null
 *
 * The caller can pass `children` to override the displayed text (e.g. when
 * the parent wants to inject icons or wrap the label). Default text = item.label.
 */
export function MenuLink({ item, className, children }: Props) {
  const href = resolveMenuItemHref(item)
  if (!href) return null

  const label = children ?? item.label
  const isExternal = item.linkType === "EXTERNAL_URL"

  if (isExternal) {
    return (
      <a
        href={href}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noopener noreferrer" : undefined}
        className={className}
      >
        {label}
      </a>
    )
  }

  return (
    <Link
      href={href}
      target={item.openInNewTab ? "_blank" : undefined}
      className={className}
    >
      {label}
    </Link>
  )
}

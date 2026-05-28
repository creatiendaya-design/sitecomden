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

  // Storefront perf: items inside collapsed dropdown panels (HeaderNavMenu,
  // MobileMenu) start with `opacity-0 pointer-events-none`, which suppresses
  // Next.js' viewport-based prefetch heuristic. Forcing `prefetch={true}`
  // makes the router prefetch them as soon as the Link mounts, so the page
  // is already warm when the user actually clicks. Skipped for items that
  // open in a new tab (no client-side navigation happens).
  return (
    <Link
      href={href}
      target={item.openInNewTab ? "_blank" : undefined}
      prefetch={item.openInNewTab ? undefined : true}
      className={className}
    >
      {label}
    </Link>
  )
}

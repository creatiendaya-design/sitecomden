/**
 * Storefront helper: resolves a MenuItem to its final href.
 *
 * Returns null when the target is missing (e.g. Page deleted, externalUrl
 * empty). Callers should hide such items in the rendered menu rather than
 * rendering broken links.
 */
export type MenuLinkType =
  | "PAGE"
  | "PRODUCT"
  | "CATEGORY"
  | "EXTERNAL_URL"
  | "HOME"
  | "PRODUCTS_INDEX"
  | "COLLECTIONS_INDEX"

export interface ResolvableMenuItem {
  linkType: string
  targetId: string | null
  externalUrl: string | null
  /** Pre-joined slug fields, populated when the menu is fetched via
   *  `getMenuBySlug`. Avoids a per-item DB lookup at render time. */
  pageSlug?: string | null
  productSlug?: string | null
  categorySlug?: string | null
}

export function resolveMenuItemHref(item: ResolvableMenuItem): string | null {
  switch (item.linkType as MenuLinkType) {
    case "HOME":
      return "/"
    case "PRODUCTS_INDEX":
      return "/productos"
    case "COLLECTIONS_INDEX":
      return "/categoria"
    case "EXTERNAL_URL":
      return item.externalUrl || null
    case "PAGE":
      return item.pageSlug ? `/${item.pageSlug}` : null
    case "PRODUCT":
      return item.productSlug ? `/productos/${item.productSlug}` : null
    case "CATEGORY":
      return item.categorySlug ? `/categoria/${item.categorySlug}` : null
    default:
      return null
  }
}

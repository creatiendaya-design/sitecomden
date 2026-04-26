import { resolveActiveTheme } from "./resolve-active-theme"
import { fetchPageWithBlocks } from "@/lib/pages/fetch-page-with-blocks"

export interface ActiveThemeCart {
  pageId: string
  slug: string
  title: string
  blocks: {
    id: string
    type: string
    position: number
    content: unknown
  }[]
}

/**
 * Returns the page assigned as the active (or previewed) theme's cart-blocks
 * wrapper, with its blocks pre-loaded. Null when:
 *   - the resolved theme has no cartPageId,
 *   - the assigned page is inactive or has been deleted.
 *
 * The /carrito route renders these blocks ABOVE the cart UI; falling back to
 * null means the page renders just the cart UI as before (Plan 10).
 *
 * Preview-aware via resolveActiveTheme. Plan 12 caches the page fetch.
 */
export async function getActiveThemeCart(): Promise<ActiveThemeCart | null> {
  const theme = await resolveActiveTheme()
  if (!theme?.cartPageId) return null

  const page = await fetchPageWithBlocks(theme.cartPageId)

  if (!page || !page.active) return null

  return {
    pageId: page.id,
    slug: page.slug,
    title: page.title,
    blocks: page.pageBlocks,
  }
}

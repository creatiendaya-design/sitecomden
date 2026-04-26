import { resolveActiveTheme } from "./resolve-active-theme"
import { fetchPageWithBlocks } from "@/lib/pages/fetch-page-with-blocks"

export interface ActiveThemeHome {
  pageId: string
  slug: string
  title: string
  description: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoImage: string | null
  noIndex: boolean
  blocks: {
    id: string
    type: string
    position: number
    content: unknown
  }[]
}

/**
 * Fetches the page assigned as home on the currently active (or previewed)
 * theme, with its blocks already loaded. Returns null when:
 *   - there is no active theme,
 *   - the resolved theme has no homePageId,
 *   - the assigned page is inactive or has been deleted.
 *
 * The storefront route at `/` calls this and falls back to the legacy
 * hardcoded home layout when this returns null, so the system is safe even
 * before any seed runs. Plan 9 made this preview-aware. Plan 12 caches
 * the inner fetchPageWithBlocks() so repeat visits skip the DB.
 */
export async function getActiveThemeHome(): Promise<ActiveThemeHome | null> {
  const theme = await resolveActiveTheme()
  if (!theme?.homePageId) return null

  const page = await fetchPageWithBlocks(theme.homePageId)

  if (!page || !page.active) return null

  return {
    pageId: page.id,
    slug: page.slug,
    title: page.title,
    description: page.description,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    seoImage: page.seoImage,
    noIndex: page.noIndex,
    blocks: page.pageBlocks,
  }
}

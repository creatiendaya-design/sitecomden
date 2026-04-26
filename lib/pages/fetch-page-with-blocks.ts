import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"

export interface PageWithBlocksRow {
  id: string
  slug: string
  title: string
  description: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoImage: string | null
  noIndex: boolean
  active: boolean
  pageBlocks: {
    id: string
    type: string
    position: number
    content: unknown
  }[]
}

/**
 * Plan 12 perf: cached fetch for a Page row + its blocks by id.
 *
 * Used by home (Plan 6) and cart (Plan 10) resolvers, both of which look
 * up a Page after the active/preview theme exposes its assigned id. The
 * id stays stable across requests, making it a perfect cache key.
 *
 * Tags:
 *   - `page-blocks:<id>`: bumped by actions/pages.ts when blocks save.
 *   - `page:<slug>`: bumped by actions/pages.ts on metadata edits.
 *   - `active-theme-home` / `active-theme-cart`: umbrella tags bumped on
 *     theme switch or when admin reassigns the home/cart pointer.
 *
 * The page slug isn't known at cache-time (we only have the id), so we
 * also bump on the umbrella tags to cover slug renames.
 */
function fetchPageWithBlocksUncached(
  id: string,
): Promise<PageWithBlocksRow | null> {
  return prisma.page.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      seoTitle: true,
      seoDescription: true,
      seoImage: true,
      noIndex: true,
      active: true,
      pageBlocks: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          type: true,
          position: true,
          content: true,
        },
      },
    },
  })
}

export const fetchPageWithBlocks = (id: string) =>
  unstable_cache(
    () => fetchPageWithBlocksUncached(id),
    ["page-with-blocks", id],
    {
      tags: [
        `page-blocks:${id}`,
        "active-theme-home",
        "active-theme-cart",
      ],
    },
  )()

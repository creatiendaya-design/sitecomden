import { prisma } from "@/lib/db"
import { resolveActiveTheme } from "./resolve-active-theme"

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
 * Preview-aware via resolveActiveTheme.
 */
export async function getActiveThemeCart(): Promise<ActiveThemeCart | null> {
  const theme = await resolveActiveTheme()
  if (!theme?.cartPageId) return null

  const page = await prisma.page.findUnique({
    where: { id: theme.cartPageId },
    select: {
      id: true,
      slug: true,
      title: true,
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

  if (!page || !page.active) return null

  return {
    pageId: page.id,
    slug: page.slug,
    title: page.title,
    blocks: page.pageBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      position: b.position,
      content: b.content,
    })),
  }
}

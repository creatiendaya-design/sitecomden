import { prisma } from "@/lib/db"
import type { ResolvableMenuItem } from "./resolve-link"

export interface ResolvedMenuItem extends ResolvableMenuItem {
  id: string
  label: string
  openInNewTab: boolean
  position: number
  children: ResolvedMenuItem[]
}

export interface ResolvedMenu {
  id: string
  slug: string
  title: string
  items: ResolvedMenuItem[]
}

interface MenuRow {
  id: string
  slug: string
  title: string
  items: {
    id: string
    parentId: string | null
    position: number
    label: string
    linkType: string
    targetId: string | null
    externalUrl: string | null
    openInNewTab: boolean
  }[]
}

/**
 * Resolves a Menu row (with its items pre-loaded) into a render-ready tree.
 * Pre-joins target slugs (Page/Product/Category) so `resolveMenuItemHref`
 * doesn't need to hit the DB at render time.
 *
 * Used by both `getMenuBySlug` (legacy slug-based fetch) and `getThemedMenu`
 * (Plan 9 theme-aware fetch).
 */
export async function resolveMenuFromRow(menu: MenuRow): Promise<ResolvedMenu> {
  const pageIds = [
    ...new Set(
      menu.items
        .filter((i) => i.linkType === "PAGE" && i.targetId)
        .map((i) => i.targetId!),
    ),
  ]
  const productIds = [
    ...new Set(
      menu.items
        .filter((i) => i.linkType === "PRODUCT" && i.targetId)
        .map((i) => i.targetId!),
    ),
  ]
  const categoryIds = [
    ...new Set(
      menu.items
        .filter((i) => i.linkType === "CATEGORY" && i.targetId)
        .map((i) => i.targetId!),
    ),
  ]

  const [pages, products, categories] = await Promise.all([
    pageIds.length > 0
      ? prisma.page.findMany({
          where: { id: { in: pageIds } },
          select: { id: true, slug: true },
        })
      : [],
    productIds.length > 0
      ? prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, slug: true },
        })
      : [],
    categoryIds.length > 0
      ? prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, slug: true },
        })
      : [],
  ])
  const pageSlug = new Map(pages.map((p) => [p.id, p.slug]))
  const productSlug = new Map(products.map((p) => [p.id, p.slug]))
  const categorySlug = new Map(categories.map((c) => [c.id, c.slug]))

  const byId = new Map<string, ResolvedMenuItem>()
  for (const it of menu.items) {
    byId.set(it.id, {
      id: it.id,
      label: it.label,
      linkType: it.linkType,
      targetId: it.targetId,
      externalUrl: it.externalUrl,
      openInNewTab: it.openInNewTab,
      position: it.position,
      pageSlug:
        it.linkType === "PAGE"
          ? pageSlug.get(it.targetId ?? "") ?? null
          : null,
      productSlug:
        it.linkType === "PRODUCT"
          ? productSlug.get(it.targetId ?? "") ?? null
          : null,
      categorySlug:
        it.linkType === "CATEGORY"
          ? categorySlug.get(it.targetId ?? "") ?? null
          : null,
      children: [],
    })
  }
  const roots: ResolvedMenuItem[] = []
  for (const it of menu.items) {
    const node = byId.get(it.id)!
    if (it.parentId) {
      const parent = byId.get(it.parentId)
      if (parent) parent.children.push(node)
      // Orphans surface at root level rather than being silently dropped.
      else roots.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortByPos = (a: ResolvedMenuItem, b: ResolvedMenuItem) =>
    a.position - b.position
  roots.sort(sortByPos)
  for (const node of byId.values()) node.children.sort(sortByPos)

  return {
    id: menu.id,
    slug: menu.slug,
    title: menu.title,
    items: roots,
  }
}

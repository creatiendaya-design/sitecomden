import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"

export interface RootCategoryOption {
  id: string
  name: string
  slug: string
}

/**
 * Storefront perf: the Header renders on every navigation, and the
 * "All Categories" pill (SearchPill) dropdown reads the active root
 * categories. Without caching, every menu click re-ran this query.
 *
 * Tag `categories:active` is invalidated by the admin create / update /
 * delete category routes via `updateTag()`.
 */
export const getActiveRootCategories = unstable_cache(
  async (): Promise<RootCategoryOption[]> => {
    return prisma.category.findMany({
      where: { active: true, parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    })
  },
  ["active-root-categories"],
  { tags: ["categories:active"] },
)

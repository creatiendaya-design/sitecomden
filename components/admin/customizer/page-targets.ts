import type { PageRow } from "@/actions/pages"

/**
 * What the iframe in the customizer should preview. Mirrors Shopify's
 * page-type selector at the top of the theme editor.
 *
 * Each target produces a storefront URL. We resolve specific products /
 * categories / pages from the data passed to the customizer (so the
 * picker submenu shows real items).
 */
export type PageTargetKey =
  | "home"
  | "cart"
  | "products-index"
  | "product"
  | "category"
  | "page"

export interface PageTarget {
  key: string
  label: string
  /** Path to load in the preview iframe (without query params). */
  path: string
  /** Group label for the dropdown grouping. */
  group: string
  /** When true, the target is a "specific item" the admin picked from a
   *  submenu (a specific product, category, or page). */
  isSpecific?: boolean
}

interface BuildArgs {
  pages: PageRow[]
  /** Sample product slug (newest active). Optional — falls back to
   *  /productos when no products exist. */
  sampleProductSlug?: string | null
  /** Sample category slug (lowest order). Optional. */
  sampleCategorySlug?: string | null
}

export function buildPageTargets({
  pages,
  sampleProductSlug,
  sampleCategorySlug,
}: BuildArgs): PageTarget[] {
  const targets: PageTarget[] = [
    {
      key: "home",
      label: "Página de inicio",
      path: "/",
      group: "Plantillas",
    },
    {
      key: "cart",
      label: "Carrito",
      path: "/carrito",
      group: "Plantillas",
    },
    {
      key: "products-index",
      label: "Todos los productos",
      path: "/productos",
      group: "Plantillas",
    },
  ]

  if (sampleProductSlug) {
    targets.push({
      key: "product",
      label: "Producto (ejemplo)",
      path: `/productos/${sampleProductSlug}`,
      group: "Plantillas",
      isSpecific: true,
    })
  }

  if (sampleCategorySlug) {
    targets.push({
      key: "category",
      label: "Categoría (ejemplo)",
      path: `/categoria/${sampleCategorySlug}`,
      group: "Plantillas",
      isSpecific: true,
    })
  }

  // One entry per active Page so admin can pick a specific static page
  // from the submenu (Nosotros, FAQ, etc.).
  for (const p of pages.filter((pg) => pg.active)) {
    targets.push({
      key: `page:${p.id}`,
      label: p.title,
      path: `/${p.slug}`,
      group: "Páginas",
      isSpecific: true,
    })
  }

  return targets
}

export function findTarget(
  targets: PageTarget[],
  key: string,
): PageTarget | null {
  return targets.find((t) => t.key === key) ?? targets[0] ?? null
}

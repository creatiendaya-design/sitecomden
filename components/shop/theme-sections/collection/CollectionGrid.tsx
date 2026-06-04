import type { CSSProperties } from "react"
import Link from "next/link"
import { PackageSearch, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ProductCard from "@/components/shop/ProductCard"
import { cn } from "@/lib/utils"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import { SectionWrapper } from "../_helpers"

/**
 * Plan 19 — Products-index (collection) grid section.
 *
 * The actual product / category data is fetched by the page and handed in
 * as props (the section only carries presentation choices: heading,
 * sidebar/sort toggles, column counts). This keeps the section a pure
 * renderer while the page owns the Prisma queries + searchParam filtering.
 */

export interface CollectionGridProduct {
  id: string
  name: string
  slug: string
  basePrice: number
  compareAtPrice: number | null
  images: unknown
  hasVariants: boolean
  featured: boolean
  stock?: number
  [key: string]: unknown
}

export interface CollectionGridCategory {
  id: string
  name: string
  slug: string
  _count: { products: number }
}

export interface CollectionGridFilters {
  category?: string
  search?: string
  sort: string
}

interface CollectionGridContent {
  heading?: string
  showCount?: boolean
  showSidebar?: boolean
  showSort?: boolean
  columnsDesktop?: number
  columnsMobile?: number
}

interface CollectionGridProps {
  section: ResolvedThemeSection
  products: CollectionGridProduct[]
  categories: CollectionGridCategory[]
  filters: CollectionGridFilters
}

export function CollectionGrid({
  section,
  products,
  categories,
  filters,
}: CollectionGridProps) {
  const content = section.content as CollectionGridContent
  const heading = content.heading?.trim() || "Productos"
  const showCount = content.showCount !== false
  const showSidebar = content.showSidebar !== false
  const showSort = content.showSort !== false
  const columnsDesktop = clampInt(content.columnsDesktop, 2, 5, 3)
  const columnsMobile = clampInt(content.columnsMobile, 1, 2, 2)

  const { category, search } = filters
  const activeCategoryName = category
    ? categories.find((c) => c.slug === category)?.name
    : undefined

  const gridStyle: CSSProperties = {
    ["--cols-d" as string]: String(columnsDesktop),
    ["--cols-m" as string]: String(columnsMobile),
  }

  return (
    <SectionWrapper
      section={section}
      as="section"
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12"
    >
      <div className="mb-8">
        <h1
          className="text-3xl font-bold tracking-tight"
          data-content-field="heading"
        >
          {heading}
        </h1>
        {showCount && (
          <p className="text-muted-foreground">
            {products.length}{" "}
            {products.length === 1 ? "producto" : "productos"}
          </p>
        )}
      </div>

      <div
        className={cn(
          "grid gap-8",
          showSidebar && "lg:grid-cols-[240px_1fr]",
        )}
      >
        {showSidebar && (
          <aside className="hidden lg:block space-y-6">
            <div>
              <h3 className="mb-4 font-semibold">Categorías</h3>
              <div className="space-y-2">
                <Link
                  href="/productos"
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                    !category && "bg-muted font-medium",
                  )}
                >
                  <span>Todos</span>
                  <span className="text-xs text-muted-foreground">
                    {products.length}
                  </span>
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/productos?category=${cat.slug}`}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                      category === cat.slug && "bg-muted font-medium",
                    )}
                  >
                    <span>{cat.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {cat._count.products}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        )}

        <div>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between lg:justify-start">
              <p className="text-sm text-muted-foreground">
                {activeCategoryName ? (
                  <>
                    Mostrando{" "}
                    <span className="font-medium">{activeCategoryName}</span>
                  </>
                ) : (
                  `${products.length} productos`
                )}
              </p>

              <div className="lg:hidden">
                <CategoryMobileSelect
                  categories={categories}
                  currentCategory={category}
                />
              </div>
            </div>

            {showSort && (
              <SortSelect currentSort={filters.sort} category={category} />
            )}
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                {search ? (
                  <SearchX className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <PackageSearch className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <h2 className="mb-2 text-xl font-semibold">
                {search
                  ? "Sin resultados para tu búsqueda"
                  : category
                    ? "Sin productos en esta categoría"
                    : "No hay productos disponibles"}
              </h2>
              <p className="mb-6 max-w-sm text-muted-foreground">
                {search ? (
                  <>
                    No encontramos productos para{" "}
                    <span className="font-medium text-foreground">
                      &ldquo;{search}&rdquo;
                    </span>
                    . Intenta con otro término o explora todas las categorías.
                  </>
                ) : category ? (
                  "Pronto agregaremos nuevos artículos a esta categoría."
                ) : (
                  "Pronto habrá productos disponibles."
                )}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {(search || category) && (
                  <Button asChild>
                    <Link href="/productos">Ver todos los productos</Link>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href="/">Ir al inicio</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div
              style={gridStyle}
              className={cn(
                "grid gap-3 sm:gap-6",
                "[grid-template-columns:repeat(var(--cols-m),minmax(0,1fr))]",
                "lg:[grid-template-columns:repeat(var(--cols-d),minmax(0,1fr))]",
              )}
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  )
}

function SortSelect({
  currentSort,
  category,
}: {
  currentSort: string
  category?: string
}) {
  return (
    <form action="/productos" method="get" className="flex items-center gap-2">
      {category && <input type="hidden" name="category" value={category} />}
      <Select name="sort" defaultValue={currentSort}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Más reciente</SelectItem>
          <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
          <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
          <SelectItem value="name">Nombre A-Z</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" size="sm">
        Aplicar
      </Button>
    </form>
  )
}

function CategoryMobileSelect({
  categories,
  currentCategory,
}: {
  categories: CollectionGridCategory[]
  currentCategory?: string
}) {
  return (
    <form action="/productos" method="get">
      <Select name="category" defaultValue={currentCategory || "all"}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.slug}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  )
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.round(n), min), max)
}

"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ChevronDown,
  Loader2,
  Package,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/useDebounce"

interface Category {
  id: string
  name: string
  slug: string
}

interface SearchResult {
  id: string
  name: string
  slug: string
  basePrice: number
  images: string[]
  category: { name: string; slug: string } | null
}

interface Props {
  categories: Category[]
}

const ALL_CATEGORIES = "__all__"

/**
 * NEXVO-style pill search: rounded-full container with a "All Categories"
 * dropdown on the left, a borderless search input in the middle, and a
 * search button on the right. Selecting a category scopes the redirect to
 * /categoria/<slug>?search=... ; otherwise routes to /productos?search=...
 *
 * Visual styling is intentionally theme-neutral: the pill uses solid
 * white with dark text so it stays readable against any header bg the
 * admin picks (dark, light, custom). The active scheme on the parent
 * still affects the header bar around it.
 */
export default function SearchPill({ categories }: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selected, setSelected] = useState<string>(ALL_CATEGORIES)
  const [openCategories, setOpenCategories] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debouncedQuery = useDebounce(query, 300)

  // Close popovers on outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpenCategories(false)
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () =>
      document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Debounced product search.
  useEffect(() => {
    async function run() {
      if (debouncedQuery.length < 2) {
        setResults([])
        setShowResults(false)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
        )
        const data = await res.json()
        setResults(data.products || [])
        setShowResults(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [debouncedQuery])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    const params = new URLSearchParams({ search: query.trim() })
    const base =
      selected === ALL_CATEGORIES
        ? "/productos"
        : `/categoria/${selected}`
    router.push(`${base}?${params.toString()}`)
    setShowResults(false)
    setQuery("")
  }

  const selectedLabel =
    selected === ALL_CATEGORIES
      ? "All Categories"
      : categories.find((c) => c.slug === selected)?.name ?? "All Categories"

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form
        onSubmit={handleSubmit}
        className="flex h-11 w-full items-center rounded-full bg-white pl-1 pr-1 text-slate-900 shadow-sm ring-1 ring-black/5"
      >
        {/* Category dropdown trigger */}
        <button
          type="button"
          onClick={() => setOpenCategories((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={openCategories}
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors",
            "hover:bg-slate-100",
          )}
        >
          <span className="truncate max-w-[140px]">{selectedLabel}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 opacity-60 transition-transform",
              openCategories && "rotate-180",
            )}
          />
        </button>

        {/* Divider */}
        <span className="mx-1 h-5 w-px bg-slate-200" />

        {/* Search input */}
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowResults(true)
          }}
          placeholder="What are you looking for?"
          aria-label="Buscar productos"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-slate-400"
        />

        {/* Submit (search icon) */}
        <button
          type="submit"
          aria-label="Buscar"
          className="ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-colors hover:bg-slate-800"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </form>

      {/* Category dropdown panel */}
      {openCategories && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 max-h-80 w-56 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <DropdownItem
            label="All Categories"
            active={selected === ALL_CATEGORIES}
            onClick={() => {
              setSelected(ALL_CATEGORIES)
              setOpenCategories(false)
              inputRef.current?.focus()
            }}
          />
          {categories.map((cat) => (
            <DropdownItem
              key={cat.id}
              label={cat.name}
              active={selected === cat.slug}
              onClick={() => {
                setSelected(cat.slug)
                setOpenCategories(false)
                inputRef.current?.focus()
              }}
            />
          ))}
        </div>
      )}

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-[400px] w-full overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="p-2">
            {results.map((product) => {
              const imageUrl = product.images?.[0] ?? null
              return (
                <Link
                  key={product.id}
                  href={`/productos/${product.slug}`}
                  onClick={() => {
                    setShowResults(false)
                    setQuery("")
                  }}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border bg-slate-100">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>
                    {product.category && (
                      <p className="text-xs text-muted-foreground">
                        {product.category.name}
                      </p>
                    )}
                  </div>
                  <p className="text-right text-sm font-semibold">
                    S/ {product.basePrice.toFixed(2)}
                  </p>
                </Link>
              )
            })}
          </div>
          <div className="border-t p-2">
            <Link
              href={`/productos?search=${encodeURIComponent(query)}`}
              onClick={() => {
                setShowResults(false)
                setQuery("")
              }}
              className="block w-full rounded-lg p-2 text-center text-sm font-medium text-primary transition-colors hover:bg-muted"
            >
              Ver todos los resultados ({results.length})
            </Link>
          </div>
        </div>
      )}

      {showResults &&
        results.length === 0 &&
        debouncedQuery.length >= 2 &&
        !loading && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
            <p className="text-center text-sm text-muted-foreground">
              No se encontraron productos para &quot;{debouncedQuery}&quot;
            </p>
          </div>
        )}
    </div>
  )
}

function DropdownItem({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "block w-full rounded px-2 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
    </button>
  )
}

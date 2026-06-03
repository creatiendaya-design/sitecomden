"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ChevronRight,
  Link2,
  Loader2,
  Search,
  Tag,
  ShoppingBag,
  FileText,
  ScrollText,
  Home,
  X,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  browseLinkTargets,
  searchLinkTargets,
  type LinkTarget,
  type LinkTargetKind,
} from "@/actions/link-picker"

interface Props {
  value: unknown
  onChange: (v: unknown) => void
  label?: string
  helpText?: string
}

const DEFAULT_LABEL = "Enlace"

interface ShortcutOption {
  label: string
  url: string
  icon: typeof Home
}

const SHORTCUTS: ShortcutOption[] = [
  { label: "Página de inicio", url: "/", icon: Home },
  { label: "Todos los productos", url: "/productos", icon: ShoppingBag },
  { label: "Todas las categorías", url: "/categoria", icon: Tag },
  { label: "Carrito", url: "/carrito", icon: ShoppingBag },
  { label: "Contacto", url: "/contacto", icon: FileText },
]

const KIND_META: Record<
  LinkTargetKind,
  { label: string; icon: typeof Tag; emptyLabel: string }
> = {
  category: {
    label: "Categorías",
    icon: Tag,
    emptyLabel: "Sin categorías activas",
  },
  product: {
    label: "Productos",
    icon: ShoppingBag,
    emptyLabel: "Sin productos activos",
  },
  page: {
    label: "Páginas",
    icon: FileText,
    emptyLabel: "Sin páginas activas",
  },
  policy: {
    label: "Políticas",
    icon: ScrollText,
    emptyLabel: "Sin políticas activas",
  },
}

const KIND_ORDER: LinkTargetKind[] = ["category", "product", "page", "policy"]

const BROWSE_PAGE_SIZE = 25

/**
 * Shopify-style unified link picker. Stores a plain URL string so it stays
 * drop-in compatible with any field declared as a URL/string.
 *
 * UX (two-pane):
 *  - **Main pane**: URL input + shortcuts + entry rows per kind (Productos,
 *    Categorías, Páginas, Políticas). Each entry row has a chevron and
 *    drills into the browse pane.
 *  - **Browse pane**: dedicated search across one kind, with "N resultados"
 *    header and "Volver" button — mirrors Shopify's "All products" pane.
 *  - Manual URL input always available on the left for external links.
 */
export function LinkUrlField({ value, onChange, label, helpText }: Props) {
  const current = typeof value === "string" ? value : ""
  const resolvedLabel = label ?? DEFAULT_LABEL

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"main" | LinkTargetKind>("main")

  // Reset to main view whenever the popover closes so re-opening starts
  // fresh — matches Shopify's behavior and avoids stale browse state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setView("main")
  }, [open])

  const pickUrl = (url: string) => {
    onChange(url || undefined)
    setOpen(false)
  }

  const clear = () => onChange(undefined)

  return (
    <div>
      <Label className="text-xs mb-1 block">{resolvedLabel}</Label>

      <div className="flex items-stretch gap-1">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={current}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder="/productos o https://..."
            className="pl-7 pr-8 text-sm"
          />
          {current ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Quitar enlace"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 text-xs"
            >
              Examinar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            {view === "main" ? (
              <MainPane
                currentUrl={current}
                onDrill={(kind) => setView(kind)}
                onPick={pickUrl}
              />
            ) : (
              <BrowsePane
                kind={view}
                currentUrl={current}
                onBack={() => setView("main")}
                onPick={pickUrl}
              />
            )}
          </PopoverContent>
        </Popover>
      </div>

      {helpText ? (
        <p className="text-[11px] text-muted-foreground mt-1">{helpText}</p>
      ) : null}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Main pane                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

interface MainPaneProps {
  currentUrl: string
  onDrill: (kind: LinkTargetKind) => void
  onPick: (url: string) => void
}

function MainPane({ currentUrl, onDrill, onPick }: MainPaneProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LinkTarget[]>([])
  const [loading, setLoading] = useState(false)

  // Only run the mixed search when the admin actually types something —
  // the empty state shows shortcuts + drill-in entries instead.
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    const handle = setTimeout(() => {
      searchLinkTargets(q, 5)
        .then((rows) => {
          if (cancelled) return
          setResults(rows)
        })
        .catch(() => {
          if (cancelled) return
          setResults([])
        })
        .finally(() => {
          if (cancelled) return
          setLoading(false)
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query])

  const grouped = useMemo(() => {
    const acc: Record<LinkTargetKind, LinkTarget[]> = {
      category: [],
      product: [],
      page: [],
      policy: [],
    }
    for (const row of results) acc[row.kind].push(row)
    return acc
  }, [results])

  const isSearching = query.trim() !== ""

  return (
    <>
      <div className="border-b p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto, categoría, página…"
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>

      <div className="max-h-[380px] overflow-y-auto">
        {!isSearching ? (
          <>
            <PickerGroup label="Atajos">
              {SHORTCUTS.map((s) => {
                const Icon = s.icon
                return (
                  <PickerRow
                    key={s.url}
                    onClick={() => onPick(s.url)}
                    icon={<Icon className="h-3.5 w-3.5" />}
                    label={s.label}
                    hint={s.url}
                    active={currentUrl === s.url}
                  />
                )
              })}
            </PickerGroup>

            <PickerGroup label="Explorar">
              {KIND_ORDER.map((kind) => {
                const meta = KIND_META[kind]
                const Icon = meta.icon
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => onDrill(kind)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 font-medium">{meta.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )
              })}
            </PickerGroup>
          </>
        ) : (
          <>
            {loading && results.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              KIND_ORDER.map((kind) => {
                const rows = grouped[kind]
                if (rows.length === 0) return null
                const Icon = KIND_META[kind].icon
                return (
                  <PickerGroup key={kind} label={KIND_META[kind].label}>
                    {rows.map((row) => (
                      <PickerRow
                        key={`${row.kind}:${row.id}`}
                        onClick={() => onPick(row.url)}
                        icon={
                          row.image ? (
                            <ThumbImage src={row.image} />
                          ) : (
                            <Icon className="h-3.5 w-3.5" />
                          )
                        }
                        label={row.label}
                        hint={row.hint}
                        active={currentUrl === row.url}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => onDrill(kind)}
                      className="flex w-full items-center gap-1 px-3 py-1.5 text-[11px] text-blue-600 hover:bg-muted hover:text-blue-700"
                    >
                      Ver todos los{" "}
                      {KIND_META[kind].label.toLowerCase()}{" "}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </PickerGroup>
                )
              })
            )}

            {!loading && results.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Sin resultados para “{query}”.
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Browse pane (drill-down for a single kind)                                 */
/* ────────────────────────────────────────────────────────────────────────── */

interface BrowsePaneProps {
  kind: LinkTargetKind
  currentUrl: string
  onBack: () => void
  onPick: (url: string) => void
}

function BrowsePane({ kind, currentUrl, onBack, onPick }: BrowsePaneProps) {
  const meta = KIND_META[kind]
  const Icon = meta.icon

  const [query, setQuery] = useState("")
  const [rows, setRows] = useState<LinkTarget[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [limit, setLimit] = useState(BROWSE_PAGE_SIZE)
  const [loading, setLoading] = useState(false)

  // Reset paging whenever the search query changes — otherwise an admin
  // who paginates then searches keeps the larger page size for no reason.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(BROWSE_PAGE_SIZE)
  }, [query])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const handle = setTimeout(() => {
      browseLinkTargets(kind, query, limit)
        .then((res) => {
          if (cancelled) return
          setRows(res.rows)
          setTotal(res.total)
          setHasMore(res.hasMore)
        })
        .catch(() => {
          if (cancelled) return
          setRows([])
          setTotal(0)
          setHasMore(false)
        })
        .finally(() => {
          if (cancelled) return
          setLoading(false)
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [kind, query, limit])

  return (
    <>
      <div className="flex items-center gap-1 border-b p-1.5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-sm px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {loading && rows.length === 0
            ? "…"
            : `${total} ${total === 1 ? "resultado" : "resultados"}`}
        </span>
      </div>

      <div className="border-b p-2">
        <div className="mb-2 flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">{meta.label}</span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar en ${meta.label.toLowerCase()}…`}
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>

      <div className="max-h-[340px] overflow-y-auto">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            {query.trim()
              ? `Sin resultados para “${query}”.`
              : meta.emptyLabel}
          </p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li key={`${row.kind}:${row.id}`}>
                <PickerRow
                  onClick={() => onPick(row.url)}
                  icon={
                    row.image ? (
                      <ThumbImage src={row.image} />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )
                  }
                  label={row.label}
                  hint={row.hint}
                  active={currentUrl === row.url}
                />
              </li>
            ))}
            {hasMore && (
              <li>
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + BROWSE_PAGE_SIZE)}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-1 px-3 py-2 text-[11px] text-blue-600 hover:bg-muted hover:text-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Cargar más
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Shared primitives                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function PickerGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="py-1">
      <p className="px-3 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

function PickerRow({
  onClick,
  icon,
  label,
  hint,
  active,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  hint?: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted",
        active && "bg-muted/70 font-medium",
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {hint ? (
        <span className="truncate text-[10px] text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </button>
  )
}

function ThumbImage({ src }: { src: string }) {
  return (
    <span className="relative h-5 w-5 overflow-hidden rounded bg-muted">
      <Image
        src={src}
        alt=""
        fill
        sizes="20px"
        className="object-cover"
        unoptimized
      />
    </span>
  )
}

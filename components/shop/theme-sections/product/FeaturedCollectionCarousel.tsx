"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type ControlsShape = "round" | "square"

interface FeaturedCollectionCarouselProps {
  /** Server-rendered product cards (one per slide). */
  cards: ReactNode[]
  columnsDesktop: number
  columnsMobile: number
  showArrows: boolean
  showDots: boolean
  controlsShape: ControlsShape
}

/**
 * Client carousel for the FEATURED_COLLECTION theme section. Lays out
 * server-rendered ProductCards in a horizontal scroll-snap track and adds
 * Shopify-style controls: prev/next arrows and page dots, both available in a
 * circular or square shape. Page count is derived from the scroll geometry so
 * it stays correct across breakpoints without knowing the per-view count.
 *
 * Per-view item width is driven by CSS variables (`--cols-d` / `--cols-m`) so
 * the column counts are dynamic without Tailwind purging arbitrary classes.
 */
export function FeaturedCollectionCarousel({
  cards,
  columnsDesktop,
  columnsMobile,
  showArrows,
  showDots,
  controlsShape,
}: FeaturedCollectionCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(1)
  const [activePage, setActivePage] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const recompute = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const { scrollLeft, clientWidth, scrollWidth } = el
    const pages = clientWidth > 0 ? Math.round(scrollWidth / clientWidth) : 1
    setPageCount(Math.max(1, pages))
    setActivePage(clientWidth > 0 ? Math.round(scrollLeft / clientWidth) : 0)
    setCanPrev(scrollLeft > 4)
    setCanNext(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    // Defer the first measure to the next frame so layout (and card images)
    // have settled before we read scrollWidth/clientWidth.
    const raf = requestAnimationFrame(recompute)
    el.addEventListener("scroll", recompute, { passive: true })
    window.addEventListener("resize", recompute)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener("scroll", recompute)
      window.removeEventListener("resize", recompute)
    }
  }, [recompute, cards.length])

  const scrollByPage = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" })
  }

  const scrollToPage = (page: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: page * el.clientWidth, behavior: "smooth" })
  }

  const shapeClass = controlsShape === "square" ? "rounded-md" : "rounded-full"

  // Theme-token colors so the controls follow the section's color scheme
  // (inside `[data-color-scheme]`, shadcn tokens map to `--theme-*`). No
  // hardcoded white/gray that would ignore the chosen palette.
  const arrowBase =
    "absolute top-1/2 z-10 -translate-y-1/2 hidden sm:flex h-10 w-10 items-center justify-center bg-background text-foreground border border-border shadow-md transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-0"

  const trackStyle: CSSProperties = {
    // Consumed by the arbitrary grid-auto-columns utilities below.
    ["--cols-d" as string]: String(columnsDesktop),
    ["--cols-m" as string]: String(columnsMobile),
  }

  return (
    <div className="relative">
      {showArrows && (
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => scrollByPage(-1)}
          disabled={!canPrev}
          className={cn(arrowBase, "left-0 -translate-x-1/2", shapeClass)}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      <div
        ref={trackRef}
        style={trackStyle}
        className={cn(
          "grid grid-flow-col overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth",
          "gap-4 sm:gap-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "[grid-auto-columns:calc((100%-(var(--cols-m)-1)*1rem)/var(--cols-m))]",
          "sm:[grid-auto-columns:calc((100%-(var(--cols-d)-1)*1.5rem)/var(--cols-d))]",
        )}
      >
        {cards.map((card, i) => (
          <div key={i} className="snap-start">
            {card}
          </div>
        ))}
      </div>

      {showArrows && (
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => scrollByPage(1)}
          disabled={!canNext}
          className={cn(arrowBase, "right-0 translate-x-1/2", shapeClass)}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {showDots && pageCount > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {Array.from({ length: pageCount }).map((_, i) => {
            const active = i === activePage
            return (
              <button
                key={i}
                type="button"
                aria-label={`Ir a la página ${i + 1}`}
                aria-current={active}
                onClick={() => scrollToPage(i)}
                className={cn(
                  "transition-all",
                  controlsShape === "square" ? "rounded-[2px]" : "rounded-full",
                  active
                    ? "w-6 bg-foreground"
                    : "w-2 bg-foreground/30 hover:bg-foreground/50",
                  "h-2",
                )}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

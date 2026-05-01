"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { MenuLink } from "./MenuLink"
import { resolveMenuItemHref } from "@/lib/menus/resolve-link"
import { cn } from "@/lib/utils"
import type { ResolvedMenuItem } from "@/lib/menus/get-menu-by-slug"

interface Props {
  items: ResolvedMenuItem[]
}

export function HeaderNavMenu({ items }: Props) {
  // NOTE: do NOT use overflow-x-auto on this <nav>. Setting any non-visible
  // overflow-x value forces overflow-y to clip in most browsers (the
  // "overflow visible quirk"), which would hide the dropdown panels
  // emerging downward from parent items.
  return (
    <nav
      role="menubar"
      className="flex h-10 items-center space-x-6 text-sm flex-wrap"
    >
      {items.map((item) => (
        <NavItem key={item.id} item={item} depth={0} />
      ))}
    </nav>
  )
}

const CLOSE_DELAY_MS = 120

function NavItem({
  item,
  depth,
}: {
  item: ResolvedMenuItem
  depth: number
}) {
  const [open, setOpen] = useState(false)
  const [flip, setFlip] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const hasChildren = item.children.length > 0

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }
  useEffect(() => () => cancelClose(), [])

  // Auto-flip fly-out at depth >= 1 if it would overflow the viewport.
  // useLayoutEffect is intentional: this is a DOM-measurement → state-sync
  // pattern that must run before the browser paints to avoid a visible flicker.
  // depth is intentionally omitted from deps: it is a prop that is stable for
  // the lifetime of a mounted NavItem instance and can never change in-place.
  /* eslint-disable react-hooks/exhaustive-deps */
  useLayoutEffect(() => {
    if (!open || depth === 0 || !panelRef.current) {
      setFlip(false)
      return
    }
    const rect = panelRef.current.getBoundingClientRect()
    if (rect.right > window.innerWidth - 8) setFlip(true)
  }, [open])
  /* eslint-enable react-hooks/exhaustive-deps */

  // Close on outside click while open.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      setOpen(false)
      ;(e.currentTarget.querySelector("button, a") as HTMLElement | null)?.focus()
    } else if (e.key === "ArrowRight" && hasChildren && !open) {
      e.preventDefault()
      setOpen(true)
    } else if (e.key === "ArrowLeft" && open && depth > 0) {
      e.preventDefault()
      setOpen(false)
    }
  }

  if (!hasChildren) {
    const href = resolveMenuItemHref(item)
    if (!href) return null
    if (depth === 0) {
      return (
        <MenuLink
          item={item}
          className="transition-colors hover:text-foreground/80 whitespace-nowrap"
        />
      )
    }
    return (
      <MenuLink
        item={item}
        className="block px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
      />
    )
  }

  // Parent with children — button + cascade panel.
  const isTop = depth === 0
  const Chevron = isTop ? ChevronDown : ChevronRight

  const panelPositionClass = isTop
    ? "absolute left-0 top-full pt-2"
    : flip
      ? "absolute right-full top-0 pr-2"
      : "absolute left-full top-0 pl-2"

  return (
    <div
      ref={wrapperRef}
      className={cn("relative", !isTop && "w-full")}
      onMouseEnter={() => {
        cancelClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose()
        setOpen(true)
      }}
      onBlur={(e) => {
        // Only close if focus left the entire wrapper (not just moved inside).
        if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) {
          scheduleClose()
        }
      }}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground/80 whitespace-nowrap",
          isTop
            ? ""
            : "w-full justify-between px-2 py-1.5 text-sm rounded hover:bg-muted",
          open && !isTop && "bg-muted",
          open && isTop && "text-foreground/90",
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        role="menuitem"
      >
        <span className="truncate">{item.label}</span>
        <Chevron className="h-3 w-3 opacity-60 shrink-0" />
      </button>

      <div
        ref={panelRef}
        role="menu"
        inert={!open || undefined}
        className={cn(
          panelPositionClass,
          "z-50 min-w-[220px]",
          "transition-[opacity,transform] duration-100",
          open
            ? "opacity-100 translate-y-0 translate-x-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none",
        )}
      >
        <div className="rounded-md border bg-popover shadow-md p-2 space-y-0.5">
          {item.children.map((child) => (
            <NavItem key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    </div>
  )
}

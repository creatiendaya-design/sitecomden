"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
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
  // emerging downward from parent items. The desktop nav is hidden below
  // md anyway, so horizontal overflow is rarely an issue.
  return (
    <nav className="flex h-10 items-center space-x-6 text-sm flex-wrap">
      {items.map((item) => (
        <NavItem key={item.id} item={item} />
      ))}
    </nav>
  )
}

function NavItem({ item }: { item: ResolvedMenuItem }) {
  const [open, setOpen] = useState(false)
  const hasChildren = item.children.length > 0

  if (!hasChildren) {
    const href = resolveMenuItemHref(item)
    if (!href) return null
    return (
      <MenuLink
        item={item}
        className="transition-colors hover:text-foreground/80 whitespace-nowrap"
      />
    )
  }

  // Parent with children — render as button + hover dropdown.
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 transition-colors hover:text-foreground/80 whitespace-nowrap"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {item.label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      <div
        className={cn(
          "absolute left-0 top-full pt-2 z-50 min-w-[200px]",
          open ? "block" : "hidden",
        )}
        role="menu"
      >
        <div className="rounded-md border bg-popover shadow-md p-2 space-y-0.5">
          {item.children.map((child) => {
            const href = resolveMenuItemHref(child)
            if (!href) return null
            return (
              <MenuLink
                key={child.id}
                item={child}
                className="block px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

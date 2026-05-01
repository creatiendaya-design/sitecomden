"use client"

import { UserMenu } from "./UserMenu"
import Link from "next/link"
import { Menu, Home, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useState } from "react"
import { resolveMenuItemHref } from "@/lib/menus/resolve-link"
import { cn } from "@/lib/utils"
import type { ResolvedMenuItem } from "@/lib/menus/get-menu-by-slug"

interface MobileMenuProps {
  menuItems: ResolvedMenuItem[]
  isAdmin?: boolean
}

export default function MobileMenu({ menuItems, isAdmin: _isAdmin }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>

        <div className="mt-6 pb-4 border-b">
          <UserMenu />
        </div>

        <nav className="flex flex-col space-y-1 mt-4">
          <Link
            href="/"
            onClick={close}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Inicio</span>
          </Link>

          {menuItems.length === 0 ? (
            <Link
              href="/productos"
              onClick={close}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
            >
              <span>Todos los Productos</span>
            </Link>
          ) : (
            menuItems.map((root) => (
              <MobileNode
                key={root.id}
                item={root}
                depth={0}
                onLinkClick={close}
              />
            ))
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function MobileNode({
  item,
  depth,
  onLinkClick,
}: {
  item: ResolvedMenuItem
  depth: number
  onLinkClick: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = item.children.length > 0
  const href = resolveMenuItemHref(item)

  const indent = depth === 0 ? "" : "pl-4 border-l border-border/50"
  const rowClass = cn(
    "flex items-center rounded-md transition-colors",
    expanded ? "bg-muted/30" : "hover:bg-accent",
  )
  const labelClass = cn(
    "flex-1 px-3 py-2.5 text-sm",
    depth === 0 ? "font-medium" : "",
  )

  // Leaf: pure link.
  if (!hasChildren) {
    if (!href) return null
    const isExternal = item.linkType === "EXTERNAL_URL"
    const linkClass = cn(rowClass, "px-3 py-2.5", indent && `ml-3 ${indent}`)
    if (isExternal) {
      return (
        <a
          href={href}
          target={item.openInNewTab ? "_blank" : undefined}
          rel={item.openInNewTab ? "noopener noreferrer" : undefined}
          onClick={onLinkClick}
          className={linkClass}
        >
          <span className="text-sm">{item.label}</span>
        </a>
      )
    }
    return (
      <Link
        href={href}
        target={item.openInNewTab ? "_blank" : undefined}
        onClick={onLinkClick}
        className={linkClass}
      >
        <span className="text-sm">{item.label}</span>
      </Link>
    )
  }

  // Parent with children: split label (link if href) + caret (expand).
  return (
    <div className={cn("flex flex-col", indent && `ml-3 ${indent}`)}>
      <div className={rowClass}>
        {href ? (
          <Link
            href={href}
            onClick={onLinkClick}
            className={labelClass}
          >
            {item.label}
          </Link>
        ) : (
          <span className={cn(labelClass, "cursor-default")}>{item.label}</span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="h-11 w-11 flex items-center justify-center text-muted-foreground"
          aria-expanded={expanded}
          aria-label={expanded ? "Colapsar" : "Expandir"}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              expanded ? "rotate-180" : "rotate-0",
            )}
          />
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-[max-height] duration-200 ease-in-out",
          expanded ? "max-h-[1000px]" : "max-h-0",
        )}
      >
        <div className="space-y-1 py-1">
          {item.children.map((child) => (
            <MobileNode
              key={child.id}
              item={child}
              depth={depth + 1}
              onLinkClick={onLinkClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

"use client"

import { UserMenu } from "./UserMenu"
import Link from "next/link"
import { Menu, Home } from "lucide-react"
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

        {/* User Menu */}
        <div className="mt-6 pb-4 border-b">
          <UserMenu />
        </div>

        {/* Navigation: drawer always shows Inicio + the dynamic menu items */}
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
            menuItems.map((root) =>
              root.children.length > 0 ? (
                <ParentSection
                  key={root.id}
                  parent={root}
                  onLinkClick={close}
                />
              ) : (
                <RootLink key={root.id} item={root} onLinkClick={close} />
              ),
            )
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function RootLink({
  item,
  onLinkClick,
}: {
  item: ResolvedMenuItem
  onLinkClick: () => void
}) {
  const href = resolveMenuItemHref(item)
  if (!href) return null
  const isExternal = item.linkType === "EXTERNAL_URL"
  const className =
    "flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"

  if (isExternal) {
    return (
      <a
        href={href}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noopener noreferrer" : undefined}
        onClick={onLinkClick}
        className={className}
      >
        <span>{item.label}</span>
      </a>
    )
  }
  return (
    <Link
      href={href}
      target={item.openInNewTab ? "_blank" : undefined}
      onClick={onLinkClick}
      className={className}
    >
      <span>{item.label}</span>
    </Link>
  )
}

function ParentSection({
  parent,
  onLinkClick,
}: {
  parent: ResolvedMenuItem
  onLinkClick: () => void
}) {
  return (
    <div className="pt-3 pb-1">
      <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {parent.label}
      </p>
      <div className="space-y-1">
        {parent.children.map((child) => {
          const href = resolveMenuItemHref(child)
          if (!href) return null
          const isExternal = child.linkType === "EXTERNAL_URL"
          const className =
            "flex items-center px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"

          if (isExternal) {
            return (
              <a
                key={child.id}
                href={href}
                target={child.openInNewTab ? "_blank" : undefined}
                rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                onClick={onLinkClick}
                className={className}
              >
                {child.label}
              </a>
            )
          }
          return (
            <Link
              key={child.id}
              href={href}
              target={child.openInNewTab ? "_blank" : undefined}
              onClick={onLinkClick}
              className={className}
            >
              {child.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

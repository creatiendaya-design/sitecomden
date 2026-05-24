"use client"

import Link from "next/link"
import Image from "next/image"
import {
  ChevronDown,
  ChevronRight,
  Mail,
  X,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useState, type CSSProperties } from "react"
import { UserMenu } from "./UserMenu"
import { resolveMenuItemHref } from "@/lib/menus/resolve-link"
import { cn } from "@/lib/utils"
import type { ResolvedMenuItem } from "@/lib/menus/get-menu-by-slug"

interface MobileMenuProps {
  menuItems: ResolvedMenuItem[]
  isAdmin?: boolean
  /** Storefront branding shown in the drawer header. */
  siteName?: string
  siteLogo?: string | null
  /** Optional drawer overrides — when provided, these override the active
   *  color scheme's `--theme-drawer-bg` / `--theme-drawer-text`. */
  drawerBg?: string
  drawerText?: string
}

type DrawerCssVars = CSSProperties & {
  "--drawer-bg"?: string
  "--drawer-text"?: string
  "--drawer-border"?: string
  "--drawer-hover"?: string
  "--drawer-muted"?: string
}

export default function MobileMenu({
  menuItems,
  isAdmin: _isAdmin,
  siteName = "Menú",
  siteLogo,
  drawerBg,
  drawerText,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  // Drawer color resolution:
  //   1. Custom override from HEADER_MAIN style ("Personalizado" tab).
  //   2. Active color scheme's `--theme-drawer-*` (set globally via CSS).
  //   3. Hard fallback if no scheme exposes the variable yet.
  // We always emit the inline CSS vars so children can rely on a single
  // source of truth (`var(--drawer-bg)`), and derive a soft border/hover
  // tone from currentColor — works on both light and dark surfaces.
  const drawerStyle: DrawerCssVars = {
    "--drawer-bg": drawerBg ?? "var(--theme-drawer-bg, #ffffff)",
    "--drawer-text": drawerText ?? "var(--theme-drawer-text, #0f172a)",
    "--drawer-border": "color-mix(in srgb, currentColor 12%, transparent)",
    "--drawer-hover": "color-mix(in srgb, currentColor 8%, transparent)",
    "--drawer-muted": "color-mix(in srgb, currentColor 65%, transparent)",
    backgroundColor: "var(--drawer-bg)",
    color: "var(--drawer-text)",
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={open}
          className={cn(
            "relative inline-flex h-10 w-10 items-center justify-center rounded-full",
            "text-current transition-all duration-200",
            "hover:bg-white/10 active:scale-95 md:hidden",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40",
          )}
        >
          <HamburgerIcon open={open} />
          <span className="sr-only">Abrir menú</span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className={cn(
          // Slimmer width on small phones, generous on bigger screens.
          "w-[86vw] max-w-[360px] sm:w-[360px] p-0 gap-0 border-0",
          // Hide the default shadcn close button so we can render our own.
          "[&>button:last-of-type]:hidden",
          // Soft elevation independent of the theme bg.
          "shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)]",
        )}
        style={drawerStyle}
        // Hook for the customizer's live-preview: when the admin edits
        // HEADER_MAIN.drawerBgColor / drawerTextColor, the parent injects
        // a CSS rule against this attribute that overrides `--drawer-*`
        // in place. Without this attribute the live preview couldn't
        // reach the drawer (it lives in a Radix portal, outside the
        // section wrapper that carries `data-preview-target`).
        data-mobile-drawer=""
      >
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>

        {/* ─── Header ───────────────────────────────────────────────────── */}
        <div className="relative flex items-center gap-3 px-5 pt-5 pb-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-[0.06]"
            style={{
              background:
                "radial-gradient(120% 80% at 0% 0%, currentColor, transparent 60%)",
            }}
          />
          <div className="relative flex flex-1 items-center gap-3 min-w-0">
            {siteLogo ? (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white/5 ring-1 ring-inset ring-current/10">
                <Image
                  src={siteLogo}
                  alt={siteName}
                  fill
                  sizes="40px"
                  className="object-contain p-1"
                />
              </div>
            ) : (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-current/10 text-base font-bold uppercase">
                {siteName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight">
                {siteName}
              </p>
              <p
                className="truncate text-[11px] tracking-wide uppercase"
                style={{ color: "var(--drawer-muted)" }}
              >
                Menú
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Cerrar menú"
            className={cn(
              "relative grid h-9 w-9 shrink-0 place-items-center rounded-full",
              "transition-colors hover:bg-current/10 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ─── Account ──────────────────────────────────────────────────── */}
        <div
          className="mx-5 mb-4 rounded-2xl px-3 py-2.5"
          style={{ backgroundColor: "var(--drawer-hover)" }}
        >
          <UserMenu />
        </div>

        {/* ─── Navigation (scrollable) ─────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 pb-2">
          {menuItems.length > 0 ? (
            <div className="space-y-0.5 pt-1">
              {menuItems.map((root) => (
                <MobileNode
                  key={root.id}
                  item={root}
                  depth={0}
                  onLinkClick={close}
                />
              ))}
            </div>
          ) : (
            <p
              className="px-3 py-6 text-center text-xs"
              style={{ color: "var(--drawer-muted)" }}
            >
              Configura el menú móvil en Personalizar → Encabezado principal.
            </p>
          )}
        </nav>

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <div
          className="border-t px-5 py-4"
          style={{ borderColor: "var(--drawer-border)" }}
        >
          <Link
            href="/contacto"
            onClick={close}
            className={cn(
              "flex items-center gap-2 text-[13px] font-medium",
              "transition-opacity hover:opacity-100",
            )}
            style={{ color: "var(--drawer-muted)" }}
          >
            <Mail className="h-4 w-4" />
            <span>Contacto y ayuda</span>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Animated hamburger ↔ X icon                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function HamburgerIcon({ open }: { open: boolean }) {
  // Three 18-px wide bars; the middle one fades, the outer ones rotate into
  // a centered X. Pure CSS transforms keep it crisp at every DPI.
  return (
    <span
      aria-hidden
      className="relative block h-[14px] w-[18px]"
    >
      <span
        className={cn(
          "absolute left-0 right-0 h-[2px] rounded-full bg-current",
          "transition-all duration-300 ease-out",
          open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0",
        )}
      />
      <span
        className={cn(
          "absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-current",
          "transition-opacity duration-200 ease-out",
          open ? "opacity-0" : "opacity-100",
        )}
      />
      <span
        className={cn(
          "absolute left-0 right-0 h-[2px] rounded-full bg-current",
          "transition-all duration-300 ease-out",
          open ? "bottom-1/2 translate-y-1/2 -rotate-45" : "bottom-0",
        )}
      />
    </span>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Drawer building blocks                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function DrawerLink({
  href,
  icon,
  label,
  onClick,
  primary = false,
  external = false,
  newTab = false,
}: {
  href: string
  icon?: React.ReactNode
  label: string
  onClick: () => void
  primary?: boolean
  external?: boolean
  newTab?: boolean
}) {
  const className = cn(
    "group flex items-center gap-3 rounded-xl px-3 py-2.5",
    "text-[14px] transition-colors",
    "hover:bg-current/[0.06] active:bg-current/[0.1]",
    primary ? "font-semibold" : "font-medium",
  )
  const content = (
    <>
      {icon ? (
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors group-hover:bg-current/10"
          style={{ backgroundColor: "var(--drawer-hover)" }}
        >
          {icon}
        </span>
      ) : null}
      <span className="flex-1 truncate">{label}</span>
      <ChevronRight
        className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
        style={{ color: "var(--drawer-muted)" }}
      />
    </>
  )
  if (external) {
    return (
      <a
        href={href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        onClick={onClick}
        className={className}
      >
        {content}
      </a>
    )
  }
  return (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      onClick={onClick}
      className={className}
    >
      {content}
    </Link>
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
  const isRoot = depth === 0

  // Leaf — pure link, styled like a drawer entry.
  if (!hasChildren) {
    if (!href) return null
    return (
      <div className={cn(!isRoot && "pl-3")}>
        <DrawerLink
          href={href}
          label={item.label}
          onClick={onLinkClick}
          external={item.linkType === "EXTERNAL_URL"}
          newTab={item.openInNewTab}
        />
      </div>
    )
  }

  // Parent with children — split-row: clickable label + caret toggle.
  return (
    <div className={cn("flex flex-col", !isRoot && "pl-3")}>
      <div
        className={cn(
          "flex items-stretch rounded-xl transition-colors",
          expanded ? "bg-current/[0.05]" : "hover:bg-current/[0.06]",
        )}
      >
        {href ? (
          <Link
            href={href}
            onClick={onLinkClick}
            className={cn(
              "flex-1 truncate px-3 py-2.5 text-[14px]",
              isRoot ? "font-semibold" : "font-medium",
            )}
          >
            {item.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "flex-1 truncate text-left px-3 py-2.5 text-[14px]",
              isRoot ? "font-semibold" : "font-medium",
            )}
          >
            {item.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="grid w-11 place-items-center rounded-r-xl transition-colors hover:bg-current/10"
          aria-expanded={expanded}
          aria-label={expanded ? "Colapsar" : "Expandir"}
          style={{ color: "var(--drawer-muted)" }}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              expanded ? "rotate-180" : "rotate-0",
            )}
          />
        </button>
      </div>

      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div
            className="my-1 ml-3 space-y-0.5 border-l pl-2"
            style={{ borderColor: "var(--drawer-border)" }}
          >
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
    </div>
  )
}

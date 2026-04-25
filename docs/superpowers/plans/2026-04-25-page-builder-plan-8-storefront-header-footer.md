# Page Builder — Plan 8: Storefront Header & Footer Driven by Menus

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Make the storefront header and footer render the seeded `main` and `footer` menus from Plan 5.5, instead of the current hardcoded categories + links. The cart, 404, and all `(shop)` pages inherit these via the existing `app/(shop)/layout.tsx` so no per-page work is needed.

**Architecture:**

- `Header.tsx` is refactored: keeps logo + search + auth + cart icon + mobile-menu trigger; the desktop nav row reads `getMenuBySlug("main")` and renders items with hover dropdowns for parents that have children.
- `MobileMenu.tsx` consumes the same `main` menu so mobile and desktop are in sync.
- `Footer.tsx` is refactored: top section renders the `footer` menu grouped by root items (each root becomes a column titled with its label, and its children render as the link list under it). About-block, social links, and bottom copyright stay.
- Both fall back gracefully when the menu doesn't exist (e.g. seed not run) — no crashes; render empty nav.
- The "Categorías" hardcoded list in the current Header stays as a SAFETY FALLBACK only when the `main` menu is missing entirely.

**Out of scope:**
- Search route (`/buscar`) — keeps the inline search bar as today.
- Theme-driven menu binding (Plan 9 will let each theme pick which menu slugs to use for header/footer; for now, slugs are fixed: `main` / `footer`).
- Header customization via blocks (later — would need a block-based shell, lots of refactor).

**Preceded by:** Plan 5.5 (Menu Builder) — merged.
**Followed by:** Plan 6 (Home with blocks), Plan 9 (Theme picker — multiple themes with own menus).

**Pre-flight:**

```bash
git checkout master
git status
git checkout -b feature/page-builder-plan-8-storefront-menus
```

---

## File Structure

**Modified files:**
```
components/shop/Header.tsx                       # Read main menu, render desktop nav
components/shop/MobileMenu.tsx                   # Consume main menu in mobile drawer
components/shop/Footer.tsx                       # Render footer menu as columns
```

**New files:**
```
components/shop/MenuLink.tsx                     # Tiny helper to render a ResolvedMenuItem with proper href/target
components/shop/HeaderNavMenu.tsx                # Client component for the desktop nav with hover dropdowns
```

---

## Phase A — Helpers + Header desktop nav

### Task 1: MenuLink helper

`components/shop/MenuLink.tsx`:

```tsx
import Link from "next/link"
import { resolveMenuItemHref, type ResolvableMenuItem } from "@/lib/menus/resolve-link"

interface Props {
  item: ResolvableMenuItem & {
    label: string
    openInNewTab: boolean
  }
  className?: string
  children?: React.ReactNode
}

/**
 * Renders a menu item as the right kind of element:
 *  - Internal links → next/link
 *  - External links → <a> with rel="noopener noreferrer"
 *  - Items whose target is missing (deleted Page, empty URL) → null (item omitted)
 */
export function MenuLink({ item, className, children }: Props) {
  const href = resolveMenuItemHref(item)
  if (!href) return null

  const label = children ?? item.label
  const isExternal = item.linkType === "EXTERNAL_URL" || item.openInNewTab

  if (isExternal) {
    return (
      <a
        href={href}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noopener noreferrer" : undefined}
        className={className}
      >
        {label}
      </a>
    )
  }

  return (
    <Link href={href} target={item.openInNewTab ? "_blank" : undefined} className={className}>
      {label}
    </Link>
  )
}
```

Verify + commit:

```bash
npx tsc --noEmit
git add components/shop/MenuLink.tsx
git commit -m "feat(storefront): MenuLink helper to render menu items with proper href/target"
```

### Task 2: HeaderNavMenu (desktop nav with dropdowns)

`components/shop/HeaderNavMenu.tsx` (client component because of hover dropdowns):

```tsx
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
  return (
    <nav className="flex h-10 items-center space-x-6 text-sm overflow-x-auto">
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

  // Parent with children — render label as button + dropdown.
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
      >
        {item.label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      <div
        className={cn(
          "absolute left-0 top-full pt-2 z-50 min-w-[200px]",
          open ? "block" : "hidden",
        )}
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
```

Verify + commit:

```bash
npx tsc --noEmit
git add components/shop/HeaderNavMenu.tsx
git commit -m "feat(storefront): HeaderNavMenu with hover dropdowns for menu items with children"
```

### Task 3: Refactor Header.tsx to consume main menu

Modify `components/shop/Header.tsx`:

1. Remove the `prisma.category.findMany` call. Replace with `await getMenuBySlug("main")`.
2. Remove the hardcoded "Nosotros" and "Contacto" links.
3. Replace the hardcoded `<nav>` block in the bottom strip with `<HeaderNavMenu items={menu.items} />` when `menu` is non-null.
4. When `menu` is null (seed not run), fall back to a minimal nav: just "/productos" (Todos los productos). No more category list — admins can re-add categories via the menu builder.
5. Keep MobileMenu but pass it the menu items now (Task 4).

Pseudocode for the relevant section:

```tsx
import { getMenuBySlug } from "@/lib/menus/get-menu-by-slug"
import { HeaderNavMenu } from "./HeaderNavMenu"

export default async function Header() {
  const settings = await getSiteSettings()
  const menu = await getMenuBySlug("main")

  // ... existing logo / search / cart / auth markup unchanged ...

  return (
    <header ...>
      {/* ... top bar unchanged ... */}
      {/* Mobile menu now receives the menu items (see Task 4) */}
      <MobileMenu menuItems={menu?.items ?? []} isAdmin={false} />
      {/* ... search bar unchanged ... */}

      {/* Desktop nav */}
      <div className="border-t hidden md:block">
        <div className="container mx-auto px-4">
          {menu && menu.items.length > 0 ? (
            <HeaderNavMenu items={menu.items} />
          ) : (
            <nav className="flex h-10 items-center space-x-6 text-sm">
              <Link href="/productos" className="...">
                Todos los Productos
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}
```

Verify + commit:

```bash
npx tsc --noEmit
npm run build
git add components/shop/Header.tsx
git commit -m "feat(storefront): Header desktop nav reads main menu from DB"
```

---

## Phase B — MobileMenu + Footer

### Task 4: MobileMenu uses main menu

Read `components/shop/MobileMenu.tsx` first to see its current shape. Update its props from `{ categories, isAdmin }` to `{ menuItems, isAdmin }`. Render the items as a flat list (parents shown as section headings, children indented underneath). Top items without children render as plain links.

Pseudocode:

```tsx
interface Props {
  menuItems: ResolvedMenuItem[]
  isAdmin: boolean
}

// Inside the drawer body, replace the categories list with:
{menuItems.map((root) => (
  root.children.length > 0 ? (
    <div key={root.id} className="space-y-1">
      <p className="text-xs uppercase font-semibold text-muted-foreground mt-3 mb-1">
        {root.label}
      </p>
      {root.children.map((child) => {
        const href = resolveMenuItemHref(child)
        if (!href) return null
        return (
          <MenuLink key={child.id} item={child} className="block py-2 text-sm" />
        )
      })}
    </div>
  ) : (
    <MenuLink key={root.id} item={root} className="block py-2 text-sm" />
  )
))}
```

Verify + commit:

```bash
npx tsc --noEmit
git add components/shop/MobileMenu.tsx components/shop/Header.tsx
git commit -m "feat(storefront): MobileMenu drawer reads main menu items"
```

(Header.tsx ends up in this commit too because it's the caller passing the new prop shape.)

### Task 5: Refactor Footer.tsx to consume footer menu

Modify `components/shop/Footer.tsx`:

1. Add `await getMenuBySlug("footer")` near the top.
2. Replace the hardcoded "Enlaces" / "Información" / "Contacto" columns with a dynamic loop over `menu.items`. Each root item with children becomes a column (heading = root label, links = its children). Roots WITHOUT children become a single-link "column" or are appended to a "Más" column at the end.
3. Keep the About column (site name + description) and the Social row.
4. When `menu` is null, fall back to ZERO link columns (just the About + Social). No hardcoded duplicates.

Pseudocode for the columns section:

```tsx
const menu = await getMenuBySlug("footer")
const linkColumns = (menu?.items ?? []).filter((root) => root.children.length > 0)

// In JSX:
<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
  {/* About column unchanged */}
  <div className="sm:col-span-2 lg:col-span-1">...</div>

  {linkColumns.map((col) => (
    <div key={col.id}>
      <h3 className="mb-4 text-lg font-semibold text-white">{col.label}</h3>
      <ul className="space-y-2 text-sm">
        {col.children.map((child) => {
          const href = resolveMenuItemHref(child)
          if (!href) return null
          return (
            <li key={child.id}>
              <MenuLink
                item={child}
                className="text-gray-400 hover:text-white transition-colors"
              />
            </li>
          )
        })}
      </ul>
    </div>
  ))}

  {/* Social column / contact column unchanged */}
</div>
```

Verify + commit:

```bash
npx tsc --noEmit
npm run build
git add components/shop/Footer.tsx
git commit -m "feat(storefront): Footer columns read footer menu from DB"
```

---

## Phase C — Final

### Task 6: Smoke test + merge

Manual:
1. `npm run dev`. Visit `/` (home). The desktop header shows the items from the seeded `main` menu: Inicio / Productos / Categorías / Nosotros / Contacto.
2. Hover "Productos" (or any item with children, if you added them) → dropdown appears.
3. Visit `/carrito`, `/productos`, any product page — header is consistent everywhere.
4. Mobile: open the drawer → see same items, parents as section headings.
5. Footer: shows two columns "Información" + "Ayuda" with their children as links. About + Social rows untouched.
6. Edit `main` menu in admin: add a new item "Promociones" → external URL `/promociones`. Save. Refresh storefront → new item appears.
7. Deactivate the `main` menu (`active: false`) → header falls back to the minimal "Todos los Productos" link.
8. Delete the `footer` menu in admin → footer columns disappear; About + Social remain.
9. /404 (visit a random path) — header and footer render correctly around the 404 message.

Build:

```bash
npx tsc --noEmit
npm run build
```

Both clean. Merge:

```bash
git checkout master
git merge --no-ff feature/page-builder-plan-8-storefront-menus -m "Merge Plan 8: storefront header & footer driven by menus"
git branch -d feature/page-builder-plan-8-storefront-menus
```

---

## What's next

- **Plan 6** — Home with blocks. Reuses the page builder for `/`. Replaces `app/page.tsx`.
- **Plan 7** — Categories / collections.
- **Plan 9** — Theme picker. Each theme stores `headerMenuId` + `footerMenuId`, so different themes can use different menus.

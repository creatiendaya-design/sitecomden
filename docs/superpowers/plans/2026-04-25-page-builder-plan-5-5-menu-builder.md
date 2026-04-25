# Page Builder — Plan 5.5: Menu Builder

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add a Shopify-style menu builder. Admins can create named menus (header, footer, custom) with hierarchical items. Each item links to a Page, Product, Category, an external URL, or a "smart" destination (Home, productos, all categories). Subsequent plans (6 — Home, 8 — Header/Footer) reference these menus by slug.

**Architecture:**

- New Prisma models `Menu` (id, slug, title, description?, active, …) and `MenuItem` (self-referential parent/children for nesting; discriminated `linkType` + `targetId` / `externalUrl`).
- Admin lives at `/admin/menus`. The editor renders a tree with drag-drop reordering and inline editing of each item via a sheet/dialog. **Max nesting depth: 2** for v1 (one parent + one level of children) — covers Shopify's typical use case without a complex tree UI.
- Server actions follow the established pattern (`listMenus`, `getMenu`, `createMenu`, `updateMenuMetadata`, `saveMenuItems` transactional, `deleteMenu`, `toggleMenuActive`).
- Storefront helpers `getMenuBySlug(slug)` and `resolveMenuItemHref(item)` so future Plan 6/8 work can render menus via:
  ```tsx
  const menu = await getMenuBySlug("main")
  return <Header menu={menu} />
  ```
- Two seed menus (`main`, `footer`) with sensible defaults shipped via `scripts/seed-menus.ts`.
- Theme editor's "Header & Footer" section becomes interactive: clicking it routes to `/admin/menus`.

**Preceded by:** Plan 5 (static pages) — merged.
**Followed by:** Plan 6 (home), Plan 7 (collections), Plan 8 (cart/header/footer/404/search) — all of which can now consume menus.

**Pre-flight:**

```bash
git checkout master
git status
git checkout -b feature/page-builder-plan-5-5-menu-builder
```

---

## File Structure

**New files:**
```
prisma/migrations/<ts>_add_menu/migration.sql

actions/menus.ts                                 # Server actions
lib/menus/resolve-link.ts                        # MenuItem → href helper
lib/menus/get-menu-by-slug.ts                    # Cached fetcher

app/admin/menus/
├── page.tsx                                     # List of menus
└── [menuId]/
    ├── page.tsx                                 # Tree editor
    └── editar/page.tsx                          # Metadata edit

components/admin/menus/
├── MenuListGrid.tsx
├── CreateMenuDialog.tsx
├── EditMenuMetadataForm.tsx
├── MenuTreeEditor.tsx                           # Hierarchical drag-drop tree
├── MenuItemSheet.tsx                            # Edit a single item
└── LinkTargetPicker.tsx                         # Smart picker per linkType

scripts/setup-menus-permissions.ts
scripts/seed-menus.ts
```

**Modified files:**
```
prisma/schema.prisma                             # add Menu + MenuItem
app/admin/layout.tsx                             # add "Menús" sidebar entry
components/admin/themes/ThemeSectionList.tsx     # enable "Header & Footer" section
```

---

## Phase A — Data + permissions

### Task 1: Prisma model + migration

In `prisma/schema.prisma`, near `Page`:

```prisma
/// A named, hierarchical navigation menu (e.g. "main", "footer", "sidebar").
/// Plans 6/8 reference menus by slug to render the storefront's nav surfaces.
model Menu {
  id          String     @id @default(cuid())
  /// Slug used by the storefront to fetch the menu (e.g. "main", "footer-info").
  /// Must be unique. Lowercase + dashes only.
  slug        String     @unique
  /// Admin-facing display name.
  title       String
  description String?
  active      Boolean    @default(true)
  items       MenuItem[]
  createdBy   String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([slug, active])
}

model MenuItem {
  id            String     @id @default(cuid())
  menuId        String
  menu          Menu       @relation(fields: [menuId], references: [id], onDelete: Cascade)
  /// Self-referential parent for one level of nesting (max depth 2).
  parentId      String?
  parent        MenuItem?  @relation("MenuItemNesting", fields: [parentId], references: [id], onDelete: Cascade)
  children      MenuItem[] @relation("MenuItemNesting")
  position      Int
  /// Visible label shown in the menu.
  label         String
  /// Discriminator. Valid values:
  ///   PAGE, PRODUCT, CATEGORY, EXTERNAL_URL,
  ///   HOME, PRODUCTS_INDEX, COLLECTIONS_INDEX
  /// Stored as String (not enum) to avoid migration churn when adding new types.
  linkType      String
  /// Generic target reference, interpreted per linkType:
  ///   PAGE          → Page.id
  ///   PRODUCT       → Product.id
  ///   CATEGORY      → Category.id
  ///   EXTERNAL_URL  → null (uses externalUrl)
  ///   HOME / *_INDEX → null
  targetId      String?
  /// Used only when linkType == EXTERNAL_URL.
  externalUrl   String?
  openInNewTab  Boolean    @default(false)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  @@index([menuId, parentId, position])
}
```

Run: `npx prisma migrate dev --name add_menu`. Verify with `npx tsc --noEmit`. Commit:

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(menus): Menu + MenuItem prisma model + migration"
```

### Task 2: Permissions

Mirror `setup-pages-permissions.ts` for `menus:view/create/update/delete`. Run locally. Commit:

```bash
git add scripts/setup-menus-permissions.ts
git commit -m "feat(rbac): add menus permissions"
```

### Task 3: Link resolver helper

`lib/menus/resolve-link.ts`:

```typescript
export type MenuLinkType =
  | "PAGE"
  | "PRODUCT"
  | "CATEGORY"
  | "EXTERNAL_URL"
  | "HOME"
  | "PRODUCTS_INDEX"
  | "COLLECTIONS_INDEX"

export interface ResolvableMenuItem {
  linkType: string
  targetId: string | null
  externalUrl: string | null
  /** Optional pre-joined slug fields for internal targets, populated when
   *  the menu is fetched with includes. Avoids per-item lookups at render. */
  pageSlug?: string | null
  productSlug?: string | null
  categorySlug?: string | null
}

/**
 * Resolve a MenuItem to its final href. Returns null when the target is
 * missing (e.g. a Page was deleted) — caller should hide the item.
 */
export function resolveMenuItemHref(item: ResolvableMenuItem): string | null {
  switch (item.linkType as MenuLinkType) {
    case "HOME":             return "/"
    case "PRODUCTS_INDEX":   return "/productos"
    case "COLLECTIONS_INDEX": return "/categoria"
    case "EXTERNAL_URL":     return item.externalUrl || null
    case "PAGE":             return item.pageSlug ? `/${item.pageSlug}` : null
    case "PRODUCT":          return item.productSlug ? `/productos/${item.productSlug}` : null
    case "CATEGORY":         return item.categorySlug ? `/categoria/${item.categorySlug}` : null
    default:                 return null
  }
}
```

Verify + commit:

```bash
git add lib/menus/resolve-link.ts
git commit -m "feat(menus): resolveMenuItemHref helper for storefront rendering"
```

### Task 4: Server actions

`actions/menus.ts` — mirror `actions/pages.ts`:

- `listMenus()` → `MenuRow[]` (id, slug, title, active, itemCount, updatedAt).
- `getMenu(id)` → `MenuWithItems` (full tree with joined slugs for PAGE/PRODUCT/CATEGORY items so the editor can show preview hrefs and the storefront can resolve hrefs without N+1).
- `getMenuBySlug(slug)` → same shape but by slug + only when active=true. Used by storefront. Tag with `menu:${slug}` via `unstable_cache` IF you want — not strictly required for v1; storefront can do plain Prisma read.
- `createMenu({ slug, title, description? })` — validates slug (lowercase, dashes), checks uniqueness.
- `updateMenuMetadata(id, { slug?, title?, description?, active? })`.
- `saveMenuItems(menuId, items)` — transactional upsert/delete (mirrors `saveTemplateBlocks` pattern). Items have `id, parentId, position, label, linkType, targetId, externalUrl, openInNewTab`.
- `deleteMenu(id)`.
- `toggleMenuActive(id)`.

Each mutation calls `updateTag("menu:" + slug)` and `revalidatePath("/admin/menus")`.

Verify + commit:

```bash
git add actions/menus.ts
git commit -m "feat(menus): server actions for menu CRUD + saveMenuItems"
```

### Task 5: getMenuBySlug helper for storefront

`lib/menus/get-menu-by-slug.ts`:

```typescript
import { prisma } from "@/lib/db"
import type { ResolvableMenuItem } from "./resolve-link"

export interface ResolvedMenu {
  id: string
  slug: string
  title: string
  items: ResolvedMenuItem[]
}

export interface ResolvedMenuItem extends ResolvableMenuItem {
  id: string
  label: string
  openInNewTab: boolean
  position: number
  children: ResolvedMenuItem[]
}

/**
 * Storefront-facing fetcher: returns the active menu with the given slug,
 * or null if not found. Items come back already pre-joined with the slugs
 * needed by resolveMenuItemHref.
 */
export async function getMenuBySlug(slug: string): Promise<ResolvedMenu | null> {
  const menu = await prisma.menu.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: [{ parentId: "asc" }, { position: "asc" }],
        // Future: pre-join Page/Product/Category by their relation. For now
        // we do a separate lookup batch below to avoid touching the schema.
      },
    },
  })
  if (!menu || !menu.active) return null

  // Batch-fetch slugs for internal links so resolveMenuItemHref doesn't
  // need to hit the DB at render time.
  const pageIds = [...new Set(menu.items.filter((i) => i.linkType === "PAGE" && i.targetId).map((i) => i.targetId!))]
  const productIds = [...new Set(menu.items.filter((i) => i.linkType === "PRODUCT" && i.targetId).map((i) => i.targetId!))]
  const categoryIds = [...new Set(menu.items.filter((i) => i.linkType === "CATEGORY" && i.targetId).map((i) => i.targetId!))]

  const [pages, products, categories] = await Promise.all([
    pageIds.length > 0
      ? prisma.page.findMany({ where: { id: { in: pageIds } }, select: { id: true, slug: true } })
      : [],
    productIds.length > 0
      ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, slug: true } })
      : [],
    categoryIds.length > 0
      ? prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, slug: true } })
      : [],
  ])
  const pageSlug = new Map(pages.map((p) => [p.id, p.slug]))
  const productSlug = new Map(products.map((p) => [p.id, p.slug]))
  const categorySlug = new Map(categories.map((c) => [c.id, c.slug]))

  // Assemble nested tree.
  const byId = new Map<string, ResolvedMenuItem>()
  for (const it of menu.items) {
    byId.set(it.id, {
      id: it.id,
      label: it.label,
      linkType: it.linkType,
      targetId: it.targetId,
      externalUrl: it.externalUrl,
      openInNewTab: it.openInNewTab,
      position: it.position,
      pageSlug: it.linkType === "PAGE" ? pageSlug.get(it.targetId ?? "") ?? null : null,
      productSlug: it.linkType === "PRODUCT" ? productSlug.get(it.targetId ?? "") ?? null : null,
      categorySlug: it.linkType === "CATEGORY" ? categorySlug.get(it.targetId ?? "") ?? null : null,
      children: [],
    })
  }
  const roots: ResolvedMenuItem[] = []
  for (const it of menu.items) {
    const node = byId.get(it.id)!
    if (it.parentId) {
      const parent = byId.get(it.parentId)
      if (parent) parent.children.push(node)
      else roots.push(node)  // orphaned — surface at root rather than hide
    } else {
      roots.push(node)
    }
  }
  // Stable sort within each level by position.
  const sortByPos = (a: ResolvedMenuItem, b: ResolvedMenuItem) => a.position - b.position
  roots.sort(sortByPos)
  for (const node of byId.values()) node.children.sort(sortByPos)

  return {
    id: menu.id,
    slug: menu.slug,
    title: menu.title,
    items: roots,
  }
}
```

Verify + commit:

```bash
git add lib/menus/get-menu-by-slug.ts
git commit -m "feat(menus): getMenuBySlug fetcher with pre-joined target slugs"
```

---

## Phase B — Admin UI

### Task 6: Menus list + create dialog

Files:
- `app/admin/menus/page.tsx` (server)
- `components/admin/menus/MenuListGrid.tsx`
- `components/admin/menus/CreateMenuDialog.tsx`
- `app/admin/menus/[menuId]/editar/page.tsx`
- `components/admin/menus/EditMenuMetadataForm.tsx`

Mirror `pages` admin patterns. The list shows each menu as a card: title + slug + item count + active badge. `⋯` menu: Editar contenido / Editar metadata / Activar|Desactivar / Eliminar.

The create dialog asks for slug (auto-normalized) + title + description. Reserved slugs to block: `main`, `footer` are NOT reserved (they're the seeded ones; the admin can recreate them if accidentally deleted, but normally they exist and this dialog creates *additional* menus). However, slug uniqueness is enforced.

Verify + commit (ONE commit covering the list, create, and metadata-edit pages):

```bash
git add app/admin/menus/ components/admin/menus/MenuListGrid.tsx components/admin/menus/CreateMenuDialog.tsx components/admin/menus/EditMenuMetadataForm.tsx
git commit -m "feat(menus): list page + create dialog + metadata edit"
```

### Task 7: Menu tree editor

This is the centerpiece. Files:
- `app/admin/menus/[menuId]/page.tsx` (server)
- `components/admin/menus/MenuTreeEditor.tsx` (client)
- `components/admin/menus/MenuItemSheet.tsx` (edit a single item in a sheet)
- `components/admin/menus/LinkTargetPicker.tsx` (target picker, switches per linkType)

`MenuTreeEditor`:
- Header: title + "Guardar cambios" button (uses dirty-tracking; only enabled when items differ from `originalItems` snapshot — pattern reused from template editor).
- Body: a vertical list of root items. Each root item has its children rendered indented below. Each item shows: drag handle, label, link type badge (e.g. "Page", "Product", "External"), edit button, delete button.
- "+ Agregar item" button at the root + per-parent.
- Drag-and-drop using `@dnd-kit` (already installed) at TWO levels: roots between each other, children within their parent. Cross-parent drag (move item from one parent to another) — for v1, support but it's optional; can be done by Edit Sheet picking a different parent.
- Click on an item → opens `MenuItemSheet` (shadcn `Sheet`) showing: label input, link type Select, link target (rendered by `LinkTargetPicker`), open-in-new-tab Switch, "Hacer hijo de…" Select to change parent, Save / Cancel.

`LinkTargetPicker`:
- Reads `linkType` and renders the appropriate input:
  - `EXTERNAL_URL` → text Input.
  - `PAGE` → Select listing all active Pages with title + `/<slug>` muted.
  - `PRODUCT` → search picker (reuse `ProductPickerField` shape from `lib/blocks/schema/primitives/ProductPickerField.tsx` — single-select mode).
  - `CATEGORY` → Select listing all active Categories.
  - `HOME` / `PRODUCTS_INDEX` / `COLLECTIONS_INDEX` → no input (the linkType IS the target).

The store-and-save pattern: hold the edited tree in local React state (`useState<MenuItemDraft[]>`); the Sheet's Save updates the corresponding draft item in-place; the topbar's "Guardar cambios" button calls `saveMenuItems(menuId, draftItems)` flattening the tree to the DB shape.

Add the route to `app/admin/layout.tsx` full-screen builder detector so the chrome hides:

```typescript
const isMenuEditor =
  /^\/admin\/menus\/[^/]+$/.test(pathname ?? "") &&
  !/\/editar$/.test(pathname ?? "")
```

Verify + commit (ONE commit for the entire editor):

```bash
git add app/admin/menus/[menuId]/page.tsx components/admin/menus/MenuTreeEditor.tsx components/admin/menus/MenuItemSheet.tsx components/admin/menus/LinkTargetPicker.tsx app/admin/layout.tsx
git commit -m "feat(menus): hierarchical tree editor with drag-drop + sheet for item edit"
```

### Task 8: Sidebar entry + theme section enabled

In `app/admin/layout.tsx`, add a "Menús" entry pointing to `/admin/menus`. Use `Menu` icon from lucide.

In `components/admin/themes/ThemeSectionList.tsx`, change "Header & Footer" section to `status: "active"` and route it to `/admin/menus` on click.

Verify + commit:

```bash
git add app/admin/layout.tsx components/admin/themes/ThemeSectionList.tsx
git commit -m "feat(menus): sidebar entry + theme section enabled"
```

---

## Phase C — Seeding & finish

### Task 9: Seed initial menus

`scripts/seed-menus.ts` — idempotent (skip if any menu exists). Creates two menus:

1. **main** ("Menú principal") with items:
   - Inicio (HOME)
   - Productos (PRODUCTS_INDEX)
   - Categorías (COLLECTIONS_INDEX)
   - Nosotros (PAGE → looks up Page with slug "nosotros" if it exists; otherwise EXTERNAL_URL `/nosotros` since the hardcoded route is still there)
   - Contacto (PAGE → "contacto" / fallback `/contacto`)

2. **footer** ("Menú de pie") with two parent items:
   - Información (parent, no link target)
     - Términos (PAGE / fallback `/terminos`)
     - Privacidad (PAGE / fallback `/privacidad`)
     - Devoluciones (PAGE / fallback `/devoluciones`)
   - Ayuda (parent)
     - FAQ (PAGE / fallback `/preguntas`)
     - Envíos (PAGE / fallback `/envios`)

Run locally. Commit:

```bash
git add scripts/seed-menus.ts
git commit -m "feat(menus): seed initial main + footer menus"
```

### Task 10: Smoke test + merge

Manual:
1. `npx tsx scripts/setup-menus-permissions.ts`
2. `npx tsx scripts/seed-menus.ts` — creates main + footer menus.
3. Sidebar shows "Menús". Click → see two cards: Menú principal (main) and Menú de pie (footer).
4. Click "Menú principal" → editor shows the 5 items as a flat list. Drag the "Categorías" item between "Productos" and "Nosotros" → reorders. Click "Guardar cambios".
5. Click on "Categorías" item → sheet opens with link type "Productos (todas las categorías)". Change to External URL → URL input appears. Type "https://example.com" → Save → item now shows "External" badge.
6. Click "+ Agregar item" → new item with default label "Nuevo item" and linkType HOME. Edit → choose Page, pick a Page from the dropdown → Save. Item now links to that page on the storefront.
7. Open the footer menu → see two parents (Información, Ayuda) with children. Drag a child from Información into Ayuda → it moves.
8. Edit metadata of "main": change the slug to "main-new" → save → URL `/admin/menus/[id]/editar` shows the new slug.
9. In `/admin/personalizar`: "Header & Footer" section is now active and navigates to `/admin/menus`.
10. From the storefront side (manual DB query or Server Action playground): call `getMenuBySlug("main")` → returns the resolved tree with hrefs. Plan 6/8 will consume this.

Build:

```bash
npx tsc --noEmit
npm run build
```

Merge:

```bash
git checkout master
git merge --no-ff feature/page-builder-plan-5-5-menu-builder -m "Merge Plan 5.5: Menu Builder"
git branch -d feature/page-builder-plan-5-5-menu-builder
```

---

## What's next

- **Plan 6** — Home with blocks. The home builder gains a "Menu link list" block that consumes a Menu by slug.
- **Plan 8** — Header & Footer renders the seeded `main` and `footer` menus automatically. Theme can override which menus to use.
- **Plan 9** — Theme picker / multiple themes. Theme metadata gains `headerMenuId` and `footerMenuId` so different themes can use different menus.

# Page Builder — Plan 5: Static Pages with Blocks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add a `Page` model so admins can create static pages (Nosotros, Términos, FAQ, Envíos, Privacidad, Contacto, Devoluciones, plus arbitrary new ones) using the page builder, instead of editing hardcoded `app/(shop)/<slug>/page.tsx` files. The storefront resolves a request for `/<slug>` to a Page when one exists with that slug.

**Architecture:**

- New Prisma models `Page` (id, slug, title, description?, active, …) and `PageBlock` (mirrors `LandingBlock` / `TemplateBlock` shape).
- Admin CRUD lives at `/admin/paginas`. The editor is a full-screen page builder reusing `PageBuilder` with `scope="page"` (same as templates).
- Storefront resolves via a NEW catch-all route `app/(shop)/[slug]/page.tsx` that renders Page blocks when a matching active Page exists. Hardcoded routes (e.g. `app/(shop)/nosotros/page.tsx`) take priority over the catch-all by Next.js routing rules — so existing pages keep working untouched. The admin is BLOCKED from creating Pages with slugs that collide with hardcoded routes (configured allow-list of reserved slugs).
- Plan 6+ later migrates the existing hardcoded pages to Page records (or merges them by deleting the hardcoded file once an admin Page exists).

**Preceded by:** Plan 4 (theme skeleton — merged).
**Followed by:** Plan 6 (home), Plan 7 (collections), Plan 8 (cart/header/footer). The "Páginas estáticas" section in the theme editor becomes interactive once this plan ships.

**Pre-flight:**

```bash
git checkout master
git status
git checkout -b feature/page-builder-plan-5-static-pages
```

---

## File Structure

**New files:**
```
prisma/migrations/<ts>_add_page/migration.sql

actions/pages.ts                                 # Server actions for Page CRUD
lib/pages/reserved-slugs.ts                      # Slugs that already have hardcoded routes

app/admin/paginas/
├── page.tsx                                     # List of pages
└── [pageId]/
    ├── page.tsx                                 # Page builder (full-screen)
    └── editar/page.tsx                          # Metadata edit

app/(shop)/[slug]/page.tsx                       # Catch-all storefront page renderer

components/admin/pages/
├── PageListGrid.tsx
├── CreatePageDialog.tsx
├── PageBuilderShell.tsx                         # Wraps PageBuilder + saves to DB
├── PagePicker.tsx                                # Topbar dropdown to switch between pages
└── EditPageMetadataForm.tsx

scripts/setup-pages-permissions.ts               # pages:view|create|update|delete
```

**Modified files:**
```
prisma/schema.prisma                             # add Page + PageBlock
app/admin/layout.tsx                             # add "Páginas" sidebar entry
app/admin/personalizar/page.tsx                  # ThemeSectionList: enable "Páginas estáticas" link
components/admin/themes/ThemeSectionList.tsx     # link "Páginas" to /admin/paginas
```

---

## Phase A — Data + permissions

### Task 1: Prisma model + migration

In `prisma/schema.prisma`, near `LandingTemplate`/`TemplateBlock`:

```prisma
model Page {
  id          String      @id @default(cuid())
  slug        String      @unique
  title       String
  description String?     /// SEO meta description; falls back to title.
  active      Boolean     @default(true)
  createdBy   String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  pageBlocks  PageBlock[]

  @@index([slug, active])
}

model PageBlock {
  id        String           @id @default(cuid())
  pageId    String
  page      Page             @relation(fields: [pageId], references: [id], onDelete: Cascade)
  type      LandingBlockType
  position  Int
  content   Json             @default("{}")
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@index([pageId, position])
}
```

Run:

```bash
npx prisma migrate dev --name add_page
npx prisma generate
```

(If the prisma generate hits the EPERM-on-binary issue from Plan 4, close the dev server first.)

Verify: `npx tsc --noEmit`. Commit:

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(pages): Page + PageBlock prisma model + migration"
```

### Task 2: Permissions

Create `scripts/setup-pages-permissions.ts` mirroring `setup-themes-permissions.ts`. Permissions: `pages:view`, `pages:create`, `pages:update`, `pages:delete`.

Run locally: `npx tsx scripts/setup-pages-permissions.ts`. Commit:

```bash
git add scripts/setup-pages-permissions.ts
git commit -m "feat(rbac): add pages permissions"
```

### Task 3: Reserved slugs helper

Create `lib/pages/reserved-slugs.ts`:

```typescript
/**
 * Slugs the admin CANNOT use when creating Pages because the storefront
 * already renders them via hardcoded route files in app/(shop)/<slug>/page.tsx.
 *
 * Plan 5 keeps the hardcoded files untouched — when one of these slugs is
 * created in the DB, the storefront would still serve the hardcoded version
 * (Next.js prefers static routes over the catch-all). To avoid the confusing
 * "I created a page but it doesn't render" scenario, we block these slugs at
 * the server-action layer with a clear error message.
 *
 * Plan 5.5 (future): migrate each hardcoded page to a seeded Page record and
 * delete the file. Then this list shrinks accordingly.
 */
export const RESERVED_PAGE_SLUGS = new Set<string>([
  "nosotros",
  "terminos",
  "privacidad",
  "envios",
  "preguntas",
  "contacto",
  "devoluciones",
  "diagnostico",
  // System / non-content routes that must never collide:
  "carrito",
  "checkout",
  "productos",
  "categoria",
  "orden",
  "iniciar-sesion",
  "registro",
  "cuenta",
  "libro-reclamaciones",
  "newsletter",
  "robots.txt",
  "sitemap.xml",
  "admin",
  "admin-auth",
  "api",
])

export function isReservedSlug(slug: string): boolean {
  return RESERVED_PAGE_SLUGS.has(slug.toLowerCase().trim())
}
```

Verify + commit:

```bash
npx tsc --noEmit
git add lib/pages/reserved-slugs.ts
git commit -m "feat(pages): reserved-slugs helper to prevent collisions with hardcoded routes"
```

### Task 4: Server actions

Create `actions/pages.ts`:

```typescript
"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"
import type { LandingBlockType } from "@prisma/client"
import { isReservedSlug } from "@/lib/pages/reserved-slugs"

export interface PageRow {
  id: string
  slug: string
  title: string
  description: string | null
  active: boolean
  blockCount: number
  updatedAt: Date
}

export interface PageWithBlocks extends PageRow {
  pageBlocks: { id: string; type: string; position: number; content: unknown }[]
}

export async function listPages(): Promise<PageRow[]> {
  await protectRoute("pages:view")
  const rows = await prisma.page.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, slug: true, title: true, description: true, active: true,
      updatedAt: true, _count: { select: { pageBlocks: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id, slug: r.slug, title: r.title, description: r.description,
    active: r.active, blockCount: r._count.pageBlocks, updatedAt: r.updatedAt,
  }))
}

export async function getPage(id: string): Promise<PageWithBlocks | null> {
  await protectRoute("pages:view")
  const p = await prisma.page.findUnique({
    where: { id },
    include: {
      pageBlocks: { orderBy: { position: "asc" } },
      _count: { select: { pageBlocks: true } },
    },
  })
  if (!p) return null
  return {
    id: p.id, slug: p.slug, title: p.title, description: p.description,
    active: p.active, blockCount: p._count.pageBlocks, updatedAt: p.updatedAt,
    pageBlocks: p.pageBlocks.map((b) => ({
      id: b.id, type: b.type, position: b.position, content: b.content,
    })),
  }
}

function normalizeSlug(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

export async function createPage(input: {
  slug: string
  title: string
  description?: string
}): Promise<{ id: string }> {
  const userId = await protectRoute("pages:create")
  if (!input.title.trim()) throw new Error("El título es obligatorio")

  const slug = normalizeSlug(input.slug)
  if (!slug) throw new Error("El slug es obligatorio")
  if (isReservedSlug(slug)) {
    throw new Error(
      `El slug "${slug}" está reservado por el sistema. Elegí otro.`,
    )
  }

  const exists = await prisma.page.findUnique({ where: { slug }, select: { id: true } })
  if (exists) throw new Error(`Ya existe una página con el slug "${slug}".`)

  const p = await prisma.page.create({
    data: {
      slug,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      createdBy: userId,
    },
  })
  revalidatePath("/admin/paginas")
  return { id: p.id }
}

export async function updatePageMetadata(
  id: string,
  input: { slug?: string; title?: string; description?: string | null; active?: boolean },
): Promise<void> {
  await protectRoute("pages:update")

  let nextSlug: string | undefined
  if (input.slug !== undefined) {
    nextSlug = normalizeSlug(input.slug)
    if (!nextSlug) throw new Error("El slug es obligatorio")
    if (isReservedSlug(nextSlug)) {
      throw new Error(`El slug "${nextSlug}" está reservado.`)
    }
    const existing = await prisma.page.findUnique({
      where: { slug: nextSlug },
      select: { id: true },
    })
    if (existing && existing.id !== id) {
      throw new Error(`Ya existe otra página con el slug "${nextSlug}".`)
    }
  }

  const previous = await prisma.page.findUnique({
    where: { id },
    select: { slug: true },
  })

  await prisma.page.update({
    where: { id },
    data: {
      ...(nextSlug !== undefined && { slug: nextSlug }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.active !== undefined && { active: input.active }),
    },
  })

  if (previous?.slug) updateTag(`page:${previous.slug}`)
  if (nextSlug) updateTag(`page:${nextSlug}`)
  revalidatePath("/admin/paginas")
}

interface IncomingBlock {
  id: string
  type: LandingBlockType
  position: number
  content: unknown
}

export async function savePageBlocks(
  pageId: string,
  incomingBlocks: IncomingBlock[],
): Promise<{ success: true }> {
  await protectRoute("pages:update")

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { slug: true },
  })
  if (!page) throw new Error("Página no encontrada")

  await prisma.$transaction(async (tx) => {
    const existing = await tx.pageBlock.findMany({
      where: { pageId },
      select: { id: true },
    })
    const existingIds = new Set(existing.map((b) => b.id))
    const incomingIds = new Set(incomingBlocks.map((b) => b.id))

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length > 0) {
      await tx.pageBlock.deleteMany({ where: { id: { in: toDelete } } })
    }

    for (const b of incomingBlocks) {
      if (b.id.startsWith("tmp-") || !existingIds.has(b.id)) {
        await tx.pageBlock.create({
          data: {
            pageId,
            type: b.type,
            position: b.position,
            content: b.content as object,
          },
        })
      } else {
        await tx.pageBlock.update({
          where: { id: b.id },
          data: { type: b.type, position: b.position, content: b.content as object },
        })
      }
    }

    await tx.page.update({ where: { id: pageId }, data: { updatedAt: new Date() } })
  })

  updateTag(`page:${page.slug}`)
  revalidatePath(`/admin/paginas/${pageId}`)
  return { success: true }
}

export async function deletePage(id: string): Promise<void> {
  await protectRoute("pages:delete")
  const p = await prisma.page.findUnique({ where: { id }, select: { slug: true } })
  if (!p) return
  await prisma.page.delete({ where: { id } })
  updateTag(`page:${p.slug}`)
  revalidatePath("/admin/paginas")
}
```

Verify + commit:

```bash
npx tsc --noEmit
git add actions/pages.ts
git commit -m "feat(pages): server actions for Page CRUD + savePageBlocks"
```

---

## Phase B — Admin UI

### Task 5: Pages list page

Files:
- `app/admin/paginas/page.tsx` (server)
- `components/admin/pages/PageListGrid.tsx` (client, mirrors `TemplateLibraryGrid`)
- `components/admin/pages/CreatePageDialog.tsx` (client, slug + title + description fields)

The list shows each Page as a card with: title, slug as muted code, "Inactiva" badge if not active, block count, last updated. `⋯` menu: Editar contenido / Editar metadata / Eliminar.

Verify + commit:

```bash
npx tsc --noEmit
npm run build
git add app/admin/paginas/page.tsx components/admin/pages/PageListGrid.tsx components/admin/pages/CreatePageDialog.tsx
git commit -m "feat(pages): list page with grid + create dialog"
```

### Task 6: Page editor + builder shell

Files:
- `app/admin/paginas/[pageId]/page.tsx` (server)
- `components/admin/pages/PageBuilderShell.tsx` (client, mirrors `TemplateBuilderShell`)
- `components/admin/pages/PagePicker.tsx` (topbar dropdown like `TemplatePicker`)

`PageBuilderShell` reuses `PageBuilder` with `scope="page"`. Editor mode is template-style (explicit save), but the autosave model from products would also work — pick autosave (simpler) for Plan 5; we can switch to explicit save in a follow-up if propagation becomes an issue.

Add the route to the admin layout's "full-screen builder" detector so the chrome is hidden:

```typescript
const isPageEditor =
  /^\/admin\/paginas\/[^/]+$/.test(pathname ?? "") &&
  !/\/editar$/.test(pathname ?? "")
```

Add `isPageEditor` to the `isFullScreenBuilder` union.

Verify + commit (TWO commits):

```bash
git add components/admin/pages/PageBuilderShell.tsx components/admin/pages/PagePicker.tsx app/admin/paginas/[pageId]/page.tsx
git commit -m "feat(pages): page editor with builder shell + topbar picker"

git add app/admin/layout.tsx
git commit -m "fix(admin): hide chrome on page editor route"
```

### Task 7: Page metadata edit

Files:
- `app/admin/paginas/[pageId]/editar/page.tsx`
- `components/admin/pages/EditPageMetadataForm.tsx`

Form: slug + title + description + active toggle. Slug field uses the same normalization as the server action and shows a live preview "URL: /<slug>".

Verify + commit:

```bash
npx tsc --noEmit
git add app/admin/paginas/[pageId]/editar/ components/admin/pages/EditPageMetadataForm.tsx
git commit -m "feat(pages): edit metadata form (slug, title, description, active)"
```

### Task 8: Sidebar entry + theme section link

In `app/admin/layout.tsx` navItems, add an entry "Páginas" pointing to `/admin/paginas`, after "Plantillas de Landing". Use the `FileText` icon (already imported).

In `components/admin/themes/ThemeSectionList.tsx`, change the "Páginas estáticas" section so it's now interactive:
- `status: "active"` (not `coming-soon`)
- Clicking navigates to `/admin/paginas`
- Wire `onClick` to `router.push`. Receive `router` via props or use `useRouter` inside the section.

Verify + commit:

```bash
npx tsc --noEmit
git add app/admin/layout.tsx components/admin/themes/ThemeSectionList.tsx
git commit -m "feat(pages): sidebar entry + theme section enabled"
```

---

## Phase C — Storefront integration

### Task 9: Catch-all storefront route

Create `app/(shop)/[slug]/page.tsx`:

```tsx
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import LandingBlockRenderer from "@/components/shop/templates/blocks/LandingBlockRenderer"
import type { LandingBlock } from "@/lib/types/landing-blocks"
import { isReservedSlug } from "@/lib/pages/reserved-slugs"

export const revalidate = 60 // ISR — page tag invalidates on save

interface Params {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params
  if (isReservedSlug(slug)) return {}
  const page = await prisma.page.findUnique({
    where: { slug, active: true },
    select: { title: true, description: true },
  })
  if (!page) return {}
  return {
    title: page.title,
    description: page.description ?? undefined,
  }
}

export default async function DynamicPage({ params }: Params) {
  const { slug } = await params
  // Defensive — Next routing already prefers hardcoded routes; this guards
  // against accidental DB collisions or stray seeded pages.
  if (isReservedSlug(slug)) notFound()

  const page = await prisma.page.findUnique({
    where: { slug, active: true },
    include: { pageBlocks: { orderBy: { position: "asc" } } },
  })
  if (!page) notFound()

  const blocks: LandingBlock[] = page.pageBlocks.map((b) => ({
    id: b.id,
    productId: "",
    type: b.type,
    position: b.position,
    content: b.content as unknown,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  return (
    <div className="min-h-screen">
      <LandingBlockRenderer blocks={blocks} />
    </div>
  )
}
```

Verify the catch-all is correctly lower-priority than hardcoded routes:

- Visit `/nosotros` → still renders the hardcoded file.
- Create a Page in the admin with slug `prueba` → visit `/prueba` → renders the Page's blocks.

Verify + commit:

```bash
npx tsc --noEmit
npm run build
git add app/\(shop\)/\[slug\]/page.tsx
git commit -m "feat(pages): catch-all storefront route renders Page by slug"
```

---

## Phase D — Final

### Task 10: Smoke test + merge

Manual:
1. Run `npx tsx scripts/setup-pages-permissions.ts` once.
2. Sidebar shows "Páginas". Click → empty list.
3. Click "+ Nueva página". Try to use slug "nosotros" → blocked with "reservado" error. Use slug "promociones" → succeeds. Lands on the editor.
4. Editor is full-screen (no admin chrome). Add 2-3 blocks (HERO, RICH_TEXT, BENEFITS). Autosaves.
5. Visit `/promociones` on the storefront → blocks render.
6. Edit metadata: change description, set active=false → page returns 404 on storefront.
7. Re-activate → renders again.
8. Delete the page → removed from list and 404 on storefront.
9. Verify hardcoded page `/nosotros` still works untouched.
10. Open `/admin/personalizar` → "Páginas estáticas" section is now active and navigates to `/admin/paginas`.

Build:

```bash
npx tsc --noEmit
npm run build
```

Merge:

```bash
git checkout master
git merge --no-ff feature/page-builder-plan-5-static-pages -m "Merge Plan 5: static pages with blocks"
git branch -d feature/page-builder-plan-5-static-pages
```

---

## What's next

- **Plan 5.5** — Migrate hardcoded `(shop)/<slug>/page.tsx` files (Nosotros, Términos, FAQ, Envíos, Privacidad, Contacto, Devoluciones) into seeded Page records and delete the files. Removes those slugs from `RESERVED_PAGE_SLUGS`.
- **Plan 6** — Home page with blocks. Adds a `home` slug or a separate Home model and replaces `app/page.tsx`.
- **Plan 7** — Categories / collections.
- **Plan 8** — Cart, header & footer, 404, search.

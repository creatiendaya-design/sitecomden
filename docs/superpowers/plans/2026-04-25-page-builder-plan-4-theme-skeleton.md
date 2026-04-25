# Page Builder — Plan 4: Theme Skeleton (Active Theme + Default Product Landing)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add the **Theme** concept as the umbrella under which all storefront pages (home, cart, product default, static pages, etc.) will eventually live. This plan delivers ONLY the skeleton: the model, an admin entry to manage themes, and the wiring so that products **without** an explicit landing template fall back to the **active theme's `defaultProductLandingTemplateId`**.

Page-specific editors (home, cart, static pages, collections) come in later plans (5, 6, 7…). The `LandingTemplate` model from Plan 3 is **not modified** — landing templates remain independent and can be reused across themes.

**Architecture:**

- New Prisma model `Theme { id, name, description?, active, defaultProductLandingTemplateId?, … }`.
- "Active theme" enforced via `Setting.activeThemeId` (singleton). Only one theme can be active at a time.
- `resolveProductBlocks` gains a fallback: when a product has neither its own `landingTemplateId` nor pure-local blocks, it uses `theme.defaultProductLandingTemplateId` from the active theme.
- Sidebar gains a new entry **"Personalizar tienda"** → theme editor. The existing entry for landing templates is renamed back to **"Plantillas de Landing"** (since "Personalizar tienda" is now the theme editor, not the landing-template list).
- The theme editor shows the theme's metadata + a list of "sections" (Home / Cart / Producto / Páginas / Colecciones / Header & Footer). Only the **Producto** section is interactive in this plan (it shows the `defaultProductLandingTemplateId` picker). Other sections render placeholders that say "Próximamente — Plan N".

**Preceded by:** Plan 3 (templates with sync), GALLERY migration, polish — all merged.
**Followed by:** Plan 5 (static pages), Plan 6 (home), Plan 7 (collections), Plan 8 (cart/404).

**Pre-flight:**

```bash
git checkout master
git status
git checkout -b feature/page-builder-plan-4-theme-skeleton
```

---

## File Structure

**New files:**
```
prisma/migrations/<ts>_add_theme/migration.sql   # via `prisma migrate dev`

actions/themes.ts                                 # Server Actions for Theme CRUD
lib/themes/get-active-theme.ts                    # Cached helper to fetch the active theme

app/admin/personalizar/
├── page.tsx                                      # Active-theme editor
├── temas/
│   ├── page.tsx                                  # Theme list (manage all themes)
│   ├── nuevo/page.tsx                            # Create new theme
│   └── [themeId]/
│       └── editar/page.tsx                       # Edit theme metadata

components/admin/themes/
├── ActiveThemeEditor.tsx                         # The "Personalizar tienda" landing
├── ThemeSectionList.tsx                          # Sections grid: Home/Cart/Producto/etc.
├── ThemeProductDefaultPicker.tsx                 # Pick default landing template
├── ThemeListGrid.tsx                             # Manage all themes
├── EditThemeMetadataForm.tsx
└── CreateThemeDialog.tsx
```

**Modified files:**
```
prisma/schema.prisma                              # add Theme model + Setting.activeThemeId convention
lib/blocks/resolve-product-blocks.ts              # fall back to theme's default
app/admin/layout.tsx                              # split sidebar entry: "Personalizar tienda" + "Plantillas de Landing"
scripts/setup-landing-templates-permissions.ts    # add `themes:*` permissions (or new script)
```

---

## Phase A — Theme model + resolver

### Task 1: Prisma model + migration

**Files:** `prisma/schema.prisma`

Add the model. Place near `LandingTemplate`:

```prisma
model Theme {
  id                                String   @id @default(cuid())
  name                              String
  description                       String?
  /** Whether this theme is the currently active theme. Enforced as a
   *  singleton in code (only one theme has active=true at any time). */
  active                            Boolean  @default(false)
  /** Default product landing template — used when a product has no
   *  landingTemplateId of its own. Null = no default; products without
   *  their own template render with no landing blocks. */
  defaultProductLandingTemplateId   String?
  defaultProductLandingTemplate     LandingTemplate? @relation(fields: [defaultProductLandingTemplateId], references: [id], onDelete: SetNull)

  createdBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([active])
}
```

And on `LandingTemplate`, add the back-relation:

```prisma
themesUsingAsDefault Theme[]
```

Run:

```bash
npx prisma migrate dev --name add_theme
npx prisma generate
```

Verify generated types compile: `npx tsc --noEmit`. Commit:

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(theme): Theme prisma model + migration"
```

### Task 2: Permissions

Create `scripts/setup-themes-permissions.ts` (mirror `scripts/setup-landing-templates-permissions.ts`):

Permissions:
- `themes:view`
- `themes:create`
- `themes:update`
- `themes:delete`
- `themes:activate` (separate because activating a theme has bigger blast radius)

Run locally:

```bash
npx tsx scripts/setup-themes-permissions.ts
```

Commit:

```bash
git add scripts/setup-themes-permissions.ts
git commit -m "feat(rbac): add themes permissions"
```

### Task 3: Server actions

**Files:** `actions/themes.ts`

```typescript
"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"

export interface ThemeRow {
  id: string
  name: string
  description: string | null
  active: boolean
  defaultProductLandingTemplateId: string | null
  defaultProductLandingTemplateName: string | null   // joined name for UI
  updatedAt: Date
}

export async function listThemes(): Promise<ThemeRow[]> {
  await protectRoute("themes:view")
  const rows = await prisma.theme.findMany({
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    include: {
      defaultProductLandingTemplate: { select: { id: true, name: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    active: r.active,
    defaultProductLandingTemplateId: r.defaultProductLandingTemplateId,
    defaultProductLandingTemplateName: r.defaultProductLandingTemplate?.name ?? null,
    updatedAt: r.updatedAt,
  }))
}

export async function getActiveTheme(): Promise<ThemeRow | null> {
  // Public-ish helper, allow read for admins.
  await protectRoute("themes:view")
  const t = await prisma.theme.findFirst({
    where: { active: true },
    include: { defaultProductLandingTemplate: { select: { id: true, name: true } } },
  })
  if (!t) return null
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    active: t.active,
    defaultProductLandingTemplateId: t.defaultProductLandingTemplateId,
    defaultProductLandingTemplateName: t.defaultProductLandingTemplate?.name ?? null,
    updatedAt: t.updatedAt,
  }
}

export async function createTheme(input: { name: string; description?: string }): Promise<{ id: string }> {
  const userId = await protectRoute("themes:create")
  if (!input.name.trim()) throw new Error("El nombre es obligatorio")

  // First theme created in the system becomes active automatically.
  const existingActive = await prisma.theme.count({ where: { active: true } })
  const theme = await prisma.theme.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      active: existingActive === 0,
      createdBy: userId,
    },
  })
  revalidatePath("/admin/personalizar")
  return { id: theme.id }
}

export async function updateThemeMetadata(
  id: string,
  input: { name?: string; description?: string | null; defaultProductLandingTemplateId?: string | null },
): Promise<void> {
  await protectRoute("themes:update")
  await prisma.theme.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
      ...(input.defaultProductLandingTemplateId !== undefined && {
        defaultProductLandingTemplateId: input.defaultProductLandingTemplateId,
      }),
    },
  })
  updateTag(`theme:${id}`)
  // Setting the default landing template invalidates EVERY product that
  // doesn't have its own landingTemplateId — too broad to enumerate, so we
  // bump a global tag the storefront listens on.
  updateTag("active-theme")
  revalidatePath("/admin/personalizar")
}

export async function setActiveTheme(id: string): Promise<void> {
  await protectRoute("themes:activate")
  await prisma.$transaction(async (tx) => {
    await tx.theme.updateMany({ where: { active: true }, data: { active: false } })
    await tx.theme.update({ where: { id }, data: { active: true } })
  })
  updateTag("active-theme")
  revalidatePath("/admin/personalizar")
  revalidatePath("/admin/personalizar/temas")
}

export async function deleteTheme(id: string): Promise<void> {
  await protectRoute("themes:delete")
  const t = await prisma.theme.findUnique({ where: { id }, select: { active: true } })
  if (!t) throw new Error("Tema no encontrado")
  if (t.active) throw new Error("No podés eliminar el tema activo. Activá otro primero.")
  await prisma.theme.delete({ where: { id } })
  revalidatePath("/admin/personalizar/temas")
}
```

Verify + commit:

```bash
npx tsc --noEmit
git add actions/themes.ts
git commit -m "feat(theme): server actions for theme CRUD + activate/deactivate"
```

### Task 4: Resolver fallback

**Files:** `lib/blocks/resolve-product-blocks.ts`

Update so when a product has NO `landingTemplateId` AND no pure-local blocks, fall back to the active theme's `defaultProductLandingTemplateId`. Algorithm:

1. Existing logic: if `product.landingTemplateId` set → use it.
2. NEW: if NOT set AND `product.landingBlocks` empty (or only contains overrides which is impossible without a template) → look up active theme. If `theme.defaultProductLandingTemplateId` is set, walk those blocks as `origin: "template"`.
3. Otherwise: existing pure-local fallback.

Pseudocode insert (add before the existing `if (!product.landingTemplateId)` branch):

```typescript
async function resolveFromProduct(product: ProductWithRelations): Promise<ResolvedProductBlock[]> {
  // If the product has no template AND no local blocks, fall back to the
  // active theme's default landing template. Editing those blocks in the
  // product detaches them per the existing flow (after we wire it).
  if (!product.landingTemplateId && product.landingBlocks.length === 0) {
    const activeTheme = await prisma.theme.findFirst({
      where: { active: true, defaultProductLandingTemplateId: { not: null } },
      select: { defaultProductLandingTemplateId: true },
    })
    if (activeTheme?.defaultProductLandingTemplateId) {
      const templateBlocks = await prisma.templateBlock.findMany({
        where: { templateId: activeTheme.defaultProductLandingTemplateId },
        orderBy: { position: "asc" },
      })
      return templateBlocks.map((tb) => ({
        id: tb.id,
        origin: "template" as const,
        type: tb.type as LandingBlockType,
        position: tb.position,
        content: tb.content as BlockContentV2,
        sourceTemplateBlockId: tb.id,
        hasLandingBlockRow: false,
      }))
    }
    // No active theme default → return empty (existing behavior).
  }

  // ...existing code below unchanged
}
```

Verify + commit:

```bash
npx tsc --noEmit
git add lib/blocks/resolve-product-blocks.ts
git commit -m "feat(theme): products without their own template inherit from active theme default"
```

---

## Phase B — Theme admin

### Task 5: Sidebar split

**Files:** `app/admin/layout.tsx`

Restore "Plantillas de Landing" entry, and add new "Personalizar tienda" entry pointing to `/admin/personalizar`.

```typescript
// existing entries, then:
{
  href: "/admin/personalizar",
  icon: Store,           // already imported
  label: "Personalizar tienda",
},
{
  href: "/admin/landing-plantillas",
  icon: LayoutTemplate,
  label: "Plantillas de Landing",
},
```

NOTE: today the sidebar has only "Personalizar tienda" pointing to `/admin/landing-plantillas`. Plan 4 splits these into TWO entries: theme editor + landing-templates list.

Verify + commit:

```bash
npx tsc --noEmit
git add app/admin/layout.tsx
git commit -m "feat(theme): split sidebar into Personalizar tienda + Plantillas de Landing"
```

### Task 6: Active-theme editor page

**Files:**
- `app/admin/personalizar/page.tsx` (server)
- `components/admin/themes/ActiveThemeEditor.tsx` (client)
- `components/admin/themes/ThemeSectionList.tsx`
- `components/admin/themes/ThemeProductDefaultPicker.tsx`

Server page:

```tsx
import { protectRoute } from "@/lib/protect-route"
import { getActiveTheme, listThemes } from "@/actions/themes"
import { listLandingTemplates } from "@/actions/landing-templates"
import { ActiveThemeEditor } from "@/components/admin/themes/ActiveThemeEditor"

export default async function PersonalizarPage() {
  await protectRoute("themes:view")
  const [activeTheme, allThemes, landingTemplates] = await Promise.all([
    getActiveTheme(),
    listThemes(),
    listLandingTemplates({ active: true }),
  ])
  return (
    <ActiveThemeEditor
      activeTheme={activeTheme}
      allThemes={allThemes}
      landingTemplates={landingTemplates}
    />
  )
}
```

`ActiveThemeEditor.tsx` renders:

- **Header**: theme name + description + theme switcher (a Select listing all themes; changing it calls `setActiveTheme`). A "Crear tema" button.
- If no themes exist yet: a friendly empty state with a "+ Crear primer tema" CTA.
- Otherwise: a `ThemeSectionList` with entries:
  - **Producto** — interactive. Shows the current `defaultProductLandingTemplateName`. Clicking opens `ThemeProductDefaultPicker` to change it (a Select listing all active landing templates; saving calls `updateThemeMetadata`).
  - **Home** — placeholder card "Próximamente — Plan 6". Disabled.
  - **Cart** — placeholder. Disabled.
  - **Categorías** — placeholder. Disabled.
  - **Páginas estáticas** — placeholder. Disabled.
  - **Header & Footer** — placeholder. Disabled.
- A footer area with "Editar metadata" + "Cambiar de tema" + "Crear tema nuevo" actions.

Each section card has: an icon + label + status badge ("Activa" / "Próximamente") + a clickable area when interactive.

Verify + commit:

```bash
npx tsc --noEmit
npm run build
git add app/admin/personalizar/page.tsx components/admin/themes/
git commit -m "feat(theme): active-theme editor page with section list + product default picker"
```

### Task 7: Theme list + create + edit metadata

**Files:**
- `app/admin/personalizar/temas/page.tsx`
- `app/admin/personalizar/temas/nuevo/page.tsx` (or modal-driven)
- `app/admin/personalizar/temas/[themeId]/editar/page.tsx`
- `components/admin/themes/ThemeListGrid.tsx`
- `components/admin/themes/CreateThemeDialog.tsx`
- `components/admin/themes/EditThemeMetadataForm.tsx`

Mirror the pattern of `landing-templates/biblioteca`. The `ThemeListGrid` shows each theme as a card with name, description, "Activa" badge, and a `⋯` menu (Activar / Editar metadata / Eliminar). Activate calls `setActiveTheme`. Edit metadata navigates to `/[id]/editar`.

`CreateThemeDialog`: a small modal asking for name + description, posts to `createTheme`, redirects to `/admin/personalizar/temas/[id]/editar`.

`EditThemeMetadataForm`: name + description fields. Save calls `updateThemeMetadata`.

Verify + commit:

```bash
npx tsc --noEmit
npm run build
git add app/admin/personalizar/temas/ components/admin/themes/
git commit -m "feat(theme): theme list + create dialog + edit metadata page"
```

### Task 8: Final smoke test + merge

Manual:
1. Run `npx tsx scripts/setup-themes-permissions.ts` once.
2. Sidebar shows BOTH "Personalizar tienda" and "Plantillas de Landing".
3. Open "Personalizar tienda". If no theme exists, see empty state. Create the first theme.
4. The new theme is automatically active.
5. Section "Producto" shows "Sin plantilla por defecto". Click → picker → choose a landing template → save.
6. Now create a NEW product (no template assigned in the product builder). View on storefront → it renders the active theme's default product landing.
7. Open the existing test product (which has its own `landingTemplateId`) → unchanged.
8. Create a SECOND theme. From sidebar → activate. The product without its own template now uses the second theme's default (or empty if not set).
9. Try to delete the active theme → blocked with friendly error.

Build:

```bash
npx tsc --noEmit
npm run build
```

Both clean.

Merge:

```bash
git checkout master
git merge --no-ff feature/page-builder-plan-4-theme-skeleton -m "Merge Plan 4: Theme skeleton with active theme + default product landing"
git branch -d feature/page-builder-plan-4-theme-skeleton
```

---

## What's next

- **Plan 5** — Static pages with blocks. Add a `Page` model and reuse the page builder for `Nosotros / Términos / Privacidad / Envíos / FAQ / Contacto`. The active theme's "Páginas estáticas" section becomes interactive.
- **Plan 6** — Home with blocks.
- **Plan 7** — Collections / category pages.
- **Plan 8** — Cart, 404, search.
- **Plan 9** — Theme duplication, theme picker (browse + activate from a theme gallery), theme version history.

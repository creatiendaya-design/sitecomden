# Theme Sections Implementation Plan (Plan 16)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-`Menu`-reference model on `Theme.headerMenuId` / `Theme.footerMenuId` with a Shopify Online Store 2.0–style section group system: ordered, customizer-editable lists of typed sections with nested sub-blocks, a global registry of implementations, and a per-theme catalog (`Theme.sectionCatalog`) that curates which section types each theme exposes.

**Architecture:** Two new Prisma models (`ThemeSection`, `ThemeSectionBlock`) keyed by `(themeId, group)` with `position` ordering and `enabled` toggles. A global registry in `lib/theme-sections/registry.ts` defines 13 section types with schema-driven forms, default content, accepted sub-block types, and per-group instance limits. Storefront renderers in `components/shop/theme-sections/` replace the hardcoded `Header.tsx` / `Footer.tsx` layouts; the existing customizer `ZoneList` already has the three-zone Shopify layout — its Encabezado / Pie de página zones become sortable section editors. Migration is **expand-contract**: phase 1 (commit 1) creates new tables and backfills data while leaving old columns; phase 2 (commit 5) drops old columns once new code is verified live.

**Tech Stack:** Next.js 16 App Router, Prisma 6.19 + PostgreSQL (Neon), React 19, TypeScript 5, Tailwind v4, Zustand 5, @dnd-kit, Zod 4. Reuses `lib/blocks/forms/`, `lib/blocks/apply-style.ts`, `lib/blocks/resolve.ts`, `components/admin/page-builder/RightSidebar/` machinery.

**Spec ref:** [docs/superpowers/specs/2026-04-30-theme-sections-design.md](../specs/2026-04-30-theme-sections-design.md).

**Verification convention:** This project has no automated tests. Each task verifies via `npm run build` (type-check + lint) and manual smoke testing in the browser — see CLAUDE.md.

**Pre-flight:**

```bash
git checkout master
git pull
git status   # working tree should be clean of unrelated changes
git checkout -b feature/plan-16-theme-sections
```

---

## File Structure

**Phase A — Schema + types**

```
prisma/migrations/<timestamp>_theme_sections_expand/migration.sql   (new)
prisma/schema.prisma                                                (modified)
lib/theme-sections/types.ts                                         (new)
scripts/backfill-footer-columns.ts                                  (new)
```

**Phase B — Registry + server actions**

```
lib/theme-sections/registry.ts                                      (new)
lib/theme-sections/schema/announcement-bar.ts                       (new)
lib/theme-sections/schema/header-main.ts                            (new)
lib/theme-sections/schema/header-logo.ts                            (new)
lib/theme-sections/schema/header-nav.ts                             (new)
lib/theme-sections/schema/mega-menu.ts                              (new)
lib/theme-sections/schema/header-search.ts                          (new)
lib/theme-sections/schema/header-promo-banner.ts                    (new)
lib/theme-sections/schema/footer-columns.ts                         (new)
lib/theme-sections/schema/footer-newsletter.ts                      (new)
lib/theme-sections/schema/footer-social.ts                          (new)
lib/theme-sections/schema/footer-rich-text.ts                       (new)
lib/theme-sections/schema/footer-payment-icons.ts                   (new)
lib/theme-sections/schema/footer-copyright.ts                       (new)
lib/theme-sections/index.ts                                         (new — re-exports + registers all)
lib/theme-sections/resolve-active-sections.ts                       (new)
components/admin/page-builder/forms/MenuItemListField.tsx           (new — custom field)
components/admin/page-builder/forms/SchemaForm.tsx                  (modified — register new field)
actions/theme-sections.ts                                           (new)
```

**Phase C — Storefront renderers + shells**

```
components/shop/theme-sections/ThemeSectionRenderer.tsx             (new)
components/shop/theme-sections/header/AnnouncementBar.tsx           (new)
components/shop/theme-sections/header/HeaderMain.tsx                (new)
components/shop/theme-sections/header/HeaderLogo.tsx                (new)
components/shop/theme-sections/header/HeaderNav.tsx                 (new)
components/shop/theme-sections/header/MegaMenu.tsx                  (new)
components/shop/theme-sections/header/HeaderSearch.tsx              (new)
components/shop/theme-sections/header/HeaderPromoBanner.tsx         (new)
components/shop/theme-sections/footer/FooterColumns.tsx             (new)
components/shop/theme-sections/footer/FooterNewsletter.tsx          (new)
components/shop/theme-sections/footer/FooterSocial.tsx              (new)
components/shop/theme-sections/footer/FooterRichText.tsx            (new)
components/shop/theme-sections/footer/FooterPaymentIcons.tsx        (new)
components/shop/theme-sections/footer/FooterCopyright.tsx           (new)
components/shop/legacy/LegacyHeader.tsx                             (new — current Header.tsx body)
components/shop/legacy/LegacyFooter.tsx                             (new — current Footer.tsx body)
components/shop/Header.tsx                                          (rewritten as shell)
components/shop/Footer.tsx                                          (rewritten as shell)
```

**Phase D — Customizer integration**

```
components/admin/customizer/theme-sections-store.ts                 (new — Zustand)
components/admin/customizer/ThemeSectionGroupEditor.tsx             (new)
components/admin/customizer/AddSectionPanel.tsx                     (new)
components/admin/customizer/ZoneList.tsx                            (modified)
components/admin/customizer/CustomizerShell.tsx                     (modified)
components/admin/page-builder/RightSidebar/RightSidebar.tsx         (modified — accept section/section-block targets)
app/admin/personalizar/temas/[themeId]/customize/page.tsx           (modified — fetch initial sections)
```

**Phase E — Contract + cleanup**

```
prisma/migrations/<timestamp>_theme_sections_contract/migration.sql (new)
prisma/schema.prisma                                                (modified — drop columns)
actions/themes.ts                                                   (modified — drop headerMenuId/footerMenuId from ThemeRow)
components/admin/customizer/ZoneList.tsx                            (modified — drop MenuPickerSection)
components/admin/themes/ThemeMenuPicker.tsx                         (deleted, if still present)
```

**Phase F — Per-theme catalog UI (optional)**

```
components/admin/customizer/ThemeCatalogPanel.tsx                   (new)
components/admin/customizer/CustomizerTokensPanel.tsx               (modified — add catalog tab)
actions/theme-sections.ts                                           (modified — add updateSectionCatalog)
```

---

# Phase A — Schema + Types + Backfill

## Task A1: Add Prisma models and `Theme.sectionCatalog`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Edit `prisma/schema.prisma`**

In the existing `Theme` model (around line 1205), keep `headerMenuId` and `footerMenuId` for now (Phase 1 expand). Add `sectionCatalog` and the `sections` relation:

```prisma
model Theme {
  // ... existing fields unchanged ...

  /// Plan 16 — per-theme catalog of section types this theme exposes.
  /// Shape: { header?: string[], footer?: string[] }. Empty {} = permissive
  /// default (all registry types available). The customizer's
  /// AddSectionPanel intersects the registry with this catalog.
  sectionCatalog Json @default("{}")

  /// Plan 16 — ordered Header / Footer sections that drive the storefront
  /// header and footer. Replaces the legacy single-Menu reference model
  /// once Phase 2 (contract migration) drops headerMenuId/footerMenuId.
  sections ThemeSection[]

  // ... existing fields unchanged ...
}
```

Add the two new models and the enum at the end of the file (after `Theme`):

```prisma
/// Plan 16 — one section instance inside a theme's Header or Footer group.
/// Ordered by `position` within `(themeId, group)`. `content` follows the
/// same convention as LandingBlock.content: schema-defined fields at the
/// top level plus an optional `style` BlockStyle.
model ThemeSection {
  id        String              @id @default(cuid())
  themeId   String
  theme     Theme               @relation(fields: [themeId], references: [id], onDelete: Cascade)
  group     ThemeSectionGroup
  /// Type id from lib/theme-sections/registry.ts (e.g. "HEADER_MAIN").
  /// String — not enum — so adding a section type does not require migration.
  type      String
  position  Int
  content   Json                @default("{}")
  /// Toggle visibility from the customizer eye icon without destroying content.
  enabled   Boolean             @default(true)
  blocks    ThemeSectionBlock[]
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  @@index([themeId, group, position])
}

/// Plan 16 — sub-block inside a ThemeSection (e.g. a LINK_COLUMN inside
/// FOOTER_COLUMNS, a MEGA_MENU_PANEL inside MEGA_MENU). Ordered by
/// `position` within its parent section.
model ThemeSectionBlock {
  id        String       @id @default(cuid())
  sectionId String
  section   ThemeSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  type      String
  position  Int
  content   Json         @default("{}")
  enabled   Boolean      @default(true)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@index([sectionId, position])
}

enum ThemeSectionGroup {
  HEADER
  FOOTER
}
```

- [ ] **Step 2: Generate the migration**

```bash
npx prisma migrate dev --name theme_sections_expand --create-only
```

This creates `prisma/migrations/<timestamp>_theme_sections_expand/migration.sql` but does **not** apply it yet (we want to inspect it).

- [ ] **Step 3: Inspect generated SQL**

Open the generated migration file. Confirm it contains:
- `CREATE TYPE "ThemeSectionGroup" AS ENUM ('HEADER', 'FOOTER');`
- `CREATE TABLE "ThemeSection" (...)` with `themeId` FK + cascade.
- `CREATE TABLE "ThemeSectionBlock" (...)` with `sectionId` FK + cascade.
- `CREATE INDEX "ThemeSection_themeId_group_position_idx" ON "ThemeSection"("themeId", "group", "position")`.
- `CREATE INDEX "ThemeSectionBlock_sectionId_position_idx" ON "ThemeSectionBlock"("sectionId", "position")`.
- `ALTER TABLE "Theme" ADD COLUMN "sectionCatalog" JSONB NOT NULL DEFAULT '{}'`.
- **No** `DROP COLUMN` for `headerMenuId` / `footerMenuId` (those drop in Phase E).

- [ ] **Step 4: Append backfill SQL to the migration**

At the end of the same `migration.sql`, add the following idempotent backfill (only inserts where the section does not yet exist):

```sql
-- Backfill default sections for every existing theme. Idempotent: each
-- INSERT is guarded by NOT EXISTS so re-running is safe.

-- HEADER_MAIN at position 0 (carries the legacy headerMenuId in content.menuId).
INSERT INTO "ThemeSection" ("id", "themeId", "group", "type", "position", "content", "enabled", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t.id,
  'HEADER',
  'HEADER_MAIN',
  0,
  jsonb_build_object('menuId', t."headerMenuId"),
  true,
  now(),
  now()
FROM "Theme" t
WHERE NOT EXISTS (
  SELECT 1 FROM "ThemeSection" s
  WHERE s."themeId" = t.id AND s."group" = 'HEADER' AND s."type" = 'HEADER_MAIN'
);

-- FOOTER_COLUMNS at position 0 (carries the legacy footerMenuId in __legacyFooterMenuId,
-- which the backfill script consumes to create LINK_COLUMN sub-blocks).
INSERT INTO "ThemeSection" ("id", "themeId", "group", "type", "position", "content", "enabled", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t.id,
  'FOOTER',
  'FOOTER_COLUMNS',
  0,
  jsonb_build_object(
    '__legacyFooterMenuId', t."footerMenuId",
    'aboutTitle', '',
    'aboutText', ''
  ),
  true,
  now(),
  now()
FROM "Theme" t
WHERE NOT EXISTS (
  SELECT 1 FROM "ThemeSection" s
  WHERE s."themeId" = t.id AND s."group" = 'FOOTER' AND s."type" = 'FOOTER_COLUMNS'
);

-- FOOTER_COPYRIGHT at position 1.
INSERT INTO "ThemeSection" ("id", "themeId", "group", "type", "position", "content", "enabled", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t.id,
  'FOOTER',
  'FOOTER_COPYRIGHT',
  1,
  '{}'::jsonb,
  true,
  now(),
  now()
FROM "Theme" t
WHERE NOT EXISTS (
  SELECT 1 FROM "ThemeSection" s
  WHERE s."themeId" = t.id AND s."group" = 'FOOTER' AND s."type" = 'FOOTER_COPYRIGHT'
);
```

Note: Prisma's `cuid()` only works in app code. The SQL uses `gen_random_uuid()::text` — Postgres extension `pgcrypto` is enabled by default on Neon, but if the migration fails with `function gen_random_uuid() does not exist`, prepend the migration with `CREATE EXTENSION IF NOT EXISTS pgcrypto;`. The generated id format differs from cuid but both are unique strings; Prisma reads them transparently.

- [ ] **Step 5: Apply the migration to the dev DB**

```bash
npx prisma migrate dev
```

Expected: migration applies cleanly. Prisma regenerates the client.

- [ ] **Step 6: Verify in Prisma Studio**

```bash
npx prisma studio
```

Open the `ThemeSection` table. Confirm:
- One `HEADER_MAIN` row per theme with `content.menuId` matching the theme's old `headerMenuId`.
- One `FOOTER_COLUMNS` row per theme with `content.__legacyFooterMenuId` set.
- One `FOOTER_COPYRIGHT` row per theme.

Open the `Theme` table — `headerMenuId` and `footerMenuId` are still present (this is intentional for expand phase).

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: PASS. Type errors here would mean the Prisma client did not regenerate; re-run `npx prisma generate`.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(theme-sections): add ThemeSection / ThemeSectionBlock schema (expand phase)"
```

---

## Task A2: Shared TypeScript types

**Files:**
- Create: `lib/theme-sections/types.ts`

- [ ] **Step 1: Create `lib/theme-sections/types.ts`**

```ts
import type { LucideIcon } from "lucide-react"
import type { ThemeSectionGroup } from "@prisma/client"
import type { BlockStyle } from "@/lib/blocks/types"
import type { FormSchema } from "@/lib/blocks/schema/types"

export type { ThemeSectionGroup }

/**
 * The shape persisted in `ThemeSection.content` and `ThemeSectionBlock.content`.
 * Mirrors the convention used for landing blocks: schema-defined fields at the
 * top level plus an optional `style` (BlockStyle from lib/blocks/types.ts).
 */
export interface ThemeSectionContent {
  [key: string]: unknown
  style?: BlockStyle
}

/**
 * One section instance after Prisma fetch + style/visibility resolution.
 * Consumers (renderers) read `content` for type-specific fields and
 * `resolvedStyle` for the device-flattened style.
 */
export interface ResolvedThemeSection {
  id: string
  themeId: string
  group: ThemeSectionGroup
  type: string
  position: number
  enabled: boolean
  content: ThemeSectionContent
  blocks: ResolvedThemeSectionBlock[]
}

export interface ResolvedThemeSectionBlock {
  id: string
  sectionId: string
  type: string
  position: number
  enabled: boolean
  content: ThemeSectionContent
}

/**
 * Definition of a section type registered in the global registry.
 * The customizer reads `fields` to render the SchemaForm, `acceptedBlockTypes`
 * to populate the "+ Agregar bloque" panel inside a section, and
 * `maxPerGroup` to gate the AddSectionPanel.
 */
export interface ThemeSectionDefinition {
  /** Registry id, e.g. "HEADER_MAIN". UPPER_SNAKE_CASE convention. */
  type: string
  /** Groups this type may appear in. Most are HEADER-only or FOOTER-only;
   *  some (e.g. RICH_TEXT) could accept both. */
  groups: ThemeSectionGroup[]
  label: string
  description?: string
  icon: LucideIcon
  /** Schema-driven form field list — same FormSchema used by lib/blocks. */
  fields: FormSchema
  /** Accepted sub-block types. Empty/undefined = no inner blocks. */
  acceptedBlockTypes?: ThemeSectionBlockDefinition[]
  /** Max number of instances of this type per group (per theme). Undefined = unlimited. */
  maxPerGroup?: number
  defaultContent: ThemeSectionContent
  /** Sub-blocks created automatically when this section is added. */
  defaultBlocks?: Array<{ type: string; content: ThemeSectionContent }>
}

export interface ThemeSectionBlockDefinition {
  type: string
  label: string
  icon: LucideIcon
  fields: FormSchema
  defaultContent: ThemeSectionContent
  /** Max number of instances of this sub-block type per parent section. */
  maxPerSection?: number
}

/**
 * Per-theme catalog (Theme.sectionCatalog JSON). When empty the customizer
 * is permissive (all registry types available). When populated, the
 * AddSectionPanel only lists types that appear in the relevant group array.
 */
export interface ThemeSectionCatalog {
  header?: string[]
  footer?: string[]
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/theme-sections/types.ts
git commit -m "feat(theme-sections): shared TypeScript types"
```

---

## Task A3: Sub-block backfill script

**Files:**
- Create: `scripts/backfill-footer-columns.ts`

- [ ] **Step 1: Create the script**

```ts
/**
 * Plan 16 — Phase A backfill (one-shot, idempotent).
 *
 * For each FOOTER_COLUMNS section that still carries `content.__legacyFooterMenuId`,
 * read the referenced Menu, take its root items that have children, and create
 * one LINK_COLUMN ThemeSectionBlock per root. Then strip the marker so the
 * script is idempotent — re-running does nothing.
 *
 * Run AFTER `npx prisma migrate deploy` and BEFORE the new code reads from
 * ThemeSection (Phase C ships).
 *
 * Usage:
 *   npx tsx scripts/backfill-footer-columns.ts
 */
import { prisma } from "../lib/db"
import { resolveMenuItemHref } from "../lib/menus/resolve-link"

interface LinkColumnContent {
  title: string
  links: Array<{
    label: string
    href: string
    openInNewTab: boolean
  }>
}

async function main(): Promise<void> {
  const sections = await prisma.themeSection.findMany({
    where: { type: "FOOTER_COLUMNS", group: "FOOTER" },
    include: { blocks: true },
  })

  let processed = 0
  let skipped = 0

  for (const section of sections) {
    const content = (section.content ?? {}) as Record<string, unknown>
    const legacyMenuId = content.__legacyFooterMenuId

    if (typeof legacyMenuId !== "string" || legacyMenuId.length === 0) {
      skipped++
      continue
    }

    if (section.blocks.length > 0) {
      // Already populated by a prior run — strip marker and move on.
      const { __legacyFooterMenuId: _drop, ...rest } = content
      await prisma.themeSection.update({
        where: { id: section.id },
        data: { content: rest as object },
      })
      skipped++
      continue
    }

    const menu = await prisma.menu.findUnique({
      where: { id: legacyMenuId },
      include: {
        items: {
          where: { parentId: null },
          include: { children: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    })

    const rootColumns = menu?.items.filter((i) => i.children.length > 0) ?? []

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < rootColumns.length; i++) {
        const col = rootColumns[i]
        const blockContent: LinkColumnContent = {
          title: col.label,
          links: col.children
            .map((child) => {
              const href = resolveMenuItemHref(child)
              if (!href) return null
              return {
                label: child.label,
                href,
                openInNewTab: child.openInNewTab,
              }
            })
            .filter((l): l is LinkColumnContent["links"][number] => l !== null),
        }

        await tx.themeSectionBlock.create({
          data: {
            sectionId: section.id,
            type: "LINK_COLUMN",
            position: i,
            content: blockContent as object,
            enabled: true,
          },
        })
      }

      const { __legacyFooterMenuId: _drop, ...rest } = content
      await tx.themeSection.update({
        where: { id: section.id },
        data: { content: rest as object },
      })
    })

    processed++
  }

  console.log(`Backfill complete. Processed: ${processed}, skipped: ${skipped}.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run the script against the dev DB**

```bash
npx tsx scripts/backfill-footer-columns.ts
```

Expected output: `Backfill complete. Processed: <N>, skipped: 0.` where N = number of themes that had a `footerMenuId` and a non-empty footer menu.

- [ ] **Step 3: Verify in Prisma Studio**

Open `ThemeSectionBlock`. Confirm rows of `type: "LINK_COLUMN"` with `content.title` and `content.links` populated, parented to the `FOOTER_COLUMNS` section of each theme.

Open `ThemeSection` and find the `FOOTER_COLUMNS` rows. Confirm `content.__legacyFooterMenuId` has been stripped.

- [ ] **Step 4: Run again (idempotency check)**

```bash
npx tsx scripts/backfill-footer-columns.ts
```

Expected: `Processed: 0, skipped: <N>`.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add scripts/backfill-footer-columns.ts
git commit -m "feat(theme-sections): backfill script for FOOTER_COLUMNS sub-blocks"
```

---

# Phase B — Registry + Server Actions

## Task B1: Custom field — `MenuItemListField`

The `LINK_COLUMN` sub-block needs a UI to author a list of links. The page-builder `SchemaForm` already supports a custom-field hook; we register one new renderer.

**Files:**
- Create: `components/admin/page-builder/forms/MenuItemListField.tsx`

- [ ] **Step 1: Inspect current custom field registration**

Open `components/admin/page-builder/forms/SchemaForm.tsx` and find where custom field renderers are dispatched (look for switch/lookup on `field.kind` or `field.type`). Note the dispatch contract — it typically receives `{ field, value, onChange }`.

- [ ] **Step 2: Create `MenuItemListField.tsx`**

```tsx
"use client"

import { useCallback } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export interface MenuLink {
  label: string
  href: string
  openInNewTab: boolean
}

interface Props {
  value: MenuLink[] | undefined
  onChange: (next: MenuLink[]) => void
  maxLinks?: number
}

export function MenuItemListField({ value, onChange, maxLinks = 20 }: Props) {
  const links = value ?? []

  const update = useCallback(
    (idx: number, patch: Partial<MenuLink>) => {
      const next = links.map((l, i) => (i === idx ? { ...l, ...patch } : l))
      onChange(next)
    },
    [links, onChange],
  )

  const add = useCallback(() => {
    if (links.length >= maxLinks) return
    onChange([...links, { label: "", href: "", openInNewTab: false }])
  }, [links, maxLinks, onChange])

  const remove = useCallback(
    (idx: number) => {
      onChange(links.filter((_, i) => i !== idx))
    },
    [links, onChange],
  )

  const move = useCallback(
    (idx: number, dir: -1 | 1) => {
      const target = idx + dir
      if (target < 0 || target >= links.length) return
      const next = [...links]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      onChange(next)
    },
    [links, onChange],
  )

  return (
    <div className="space-y-2">
      {links.length === 0 && (
        <p className="text-xs text-muted-foreground">Sin enlaces todavía.</p>
      )}
      {links.map((link, idx) => (
        <div key={idx} className="rounded-md border p-2 space-y-2 bg-muted/20">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground p-1 cursor-grab"
              onClick={() => move(idx, -1)}
              aria-label="Mover arriba"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <Input
              value={link.label}
              placeholder="Etiqueta"
              onChange={(e) => update(idx, { label: e.target.value })}
              className="h-8 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => remove(idx)}
              aria-label="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input
            value={link.href}
            placeholder="https://… o /ruta"
            onChange={(e) => update(idx, { href: e.target.value })}
            className="h-8 text-sm"
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id={`new-tab-${idx}`}
              checked={link.openInNewTab}
              onCheckedChange={(v) => update(idx, { openInNewTab: v === true })}
            />
            <Label htmlFor={`new-tab-${idx}`} className="text-xs">
              Abrir en nueva pestaña
            </Label>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={add}
        disabled={links.length >= maxLinks}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Agregar enlace
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Register the new renderer in `SchemaForm.tsx`**

Locate the field-renderer dispatch in `components/admin/page-builder/forms/SchemaForm.tsx`. Add a case for `field.kind === "menu-item-list"` (or whichever discriminator the file uses) that returns:

```tsx
<MenuItemListField
  value={value as MenuLink[] | undefined}
  onChange={(next) => onChange(next)}
  maxLinks={field.maxLinks ?? 20}
/>
```

If the project's `FormField` type does not yet include `"menu-item-list"`, extend it in `lib/blocks/schema/types.ts` (find the `FormField` discriminated union and add a variant):

```ts
| { kind: "menu-item-list"; name: string; label: string; description?: string; maxLinks?: number }
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add components/admin/page-builder/forms/MenuItemListField.tsx components/admin/page-builder/forms/SchemaForm.tsx lib/blocks/schema/types.ts
git commit -m "feat(theme-sections): MenuItemListField custom form renderer"
```

---

## Task B2: Section type definitions — pattern + first 3 (Header)

This is the part that establishes the registration pattern. Once it's clear, the remaining 10 types follow the same shape.

**Files:**
- Create: `lib/theme-sections/schema/header-main.ts`
- Create: `lib/theme-sections/schema/announcement-bar.ts`
- Create: `lib/theme-sections/schema/header-logo.ts`

- [ ] **Step 1: `lib/theme-sections/schema/header-main.ts`**

`HEADER_MAIN` is the combo "logo + nav + search + cart" — covers the current hardcoded layout. Most relevant setting is which menu drives the nav.

```ts
import { LayoutGrid } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const headerMainDefinition: ThemeSectionDefinition = {
  type: "HEADER_MAIN",
  groups: ["HEADER"],
  label: "Encabezado principal",
  description: "Logo, menú, buscador, sesión y carrito en una sola fila.",
  icon: LayoutGrid,
  maxPerGroup: 1,
  fields: [
    {
      kind: "menu-picker",
      name: "menuId",
      label: "Menú a mostrar",
      description: "Si está vacío, usa el menú con slug 'main'.",
    },
    {
      kind: "boolean",
      name: "showSearch",
      label: "Mostrar buscador",
    },
    {
      kind: "boolean",
      name: "showAuth",
      label: "Mostrar acceso de cliente",
    },
    {
      kind: "boolean",
      name: "showCart",
      label: "Mostrar carrito",
    },
    {
      kind: "color-scheme",
      name: "style.colorSchemeId",
      label: "Esquema de color",
    },
    {
      kind: "padding",
      name: "style.paddingY",
      label: "Espaciado vertical",
    },
  ],
  defaultContent: {
    showSearch: true,
    showAuth: true,
    showCart: true,
    style: {},
  },
}
```

If `kind: "menu-picker"` does not exist yet in `FormField`, this is the time to add it. Look at the menu picker used in the current `ZoneList.MenuPickerSection` and extract a `MenuPickerField.tsx` into `components/admin/page-builder/forms/` mirroring the MenuItemListField pattern. Wire it up in `SchemaForm.tsx`'s dispatch and add the variant to `lib/blocks/schema/types.ts`:

```ts
| { kind: "menu-picker"; name: string; label: string; description?: string }
```

The picker fetches menus from a server action (use the existing `listMenusForPicker` if it exists, otherwise create one in `actions/menus.ts` that returns `MenuRow[]` filtered by `active: true` — gated by `themes:update`).

- [ ] **Step 2: `lib/theme-sections/schema/announcement-bar.ts`**

```ts
import { Megaphone } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const announcementBarDefinition: ThemeSectionDefinition = {
  type: "ANNOUNCEMENT_BAR",
  groups: ["HEADER"],
  label: "Barra de anuncios",
  description: "Mensaje breve sobre el encabezado, opcionalmente clickeable.",
  icon: Megaphone,
  maxPerGroup: 3,
  fields: [
    {
      kind: "text",
      name: "message",
      label: "Mensaje",
    },
    {
      kind: "text",
      name: "linkHref",
      label: "Enlace (opcional)",
      description: "Si está presente, toda la barra se vuelve un link.",
    },
    {
      kind: "boolean",
      name: "openInNewTab",
      label: "Abrir en nueva pestaña",
    },
    {
      kind: "color-scheme",
      name: "style.colorSchemeId",
      label: "Esquema de color",
    },
    {
      kind: "visibility",
      name: "style.visibility",
      label: "Visibilidad",
    },
  ],
  defaultContent: {
    message: "Envío gratis a todo el Perú",
    linkHref: "",
    openInNewTab: false,
    style: {},
  },
}
```

- [ ] **Step 3: `lib/theme-sections/schema/header-logo.ts`**

```ts
import { Image as ImageIcon } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const headerLogoDefinition: ThemeSectionDefinition = {
  type: "HEADER_LOGO",
  groups: ["HEADER"],
  label: "Logo",
  description: "Solo el logo de la tienda. Útil cuando el nav va en su propia fila.",
  icon: ImageIcon,
  maxPerGroup: 1,
  fields: [
    {
      kind: "alignment",
      name: "style.alignment",
      label: "Alineación",
    },
    {
      kind: "color-scheme",
      name: "style.colorSchemeId",
      label: "Esquema de color",
    },
    {
      kind: "padding",
      name: "style.paddingY",
      label: "Espaciado vertical",
    },
  ],
  defaultContent: {
    style: { alignment: "center" },
  },
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add lib/theme-sections/schema/ components/admin/page-builder/forms/MenuPickerField.tsx components/admin/page-builder/forms/SchemaForm.tsx lib/blocks/schema/types.ts actions/menus.ts
git commit -m "feat(theme-sections): HEADER_MAIN, ANNOUNCEMENT_BAR, HEADER_LOGO definitions + menu-picker field"
```

---

## Task B3: Remaining 4 header definitions

Apply the same pattern from Task B2. Each file exports one `ThemeSectionDefinition`.

**Files:**
- Create: `lib/theme-sections/schema/header-nav.ts`
- Create: `lib/theme-sections/schema/mega-menu.ts`
- Create: `lib/theme-sections/schema/header-search.ts`
- Create: `lib/theme-sections/schema/header-promo-banner.ts`

- [ ] **Step 1: `header-nav.ts`** — solo el menú principal (sin logo/search/cart).

```ts
import { Menu } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const headerNavDefinition: ThemeSectionDefinition = {
  type: "HEADER_NAV",
  groups: ["HEADER"],
  label: "Menú de navegación",
  icon: Menu,
  maxPerGroup: 1,
  fields: [
    { kind: "menu-picker", name: "menuId", label: "Menú a mostrar" },
    { kind: "alignment", name: "style.alignment", label: "Alineación" },
    { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
    { kind: "padding", name: "style.paddingY", label: "Espaciado vertical" },
    { kind: "visibility", name: "style.visibility", label: "Visibilidad" },
  ],
  defaultContent: { style: {} },
}
```

- [ ] **Step 2: `mega-menu.ts`** — menú con paneles ricos. Sub-blocks: `MEGA_MENU_PANEL`.

```ts
import { LayoutDashboard, ImagePlus } from "lucide-react"
import type { ThemeSectionDefinition, ThemeSectionBlockDefinition } from "../types"

const megaMenuPanelDefinition: ThemeSectionBlockDefinition = {
  type: "MEGA_MENU_PANEL",
  label: "Panel de mega menú",
  icon: ImagePlus,
  maxPerSection: 8,
  fields: [
    { kind: "text", name: "trigger", label: "Texto del trigger" },
    { kind: "image", name: "featuredImage", label: "Imagen destacada" },
    { kind: "text", name: "featuredImageHref", label: "Link de la imagen" },
    { kind: "menu-item-list", name: "links", label: "Enlaces", maxLinks: 12 },
  ],
  defaultContent: {
    trigger: "Categorías",
    featuredImage: "",
    featuredImageHref: "",
    links: [],
  },
}

export const megaMenuDefinition: ThemeSectionDefinition = {
  type: "MEGA_MENU",
  groups: ["HEADER"],
  label: "Mega menú",
  description: "Menú con paneles e imágenes destacadas, estilo premium.",
  icon: LayoutDashboard,
  maxPerGroup: 1,
  acceptedBlockTypes: [megaMenuPanelDefinition],
  fields: [
    { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
    { kind: "padding", name: "style.paddingY", label: "Espaciado vertical" },
    { kind: "visibility", name: "style.visibility", label: "Visibilidad" },
  ],
  defaultContent: { style: {} },
  defaultBlocks: [
    {
      type: "MEGA_MENU_PANEL",
      content: {
        trigger: "Productos",
        featuredImage: "",
        featuredImageHref: "",
        links: [],
      },
    },
  ],
}
```

- [ ] **Step 3: `header-search.ts`**

```ts
import { Search } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const headerSearchDefinition: ThemeSectionDefinition = {
  type: "HEADER_SEARCH",
  groups: ["HEADER"],
  label: "Buscador",
  icon: Search,
  maxPerGroup: 1,
  fields: [
    { kind: "text", name: "placeholder", label: "Placeholder" },
    { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
    { kind: "padding", name: "style.paddingY", label: "Espaciado vertical" },
    { kind: "visibility", name: "style.visibility", label: "Visibilidad" },
  ],
  defaultContent: {
    placeholder: "Buscar productos…",
    style: {},
  },
}
```

- [ ] **Step 4: `header-promo-banner.ts`**

```ts
import { Image as ImageIcon } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const headerPromoBannerDefinition: ThemeSectionDefinition = {
  type: "HEADER_PROMO_BANNER",
  groups: ["HEADER"],
  label: "Banner promocional",
  description: "Banner de imagen full-width sobre el resto del encabezado.",
  icon: ImageIcon,
  maxPerGroup: 2,
  fields: [
    { kind: "image", name: "image", label: "Imagen" },
    { kind: "text", name: "linkHref", label: "Enlace (opcional)" },
    { kind: "text", name: "altText", label: "Texto alternativo" },
    { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
    { kind: "visibility", name: "style.visibility", label: "Visibilidad" },
  ],
  defaultContent: {
    image: "",
    linkHref: "",
    altText: "",
    style: {},
  },
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add lib/theme-sections/schema/header-nav.ts lib/theme-sections/schema/mega-menu.ts lib/theme-sections/schema/header-search.ts lib/theme-sections/schema/header-promo-banner.ts
git commit -m "feat(theme-sections): remaining 4 header definitions"
```

---

## Task B4: 6 footer definitions

**Files:**
- Create: 6 files in `lib/theme-sections/schema/`

- [ ] **Step 1: `footer-columns.ts`** — sub-blocks: `LINK_COLUMN`, `TEXT_COLUMN`.

```ts
import { Columns, List, Type } from "lucide-react"
import type { ThemeSectionDefinition, ThemeSectionBlockDefinition } from "../types"

const linkColumnDefinition: ThemeSectionBlockDefinition = {
  type: "LINK_COLUMN",
  label: "Columna de enlaces",
  icon: List,
  maxPerSection: 6,
  fields: [
    { kind: "text", name: "title", label: "Título de la columna" },
    { kind: "menu-item-list", name: "links", label: "Enlaces", maxLinks: 15 },
  ],
  defaultContent: {
    title: "Tienda",
    links: [],
  },
}

const textColumnDefinition: ThemeSectionBlockDefinition = {
  type: "TEXT_COLUMN",
  label: "Columna de texto",
  icon: Type,
  maxPerSection: 3,
  fields: [
    { kind: "text", name: "title", label: "Título" },
    { kind: "rich-text", name: "body", label: "Texto" },
  ],
  defaultContent: { title: "Sobre nosotros", body: "" },
}

export const footerColumnsDefinition: ThemeSectionDefinition = {
  type: "FOOTER_COLUMNS",
  groups: ["FOOTER"],
  label: "Columnas de enlaces",
  description: "Columnas de navegación y texto para el pie de página.",
  icon: Columns,
  maxPerGroup: 1,
  acceptedBlockTypes: [linkColumnDefinition, textColumnDefinition],
  fields: [
    { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
    { kind: "padding", name: "style.paddingY", label: "Espaciado vertical" },
  ],
  defaultContent: { style: {} },
  defaultBlocks: [
    { type: "TEXT_COLUMN", content: { title: "Sobre nosotros", body: "" } },
  ],
}
```

- [ ] **Step 2: `footer-newsletter.ts`**

```ts
import { Mail } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const footerNewsletterDefinition: ThemeSectionDefinition = {
  type: "FOOTER_NEWSLETTER",
  groups: ["FOOTER"],
  label: "Newsletter",
  description: "Captura de email con confirmación.",
  icon: Mail,
  maxPerGroup: 1,
  fields: [
    { kind: "text", name: "title", label: "Título" },
    { kind: "rich-text", name: "description", label: "Descripción" },
    { kind: "text", name: "buttonLabel", label: "Etiqueta del botón" },
    { kind: "text", name: "successMessage", label: "Mensaje de éxito" },
    { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
    { kind: "padding", name: "style.paddingY", label: "Espaciado vertical" },
  ],
  defaultContent: {
    title: "Suscribite a nuestro newsletter",
    description: "Enterate de novedades y promociones.",
    buttonLabel: "Suscribirme",
    successMessage: "¡Gracias por suscribirte!",
    style: {},
  },
}
```

- [ ] **Step 3: `footer-social.ts`**

```ts
import { Share2 } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const footerSocialDefinition: ThemeSectionDefinition = {
  type: "FOOTER_SOCIAL",
  groups: ["FOOTER"],
  label: "Redes sociales",
  description: "Iconos de redes sociales (lee de Site Settings).",
  icon: Share2,
  maxPerGroup: 1,
  fields: [
    { kind: "text", name: "title", label: "Título" },
    { kind: "alignment", name: "style.alignment", label: "Alineación" },
    { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
    { kind: "padding", name: "style.paddingY", label: "Espaciado vertical" },
  ],
  defaultContent: { title: "Síguenos", style: { alignment: "center" } },
}
```

- [ ] **Step 4: `footer-rich-text.ts`**

```ts
import { FileText } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const footerRichTextDefinition: ThemeSectionDefinition = {
  type: "FOOTER_RICH_TEXT",
  groups: ["FOOTER"],
  label: "Texto enriquecido",
  description: "Bloque libre con Tiptap.",
  icon: FileText,
  fields: [
    { kind: "rich-text", name: "body", label: "Contenido" },
    { kind: "alignment", name: "style.alignment", label: "Alineación" },
    { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
    { kind: "padding", name: "style.paddingY", label: "Espaciado vertical" },
  ],
  defaultContent: { body: "", style: {} },
}
```

- [ ] **Step 5: `footer-payment-icons.ts`**

```ts
import { CreditCard } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const footerPaymentIconsDefinition: ThemeSectionDefinition = {
  type: "FOOTER_PAYMENT_ICONS",
  groups: ["FOOTER"],
  label: "Métodos de pago",
  description: "Iconos de medios de pago aceptados (Visa, Mastercard, Yape, …).",
  icon: CreditCard,
  maxPerGroup: 1,
  fields: [
    {
      kind: "multi-select",
      name: "methods",
      label: "Métodos a mostrar",
      options: [
        { value: "VISA", label: "Visa" },
        { value: "MASTERCARD", label: "Mastercard" },
        { value: "AMEX", label: "American Express" },
        { value: "YAPE", label: "Yape" },
        { value: "PLIN", label: "Plin" },
        { value: "PAYPAL", label: "PayPal" },
      ],
    },
    { kind: "alignment", name: "style.alignment", label: "Alineación" },
    { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
    { kind: "padding", name: "style.paddingY", label: "Espaciado vertical" },
  ],
  defaultContent: {
    methods: ["VISA", "MASTERCARD", "YAPE", "PLIN"],
    style: { alignment: "center" },
  },
}
```

If `kind: "multi-select"` does not yet exist in `FormField`, add it as a variant in `lib/blocks/schema/types.ts` and add a renderer in `SchemaForm.tsx`. Use shadcn `Checkbox` per option as the simplest implementation.

- [ ] **Step 6: `footer-copyright.ts`**

```ts
import { Copyright } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const footerCopyrightDefinition: ThemeSectionDefinition = {
  type: "FOOTER_COPYRIGHT",
  groups: ["FOOTER"],
  label: "Copyright",
  icon: Copyright,
  maxPerGroup: 1,
  fields: [
    {
      kind: "text",
      name: "text",
      label: "Texto",
      description: "Usá {{year}} para el año actual y {{siteName}} para el nombre de la tienda.",
    },
    { kind: "alignment", name: "style.alignment", label: "Alineación" },
    { kind: "color-scheme", name: "style.colorSchemeId", label: "Esquema de color" },
    { kind: "padding", name: "style.paddingY", label: "Espaciado vertical" },
  ],
  defaultContent: {
    text: "© {{year}} {{siteName}}. Todos los derechos reservados.",
    style: { alignment: "center" },
  },
}
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add lib/theme-sections/schema/footer-*.ts lib/blocks/schema/types.ts components/admin/page-builder/forms/SchemaForm.tsx
git commit -m "feat(theme-sections): 6 footer section definitions"
```

---

## Task B5: Registry assembly

**Files:**
- Create: `lib/theme-sections/registry.ts`
- Create: `lib/theme-sections/index.ts`

- [ ] **Step 1: `registry.ts`**

```ts
import type { ThemeSectionDefinition, ThemeSectionGroup, ThemeSectionCatalog } from "./types"
import { announcementBarDefinition } from "./schema/announcement-bar"
import { headerMainDefinition } from "./schema/header-main"
import { headerLogoDefinition } from "./schema/header-logo"
import { headerNavDefinition } from "./schema/header-nav"
import { megaMenuDefinition } from "./schema/mega-menu"
import { headerSearchDefinition } from "./schema/header-search"
import { headerPromoBannerDefinition } from "./schema/header-promo-banner"
import { footerColumnsDefinition } from "./schema/footer-columns"
import { footerNewsletterDefinition } from "./schema/footer-newsletter"
import { footerSocialDefinition } from "./schema/footer-social"
import { footerRichTextDefinition } from "./schema/footer-rich-text"
import { footerPaymentIconsDefinition } from "./schema/footer-payment-icons"
import { footerCopyrightDefinition } from "./schema/footer-copyright"

const ALL_DEFINITIONS: ThemeSectionDefinition[] = [
  announcementBarDefinition,
  headerMainDefinition,
  headerLogoDefinition,
  headerNavDefinition,
  megaMenuDefinition,
  headerSearchDefinition,
  headerPromoBannerDefinition,
  footerColumnsDefinition,
  footerNewsletterDefinition,
  footerSocialDefinition,
  footerRichTextDefinition,
  footerPaymentIconsDefinition,
  footerCopyrightDefinition,
]

const registry: Map<string, ThemeSectionDefinition> = new Map(
  ALL_DEFINITIONS.map((d) => [d.type, d]),
)

export function getThemeSectionDefinition(type: string): ThemeSectionDefinition | undefined {
  return registry.get(type)
}

export function getAllThemeSectionDefinitions(): ThemeSectionDefinition[] {
  return Array.from(registry.values())
}

/**
 * Returns definitions available to the customizer's AddSectionPanel for a
 * given group, intersecting the global registry with the theme's catalog.
 * Empty catalog (`{}` or missing arm) = permissive default (all types in
 * that group are available).
 */
export function getAvailableSectionDefinitions(
  group: ThemeSectionGroup,
  catalog: ThemeSectionCatalog | null | undefined,
): ThemeSectionDefinition[] {
  const all = ALL_DEFINITIONS.filter((d) => d.groups.includes(group))
  const allowed = group === "HEADER" ? catalog?.header : catalog?.footer
  if (!allowed || allowed.length === 0) return all
  return all.filter((d) => allowed.includes(d.type))
}

/**
 * Sub-block definition lookup for a given parent section type.
 */
export function getSectionBlockDefinition(
  parentType: string,
  blockType: string,
): { parent: ThemeSectionDefinition; block: ReturnType<ThemeSectionDefinition["acceptedBlockTypes"] extends infer T ? () => T : () => undefined> } | undefined {
  const parent = registry.get(parentType)
  if (!parent || !parent.acceptedBlockTypes) return undefined
  const block = parent.acceptedBlockTypes.find((b) => b.type === blockType)
  if (!block) return undefined
  return { parent, block } as const
}
```

The `getSectionBlockDefinition` return type is awkward — simplify it:

```ts
import type { ThemeSectionBlockDefinition } from "./types"

export function getSectionBlockDefinition(
  parentType: string,
  blockType: string,
): { parent: ThemeSectionDefinition; block: ThemeSectionBlockDefinition } | undefined {
  const parent = registry.get(parentType)
  const block = parent?.acceptedBlockTypes?.find((b) => b.type === blockType)
  if (!parent || !block) return undefined
  return { parent, block }
}
```

- [ ] **Step 2: `lib/theme-sections/index.ts`**

```ts
export * from "./types"
export * from "./registry"
export { getThemedSections } from "./resolve-active-sections"
```

(`resolve-active-sections.ts` ships in Task B7.)

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add lib/theme-sections/registry.ts lib/theme-sections/index.ts
git commit -m "feat(theme-sections): registry assembly"
```

---

## Task B6: Server actions — CRUD + batch save

**Files:**
- Create: `actions/theme-sections.ts`

- [ ] **Step 1: Create the file with the full CRUD set**

```ts
"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { protectRoute } from "@/lib/protect-route"
import type { ThemeSectionGroup } from "@prisma/client"
import {
  getThemeSectionDefinition,
  getSectionBlockDefinition,
} from "@/lib/theme-sections/registry"

// ---------- Row types ----------

export interface ThemeSectionRow {
  id: string
  themeId: string
  group: ThemeSectionGroup
  type: string
  position: number
  enabled: boolean
  content: unknown
  blocks: ThemeSectionBlockRow[]
}

export interface ThemeSectionBlockRow {
  id: string
  sectionId: string
  type: string
  position: number
  enabled: boolean
  content: unknown
}

async function fetchSectionRow(id: string): Promise<ThemeSectionRow> {
  const row = await prisma.themeSection.findUniqueOrThrow({
    where: { id },
    include: { blocks: { orderBy: { position: "asc" } } },
  })
  return {
    id: row.id,
    themeId: row.themeId,
    group: row.group,
    type: row.type,
    position: row.position,
    enabled: row.enabled,
    content: row.content,
    blocks: row.blocks.map((b) => ({
      id: b.id,
      sectionId: b.sectionId,
      type: b.type,
      position: b.position,
      enabled: b.enabled,
      content: b.content,
    })),
  }
}

// ---------- Add section ----------

const addThemeSectionSchema = z.object({
  themeId: z.string().min(1),
  group: z.enum(["HEADER", "FOOTER"]),
  type: z.string().min(1),
})

export async function addThemeSection(
  themeId: string,
  group: ThemeSectionGroup,
  type: string,
): Promise<ThemeSectionRow> {
  await protectRoute("themes:update")
  const input = addThemeSectionSchema.parse({ themeId, group, type })

  const def = getThemeSectionDefinition(input.type)
  if (!def) throw new Error(`Section type "${input.type}" not registered`)
  if (!def.groups.includes(input.group)) {
    throw new Error(`Section type "${input.type}" is not allowed in ${input.group}`)
  }

  if (def.maxPerGroup !== undefined) {
    const count = await prisma.themeSection.count({
      where: { themeId: input.themeId, group: input.group, type: input.type },
    })
    if (count >= def.maxPerGroup) {
      throw new Error(
        `Solo se permiten ${def.maxPerGroup} secciones de tipo ${def.label} en ${input.group}.`,
      )
    }
  }

  const last = await prisma.themeSection.findFirst({
    where: { themeId: input.themeId, group: input.group },
    orderBy: { position: "desc" },
    select: { position: true },
  })
  const position = (last?.position ?? -1) + 1

  const created = await prisma.themeSection.create({
    data: {
      themeId: input.themeId,
      group: input.group,
      type: input.type,
      position,
      content: def.defaultContent as object,
      enabled: true,
      blocks: def.defaultBlocks
        ? {
            create: def.defaultBlocks.map((b, i) => ({
              type: b.type,
              position: i,
              content: b.content as object,
              enabled: true,
            })),
          }
        : undefined,
    },
    include: { blocks: { orderBy: { position: "asc" } } },
  })

  revalidatePath("/")
  revalidatePath(`/admin/personalizar/temas/${input.themeId}/customize`)

  return {
    id: created.id,
    themeId: created.themeId,
    group: created.group,
    type: created.type,
    position: created.position,
    enabled: created.enabled,
    content: created.content,
    blocks: created.blocks.map((b) => ({
      id: b.id,
      sectionId: b.sectionId,
      type: b.type,
      position: b.position,
      enabled: b.enabled,
      content: b.content,
    })),
  }
}

// ---------- Remove section ----------

export async function removeThemeSection(sectionId: string): Promise<void> {
  await protectRoute("themes:update")
  const section = await prisma.themeSection.findUnique({
    where: { id: sectionId },
    select: { themeId: true },
  })
  if (!section) return

  await prisma.themeSection.delete({ where: { id: sectionId } })

  revalidatePath("/")
  revalidatePath(`/admin/personalizar/temas/${section.themeId}/customize`)
}

// ---------- Reorder sections ----------

const reorderSectionsSchema = z.object({
  themeId: z.string().min(1),
  group: z.enum(["HEADER", "FOOTER"]),
  orderedIds: z.array(z.string().min(1)),
})

export async function reorderThemeSections(
  themeId: string,
  group: ThemeSectionGroup,
  orderedIds: string[],
): Promise<void> {
  await protectRoute("themes:update")
  const input = reorderSectionsSchema.parse({ themeId, group, orderedIds })

  await prisma.$transaction(
    input.orderedIds.map((id, idx) =>
      prisma.themeSection.update({
        where: { id },
        data: { position: idx },
      }),
    ),
  )

  revalidatePath("/")
  revalidatePath(`/admin/personalizar/temas/${input.themeId}/customize`)
}

// ---------- Update section content ----------

const updateContentSchema = z.object({
  sectionId: z.string().min(1),
  content: z.record(z.unknown()),
})

export async function updateThemeSectionContent(
  sectionId: string,
  content: Record<string, unknown>,
): Promise<void> {
  await protectRoute("themes:update")
  const input = updateContentSchema.parse({ sectionId, content })

  const section = await prisma.themeSection.update({
    where: { id: input.sectionId },
    data: { content: input.content as object },
    select: { themeId: true },
  })

  revalidatePath("/")
  revalidatePath(`/admin/personalizar/temas/${section.themeId}/customize`)
}

// ---------- Toggle enabled ----------

export async function toggleThemeSectionEnabled(
  sectionId: string,
  enabled: boolean,
): Promise<void> {
  await protectRoute("themes:update")
  const section = await prisma.themeSection.update({
    where: { id: sectionId },
    data: { enabled },
    select: { themeId: true },
  })
  revalidatePath("/")
  revalidatePath(`/admin/personalizar/temas/${section.themeId}/customize`)
}

// ---------- Sub-block CRUD ----------

const addBlockSchema = z.object({
  sectionId: z.string().min(1),
  type: z.string().min(1),
})

export async function addThemeSectionBlock(
  sectionId: string,
  type: string,
): Promise<ThemeSectionBlockRow> {
  await protectRoute("themes:update")
  const input = addBlockSchema.parse({ sectionId, type })

  const parent = await prisma.themeSection.findUniqueOrThrow({
    where: { id: input.sectionId },
    select: { type: true, themeId: true, blocks: { select: { type: true } } },
  })

  const def = getSectionBlockDefinition(parent.type, input.type)
  if (!def) throw new Error(`Block type "${input.type}" not allowed in ${parent.type}`)

  if (def.block.maxPerSection !== undefined) {
    const count = parent.blocks.filter((b) => b.type === input.type).length
    if (count >= def.block.maxPerSection) {
      throw new Error(
        `Solo se permiten ${def.block.maxPerSection} bloques de tipo ${def.block.label} en esta sección.`,
      )
    }
  }

  const last = await prisma.themeSectionBlock.findFirst({
    where: { sectionId: input.sectionId },
    orderBy: { position: "desc" },
    select: { position: true },
  })
  const position = (last?.position ?? -1) + 1

  const created = await prisma.themeSectionBlock.create({
    data: {
      sectionId: input.sectionId,
      type: input.type,
      position,
      content: def.block.defaultContent as object,
      enabled: true,
    },
  })

  revalidatePath("/")
  revalidatePath(`/admin/personalizar/temas/${parent.themeId}/customize`)

  return {
    id: created.id,
    sectionId: created.sectionId,
    type: created.type,
    position: created.position,
    enabled: created.enabled,
    content: created.content,
  }
}

export async function removeThemeSectionBlock(blockId: string): Promise<void> {
  await protectRoute("themes:update")
  const block = await prisma.themeSectionBlock.findUnique({
    where: { id: blockId },
    select: { section: { select: { themeId: true } } },
  })
  if (!block) return
  await prisma.themeSectionBlock.delete({ where: { id: blockId } })
  revalidatePath("/")
  revalidatePath(`/admin/personalizar/temas/${block.section.themeId}/customize`)
}

const reorderBlocksSchema = z.object({
  sectionId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)),
})

export async function reorderThemeSectionBlocks(
  sectionId: string,
  orderedIds: string[],
): Promise<void> {
  await protectRoute("themes:update")
  const input = reorderBlocksSchema.parse({ sectionId, orderedIds })

  await prisma.$transaction(
    input.orderedIds.map((id, idx) =>
      prisma.themeSectionBlock.update({
        where: { id },
        data: { position: idx },
      }),
    ),
  )

  const section = await prisma.themeSection.findUnique({
    where: { id: input.sectionId },
    select: { themeId: true },
  })
  if (section) {
    revalidatePath("/")
    revalidatePath(`/admin/personalizar/temas/${section.themeId}/customize`)
  }
}

const updateBlockContentSchema = z.object({
  blockId: z.string().min(1),
  content: z.record(z.unknown()),
})

export async function updateThemeSectionBlockContent(
  blockId: string,
  content: Record<string, unknown>,
): Promise<void> {
  await protectRoute("themes:update")
  const input = updateBlockContentSchema.parse({ blockId, content })

  const block = await prisma.themeSectionBlock.update({
    where: { id: input.blockId },
    data: { content: input.content as object },
    select: { section: { select: { themeId: true } } },
  })
  revalidatePath("/")
  revalidatePath(`/admin/personalizar/temas/${block.section.themeId}/customize`)
}

// ---------- Batch save (for autosave) ----------

const batchSectionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: z.number().int().nonnegative(),
  content: z.record(z.unknown()),
  enabled: z.boolean(),
  blocks: z.array(
    z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      position: z.number().int().nonnegative(),
      content: z.record(z.unknown()),
      enabled: z.boolean(),
    }),
  ),
})

const saveGroupSchema = z.object({
  themeId: z.string().min(1),
  group: z.enum(["HEADER", "FOOTER"]),
  sections: z.array(batchSectionSchema),
})

/**
 * Batch save consumed by the customizer's autosave. Mirrors the shape of
 * savePageBlocks(). Performs a diff: deletes sections that disappeared,
 * upserts (by id) the ones that remained or are new (id starts with "tmp-").
 */
export async function saveThemeSectionGroup(
  themeId: string,
  group: ThemeSectionGroup,
  sections: z.infer<typeof batchSectionSchema>[],
): Promise<{ success: true }> {
  await protectRoute("themes:update")
  const input = saveGroupSchema.parse({ themeId, group, sections })

  await prisma.$transaction(async (tx) => {
    const existing = await tx.themeSection.findMany({
      where: { themeId: input.themeId, group: input.group },
      select: { id: true, blocks: { select: { id: true } } },
    })
    const existingSectionIds = new Set(existing.map((s) => s.id))
    const incomingSectionIds = new Set(input.sections.map((s) => s.id))

    const sectionsToDelete = [...existingSectionIds].filter(
      (id) => !incomingSectionIds.has(id),
    )
    if (sectionsToDelete.length > 0) {
      await tx.themeSection.deleteMany({ where: { id: { in: sectionsToDelete } } })
    }

    for (const section of input.sections) {
      const isNew = section.id.startsWith("tmp-") || !existingSectionIds.has(section.id)

      if (isNew) {
        const created = await tx.themeSection.create({
          data: {
            themeId: input.themeId,
            group: input.group,
            type: section.type,
            position: section.position,
            content: section.content as object,
            enabled: section.enabled,
          },
        })
        for (const block of section.blocks) {
          await tx.themeSectionBlock.create({
            data: {
              sectionId: created.id,
              type: block.type,
              position: block.position,
              content: block.content as object,
              enabled: block.enabled,
            },
          })
        }
      } else {
        await tx.themeSection.update({
          where: { id: section.id },
          data: {
            type: section.type,
            position: section.position,
            content: section.content as object,
            enabled: section.enabled,
          },
        })

        const existingBlockIds = new Set(
          existing.find((s) => s.id === section.id)?.blocks.map((b) => b.id) ?? [],
        )
        const incomingBlockIds = new Set(section.blocks.map((b) => b.id))
        const blocksToDelete = [...existingBlockIds].filter((id) => !incomingBlockIds.has(id))
        if (blocksToDelete.length > 0) {
          await tx.themeSectionBlock.deleteMany({ where: { id: { in: blocksToDelete } } })
        }
        for (const block of section.blocks) {
          const blockIsNew =
            block.id.startsWith("tmp-") || !existingBlockIds.has(block.id)
          if (blockIsNew) {
            await tx.themeSectionBlock.create({
              data: {
                sectionId: section.id,
                type: block.type,
                position: block.position,
                content: block.content as object,
                enabled: block.enabled,
              },
            })
          } else {
            await tx.themeSectionBlock.update({
              where: { id: block.id },
              data: {
                type: block.type,
                position: block.position,
                content: block.content as object,
                enabled: block.enabled,
              },
            })
          }
        }
      }
    }
  })

  revalidatePath("/")
  revalidatePath(`/admin/personalizar/temas/${input.themeId}/customize`)

  return { success: true }
}

// ---------- List (read for customizer) ----------

export async function listThemeSections(
  themeId: string,
  group: ThemeSectionGroup,
): Promise<ThemeSectionRow[]> {
  await protectRoute("themes:update")
  const rows = await prisma.themeSection.findMany({
    where: { themeId, group },
    orderBy: { position: "asc" },
    include: { blocks: { orderBy: { position: "asc" } } },
  })
  return rows.map((r) => ({
    id: r.id,
    themeId: r.themeId,
    group: r.group,
    type: r.type,
    position: r.position,
    enabled: r.enabled,
    content: r.content,
    blocks: r.blocks.map((b) => ({
      id: b.id,
      sectionId: b.sectionId,
      type: b.type,
      position: b.position,
      enabled: b.enabled,
      content: b.content,
    })),
  }))
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Manually exercise actions via Prisma Studio + a quick scratch script**

Create a temporary `scripts/smoke-theme-sections.ts`:

```ts
import { addThemeSection, listThemeSections, removeThemeSection } from "../actions/theme-sections"
import { prisma } from "../lib/db"

async function main() {
  const theme = await prisma.theme.findFirst({ where: { active: true } })
  if (!theme) throw new Error("No active theme")

  const before = await listThemeSections(theme.id, "HEADER")
  console.log("Before:", before.length, "sections")

  const created = await addThemeSection(theme.id, "HEADER", "ANNOUNCEMENT_BAR")
  console.log("Added:", created.id, created.type)

  const after = await listThemeSections(theme.id, "HEADER")
  console.log("After:", after.length, "sections")

  await removeThemeSection(created.id)
  const cleaned = await listThemeSections(theme.id, "HEADER")
  console.log("Cleaned:", cleaned.length, "sections")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

NOTE: server actions called from a Node script will fail `protectRoute` because there is no admin cookie. Comment out the `protectRoute` calls in the action file temporarily to run this smoke test, then restore them. Or test interactively from the customizer once Phase D ships.

If the simpler manual path is acceptable (skipping the smoke script), confirm `npm run build` passes and proceed.

- [ ] **Step 4: Delete the smoke script (if used)**

```bash
rm scripts/smoke-theme-sections.ts
```

- [ ] **Step 5: Commit**

```bash
git add actions/theme-sections.ts
git commit -m "feat(theme-sections): server actions (CRUD + batch save)"
```

---

## Task B7: Storefront resolver

**Files:**
- Create: `lib/theme-sections/resolve-active-sections.ts`

- [ ] **Step 1: Create the resolver**

```ts
import { prisma } from "@/lib/db"
import { resolveActiveTheme } from "@/lib/themes/resolve-active-theme"
import { resolveBlockForDevice } from "@/lib/blocks/resolve"
import type { Device } from "@/lib/blocks/types"
import type {
  ResolvedThemeSection,
  ResolvedThemeSectionBlock,
  ThemeSectionContent,
} from "./types"
import type { ThemeSectionGroup } from "@prisma/client"

/**
 * Fetch the active (or preview) theme's sections in a group, ordered, with
 * blocks included. Hidden (enabled=false) sections and blocks are filtered.
 */
export async function getThemedSections(
  group: ThemeSectionGroup,
  device: Device = "desktop",
): Promise<ResolvedThemeSection[]> {
  const theme = await resolveActiveTheme()
  if (!theme) return []

  const rows = await prisma.themeSection.findMany({
    where: { themeId: theme.id, group, enabled: true },
    orderBy: { position: "asc" },
    include: {
      blocks: {
        where: { enabled: true },
        orderBy: { position: "asc" },
      },
    },
  })

  return rows.map((row) => {
    const content = (row.content ?? {}) as ThemeSectionContent
    return {
      id: row.id,
      themeId: row.themeId,
      group: row.group,
      type: row.type,
      position: row.position,
      enabled: row.enabled,
      content: resolveContentForDevice(content, device),
      blocks: row.blocks.map<ResolvedThemeSectionBlock>((b) => ({
        id: b.id,
        sectionId: b.sectionId,
        type: b.type,
        position: b.position,
        enabled: b.enabled,
        content: resolveContentForDevice((b.content ?? {}) as ThemeSectionContent, device),
      })),
    }
  })
}

/**
 * Apply device-flattening to `content.style` (DeviceValue → flat value)
 * using the same helper landing blocks use, so the renderer can read
 * `style.paddingY` directly without checking for desktop/mobile splits.
 */
function resolveContentForDevice(
  content: ThemeSectionContent,
  device: Device,
): ThemeSectionContent {
  if (!content.style) return content
  // resolveBlockForDevice expects BlockContentV2-shaped input; we adapt by
  // wrapping the style under a `data: {}` envelope and unwrapping after.
  // This keeps a single source of truth for device flattening.
  const adapted = {
    data: {},
    style: content.style,
    media: {},
  }
  const resolved = resolveBlockForDevice(adapted, device)
  return { ...content, style: resolved.style }
}
```

If `resolveBlockForDevice` is not exported from `lib/blocks/resolve.ts`, open that file and confirm the symbol name; adapt the import. If it does not exist for arbitrary content, write a smaller helper inline that walks the style object replacing each `DeviceValue<T>` with the matching device's value:

```ts
function flattenStyle(style: Record<string, unknown>, device: Device): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(style)) {
    if (value && typeof value === "object" && ("desktop" in value || "mobile" in value)) {
      const v = value as { desktop?: unknown; mobile?: unknown }
      out[key] = v[device] ?? v.desktop ?? v.mobile
    } else {
      out[key] = value
    }
  }
  return out
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/theme-sections/resolve-active-sections.ts
git commit -m "feat(theme-sections): active-theme section resolver"
```

---

# Phase C — Storefront Renderers + Shells

## Task C1: Move current Header/Footer to legacy folder

**Files:**
- Create: `components/shop/legacy/LegacyHeader.tsx` (copy of current `Header.tsx`)
- Create: `components/shop/legacy/LegacyFooter.tsx` (copy of current `Footer.tsx`)

- [ ] **Step 1: Create the legacy folder and copy current implementations**

```bash
mkdir -p components/shop/legacy
cp components/shop/Header.tsx components/shop/legacy/LegacyHeader.tsx
cp components/shop/Footer.tsx components/shop/legacy/LegacyFooter.tsx
```

- [ ] **Step 2: Rename the default export**

In `components/shop/legacy/LegacyHeader.tsx`:

```diff
- export default async function Header() {
+ export default async function LegacyHeader() {
```

Same in `LegacyFooter.tsx` — rename `Footer` → `LegacyFooter`.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: PASS. The original `Header.tsx` / `Footer.tsx` are untouched at this point.

- [ ] **Step 4: Commit**

```bash
git add components/shop/legacy/
git commit -m "feat(theme-sections): copy current Header/Footer to legacy fallback"
```

---

## Task C2: First-class renderer — `HeaderMain`

This is the most important renderer because it covers today's hardcoded layout. The other 12 follow the same pattern.

**Files:**
- Create: `components/shop/theme-sections/header/HeaderMain.tsx`

- [ ] **Step 1: Create `HeaderMain.tsx`**

```tsx
import Link from "next/link"
import Image from "next/image"
import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import CartCounter from "@/components/shop/CartCounter"
import MobileMenu from "@/components/shop/MobileMenu"
import SearchBar from "@/components/shop/SearchBar"
import { HeaderAuth } from "@/components/shop/HeaderAuth"
import { HeaderNavMenu } from "@/components/shop/HeaderNavMenu"
import MobileSearch from "@/components/shop/MobileSearch"
import { getSiteSettings } from "@/lib/site-settings"
import { getMenuBySlug } from "@/lib/menus/get-menu-by-slug"
import { getMenuById } from "@/lib/menus/resolve-menu"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

export async function HeaderMain({ section }: Props) {
  const data = section.content as {
    menuId?: string | null
    showSearch?: boolean
    showAuth?: boolean
    showCart?: boolean
  }

  const [settings, menu] = await Promise.all([
    getSiteSettings(),
    data.menuId ? getMenuById(data.menuId) : getMenuBySlug("main"),
  ])
  const menuItems = menu?.items ?? []
  const showSearch = data.showSearch ?? true
  const showAuth = data.showAuth ?? true
  const showCart = data.showCart ?? true

  const { className, style } = applyThemeSectionStyle(section.content.style)

  return (
    <div className={className} style={style}>
      <div className="container mx-auto px-4">
        <div className="flex h-14 md:h-16 items-center justify-between gap-2">
          <Link href="/" className="flex items-center shrink-0">
            {settings.site_logo ? (
              <Image
                src={settings.site_logo}
                alt={settings.site_name}
                width={120}
                height={32}
                className="h-8 md:h-10 w-auto object-contain"
                priority
              />
            ) : (
              <>
                <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-brand bg-brand-primary text-brand-primary-foreground">
                  <span className="text-lg md:text-xl font-bold">SG</span>
                </div>
                <span className="hidden font-bold sm:inline-block ml-2">
                  {settings.site_name}
                </span>
              </>
            )}
          </Link>

          {showSearch && (
            <div className="hidden flex-1 px-4 lg:px-8 md:block">
              <SearchBar />
            </div>
          )}

          <div className="flex items-center gap-1 md:gap-2">
            {showSearch && (
              <div className="md:hidden">
                <MobileSearch />
              </div>
            )}
            {showAuth && (
              <div className="hidden sm:block">
                <HeaderAuth />
              </div>
            )}
            {showCart && (
              <Link href="/carrito">
                <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-10 md:w-10">
                  <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                  <CartCounter />
                </Button>
              </Link>
            )}
            <MobileMenu menuItems={menuItems} isAdmin={false} />
          </div>
        </div>

        {showSearch && (
          <div className="md:hidden pb-3 pt-2 border-t">
            <SearchBar />
          </div>
        )}
      </div>

      <div className="border-t hidden md:block">
        <div className="container mx-auto px-4">
          {menuItems.length > 0 ? (
            <HeaderNavMenu items={menuItems} />
          ) : (
            <nav className="flex h-10 items-center space-x-6 text-sm overflow-x-auto">
              <Link
                href="/productos"
                className="transition-colors hover:text-foreground/80 whitespace-nowrap"
              >
                Todos los Productos
              </Link>
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}
```

This calls a helper `applyThemeSectionStyle` that we will write in Step 2; if `lib/menus/resolve-menu.ts` does not export `getMenuById`, look at how the legacy Header uses `getThemedMenu` and use the same approach.

- [ ] **Step 2: Add the style helper**

`lib/theme-sections/apply-style.ts`:

```ts
import type { BlockStyle } from "@/lib/blocks/types"
import { applyBlockStyle } from "@/lib/blocks/apply-style"

/**
 * Adapter: ThemeSection.content.style → { className, style } for the
 * renderer wrapper. Reuses lib/blocks/apply-style.ts so theme sections
 * inherit the same color-scheme + padding + visibility logic as landing
 * blocks. Also emits data-color-scheme on the wrapper so the dynamic
 * theme stylesheet rebinds custom properties.
 */
export function applyThemeSectionStyle(
  style: BlockStyle | undefined,
): { className: string; style: React.CSSProperties; dataColorScheme?: string } {
  if (!style) return { className: "", style: {} }
  const result = applyBlockStyle(style)
  return {
    className: result.className,
    style: result.style,
    dataColorScheme: style.colorSchemeId,
  }
}
```

If `applyBlockStyle` returns a different shape, inspect `lib/blocks/apply-style.ts` and align the adapter accordingly.

Update `HeaderMain.tsx` to spread the data attribute:

```tsx
const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)

return (
  <div className={className} style={style} data-color-scheme={dataColorScheme}>
    ...
  </div>
)
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/shop/theme-sections/header/HeaderMain.tsx lib/theme-sections/apply-style.ts
git commit -m "feat(theme-sections): HeaderMain renderer + apply-style adapter"
```

---

## Task C3: Remaining 12 renderers

Use the `HeaderMain` shape (props with `section: ResolvedThemeSection`, wrapper applies style) for all twelve. Each renderer reads its specific fields from `section.content` and renders accordingly.

**Files:** 12 new files under `components/shop/theme-sections/`.

For each, the structure is identical:

```tsx
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

export function <SectionName>({ section }: Props) {
  const data = section.content as { /* type-specific fields */ }
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  return (
    <div className={className} style={style} data-color-scheme={dataColorScheme}>
      {/* type-specific markup */}
    </div>
  )
}
```

- [ ] **Step 1: `header/AnnouncementBar.tsx`** — text + optional link wrapper.

```tsx
import Link from "next/link"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

export function AnnouncementBar({ section }: Props) {
  const data = section.content as {
    message?: string
    linkHref?: string
    openInNewTab?: boolean
  }
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  if (!data.message) return null

  const inner = <span>{data.message}</span>

  return (
    <div className={`text-center text-xs md:text-sm py-2 ${className}`} style={style} data-color-scheme={dataColorScheme}>
      {data.linkHref ? (
        <Link href={data.linkHref} target={data.openInNewTab ? "_blank" : undefined} rel={data.openInNewTab ? "noopener noreferrer" : undefined}>
          {inner}
        </Link>
      ) : inner}
    </div>
  )
}
```

- [ ] **Step 2: `header/HeaderLogo.tsx`** — only the logo, alignment-driven.

```tsx
import Link from "next/link"
import Image from "next/image"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { getSiteSettings } from "@/lib/site-settings"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

export async function HeaderLogo({ section }: Props) {
  const settings = await getSiteSettings()
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  return (
    <div className={`container mx-auto px-4 py-3 flex justify-center ${className}`} style={style} data-color-scheme={dataColorScheme}>
      <Link href="/">
        {settings.site_logo ? (
          <Image src={settings.site_logo} alt={settings.site_name} width={140} height={40} className="h-10 w-auto" priority />
        ) : (
          <span className="text-lg font-bold">{settings.site_name}</span>
        )}
      </Link>
    </div>
  )
}
```

- [ ] **Step 3: `header/HeaderNav.tsx`** — only the menu.

```tsx
import { HeaderNavMenu } from "@/components/shop/HeaderNavMenu"
import { getMenuBySlug } from "@/lib/menus/get-menu-by-slug"
import { getMenuById } from "@/lib/menus/resolve-menu"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

export async function HeaderNav({ section }: Props) {
  const data = section.content as { menuId?: string | null }
  const menu = data.menuId ? await getMenuById(data.menuId) : await getMenuBySlug("main")
  const items = menu?.items ?? []
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  return (
    <div className={`hidden md:block border-t ${className}`} style={style} data-color-scheme={dataColorScheme}>
      <div className="container mx-auto px-4">
        {items.length > 0 ? <HeaderNavMenu items={items} /> : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: `header/MegaMenu.tsx`** — sub-blocks `MEGA_MENU_PANEL` rendered as panels with featured image.

```tsx
import Link from "next/link"
import Image from "next/image"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

interface PanelContent {
  trigger?: string
  featuredImage?: string
  featuredImageHref?: string
  links?: Array<{ label: string; href: string; openInNewTab?: boolean }>
}

export function MegaMenu({ section }: Props) {
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  return (
    <nav className={`hidden md:flex border-t justify-center gap-8 ${className}`} style={style} data-color-scheme={dataColorScheme}>
      {section.blocks.map((block) => {
        const panel = block.content as PanelContent
        return (
          <div key={block.id} className="group relative py-3">
            <button className="text-sm font-medium hover:text-primary">
              {panel.trigger ?? "Menú"}
            </button>
            <div className="absolute left-0 top-full hidden group-hover:flex gap-6 bg-background border shadow-lg p-6 min-w-[400px] z-50">
              {panel.featuredImage && (
                <Link href={panel.featuredImageHref ?? "#"} className="shrink-0">
                  <Image src={panel.featuredImage} alt="" width={160} height={120} className="rounded object-cover" />
                </Link>
              )}
              <ul className="space-y-2 text-sm">
                {(panel.links ?? []).map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} target={link.openInNewTab ? "_blank" : undefined} className="hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 5: `header/HeaderSearch.tsx`** — wraps the existing `SearchBar` component.

```tsx
import SearchBar from "@/components/shop/SearchBar"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

export function HeaderSearch({ section }: Props) {
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  return (
    <div className={`container mx-auto px-4 py-2 ${className}`} style={style} data-color-scheme={dataColorScheme}>
      <SearchBar />
    </div>
  )
}
```

- [ ] **Step 6: `header/HeaderPromoBanner.tsx`**

```tsx
import Link from "next/link"
import Image from "next/image"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

export function HeaderPromoBanner({ section }: Props) {
  const data = section.content as { image?: string; linkHref?: string; altText?: string }
  if (!data.image) return null
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  const img = (
    <div className="relative w-full h-24 md:h-32">
      <Image src={data.image} alt={data.altText ?? ""} fill className="object-cover" />
    </div>
  )
  return (
    <div className={className} style={style} data-color-scheme={dataColorScheme}>
      {data.linkHref ? <Link href={data.linkHref}>{img}</Link> : img}
    </div>
  )
}
```

- [ ] **Step 7: `footer/FooterColumns.tsx`** — about + columns sub-blocks (LINK_COLUMN, TEXT_COLUMN).

```tsx
import Link from "next/link"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

interface LinkColumnContent {
  title?: string
  links?: Array<{ label: string; href: string; openInNewTab?: boolean }>
}

interface TextColumnContent {
  title?: string
  body?: string
}

export function FooterColumns({ section }: Props) {
  const data = section.content as { aboutTitle?: string; aboutText?: string }
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)

  return (
    <div className={`container mx-auto px-4 py-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 ${className}`} style={style} data-color-scheme={dataColorScheme}>
      {data.aboutTitle && (
        <div>
          <h3 className="mb-4 text-lg font-semibold">{data.aboutTitle}</h3>
          {data.aboutText && <p className="text-sm text-muted-foreground">{data.aboutText}</p>}
        </div>
      )}
      {section.blocks.map((block) => {
        if (block.type === "LINK_COLUMN") {
          const c = block.content as LinkColumnContent
          return (
            <div key={block.id}>
              {c.title && <h3 className="mb-4 text-lg font-semibold">{c.title}</h3>}
              <ul className="space-y-2 text-sm">
                {(c.links ?? []).map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} target={link.openInNewTab ? "_blank" : undefined} className="hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        if (block.type === "TEXT_COLUMN") {
          const c = block.content as TextColumnContent
          return (
            <div key={block.id}>
              {c.title && <h3 className="mb-4 text-lg font-semibold">{c.title}</h3>}
              {c.body && <div className="text-sm" dangerouslySetInnerHTML={{ __html: c.body }} />}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
```

- [ ] **Step 8: `footer/FooterNewsletter.tsx`** — wraps an existing `NewsletterForm` if available, otherwise a minimal form posting to `/api/newsletter/subscribe`.

```tsx
"use client"

import { useState, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

export function FooterNewsletter({ section }: Props) {
  const data = section.content as {
    title?: string
    description?: string
    buttonLabel?: string
    successMessage?: string
  }
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus("submitting")
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? "success" : "error")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className={`container mx-auto px-4 py-8 text-center ${className}`} style={style} data-color-scheme={dataColorScheme}>
      {data.title && <h3 className="text-xl font-semibold mb-2">{data.title}</h3>}
      {data.description && <p className="text-sm text-muted-foreground mb-4" dangerouslySetInnerHTML={{ __html: data.description }} />}
      {status === "success" ? (
        <p className="text-sm">{data.successMessage ?? "¡Gracias!"}</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
          <Button type="submit" disabled={status === "submitting"}>
            {data.buttonLabel ?? "Suscribirme"}
          </Button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 9: `footer/FooterSocial.tsx`** — reads social URLs from `getSiteSettings()`.

```tsx
import { Facebook, Instagram, Twitter } from "lucide-react"
import { getSiteSettings } from "@/lib/site-settings"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

export async function FooterSocial({ section }: Props) {
  const settings = await getSiteSettings()
  const data = section.content as { title?: string }
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  const links = [
    { href: settings.social_facebook, Icon: Facebook, label: "Facebook" },
    { href: settings.social_instagram, Icon: Instagram, label: "Instagram" },
    { href: settings.social_twitter, Icon: Twitter, label: "Twitter" },
  ].filter((l) => l.href)
  if (links.length === 0) return null
  return (
    <div className={`container mx-auto px-4 py-6 ${className}`} style={style} data-color-scheme={dataColorScheme}>
      {data.title && <h3 className="text-sm font-semibold mb-3">{data.title}</h3>}
      <div className="flex justify-center gap-4">
        {links.map(({ href, Icon, label }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="hover:text-primary">
            <Icon className="h-5 w-5" />
          </a>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 10: `footer/FooterRichText.tsx`** — sanitized rich text.

```tsx
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

export function FooterRichText({ section }: Props) {
  const data = section.content as { body?: string }
  const html = sanitizeRichText(data.body ?? "")
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  return (
    <div
      className={`container mx-auto px-4 py-6 prose prose-invert max-w-none ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

- [ ] **Step 11: `footer/FooterPaymentIcons.tsx`** — uses SVGs from `components/payment-icons/`.

```tsx
import {
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  YapeIcon,
  PlinIcon,
  PaypalIcon,
} from "@/components/payment-icons"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  VISA: VisaIcon,
  MASTERCARD: MastercardIcon,
  AMEX: AmexIcon,
  YAPE: YapeIcon,
  PLIN: PlinIcon,
  PAYPAL: PaypalIcon,
}

export function FooterPaymentIcons({ section }: Props) {
  const data = section.content as { methods?: string[] }
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  const methods = data.methods ?? []
  return (
    <div className={`container mx-auto px-4 py-4 flex flex-wrap gap-3 justify-center ${className}`} style={style} data-color-scheme={dataColorScheme}>
      {methods.map((m) => {
        const Icon = ICONS[m]
        return Icon ? <Icon key={m} className="h-6 w-auto" /> : null
      })}
    </div>
  )
}
```

If the named exports do not exist with these exact names, open `components/payment-icons/index.ts` and align imports. If the icons use a different prop API, adapt the rendering line.

- [ ] **Step 12: `footer/FooterCopyright.tsx`** — replaces `{{year}}` and `{{siteName}}` placeholders.

```tsx
import { getSiteSettings } from "@/lib/site-settings"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props { section: ResolvedThemeSection }

export async function FooterCopyright({ section }: Props) {
  const settings = await getSiteSettings()
  const data = section.content as { text?: string }
  const text = (data.text ?? "© {{year}} {{siteName}}. Todos los derechos reservados.")
    .replace("{{year}}", String(new Date().getFullYear()))
    .replace("{{siteName}}", settings.site_name)
  const { className, style, dataColorScheme } = applyThemeSectionStyle(section.content.style)
  return (
    <div className={`container mx-auto px-4 py-4 text-center text-xs ${className}`} style={style} data-color-scheme={dataColorScheme}>
      {text}
    </div>
  )
}
```

- [ ] **Step 13: Verify build**

```bash
npm run build
```

- [ ] **Step 14: Commit**

```bash
git add components/shop/theme-sections/
git commit -m "feat(theme-sections): 12 storefront renderers (header + footer)"
```

---

## Task C4: Dispatcher + shells

**Files:**
- Create: `components/shop/theme-sections/ThemeSectionRenderer.tsx`
- Modify: `components/shop/Header.tsx`
- Modify: `components/shop/Footer.tsx`

- [ ] **Step 1: `ThemeSectionRenderer.tsx`**

```tsx
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import { AnnouncementBar } from "./header/AnnouncementBar"
import { HeaderMain } from "./header/HeaderMain"
import { HeaderLogo } from "./header/HeaderLogo"
import { HeaderNav } from "./header/HeaderNav"
import { MegaMenu } from "./header/MegaMenu"
import { HeaderSearch } from "./header/HeaderSearch"
import { HeaderPromoBanner } from "./header/HeaderPromoBanner"
import { FooterColumns } from "./footer/FooterColumns"
import { FooterNewsletter } from "./footer/FooterNewsletter"
import { FooterSocial } from "./footer/FooterSocial"
import { FooterRichText } from "./footer/FooterRichText"
import { FooterPaymentIcons } from "./footer/FooterPaymentIcons"
import { FooterCopyright } from "./footer/FooterCopyright"

const HEADER_RENDERERS = {
  ANNOUNCEMENT_BAR: AnnouncementBar,
  HEADER_MAIN: HeaderMain,
  HEADER_LOGO: HeaderLogo,
  HEADER_NAV: HeaderNav,
  MEGA_MENU: MegaMenu,
  HEADER_SEARCH: HeaderSearch,
  HEADER_PROMO_BANNER: HeaderPromoBanner,
} as const

const FOOTER_RENDERERS = {
  FOOTER_COLUMNS: FooterColumns,
  FOOTER_NEWSLETTER: FooterNewsletter,
  FOOTER_SOCIAL: FooterSocial,
  FOOTER_RICH_TEXT: FooterRichText,
  FOOTER_PAYMENT_ICONS: FooterPaymentIcons,
  FOOTER_COPYRIGHT: FooterCopyright,
} as const

export function ThemeSectionRenderer({ section }: { section: ResolvedThemeSection }) {
  if (!section.enabled) return null
  const Renderer =
    section.group === "HEADER"
      ? (HEADER_RENDERERS as Record<string, React.ComponentType<{ section: ResolvedThemeSection }>>)[section.type]
      : (FOOTER_RENDERERS as Record<string, React.ComponentType<{ section: ResolvedThemeSection }>>)[section.type]
  if (!Renderer) return null
  return <Renderer section={section} />
}
```

- [ ] **Step 2: Rewrite `components/shop/Header.tsx`**

```tsx
import { getThemedSections } from "@/lib/theme-sections/resolve-active-sections"
import { ThemeSectionRenderer } from "./theme-sections/ThemeSectionRenderer"
import LegacyHeader from "./legacy/LegacyHeader"

export default async function Header() {
  const sections = await getThemedSections("HEADER")
  if (sections.length === 0) return <LegacyHeader />
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      {sections.map((s) => (
        <ThemeSectionRenderer key={s.id} section={s} />
      ))}
    </header>
  )
}
```

- [ ] **Step 3: Rewrite `components/shop/Footer.tsx`**

```tsx
import { getThemedSections } from "@/lib/theme-sections/resolve-active-sections"
import { ThemeSectionRenderer } from "./theme-sections/ThemeSectionRenderer"
import LegacyFooter from "./legacy/LegacyFooter"

export default async function Footer() {
  const sections = await getThemedSections("FOOTER")
  if (sections.length === 0) return <LegacyFooter />
  return (
    <footer className="border-t border-gray-800 bg-gradient-to-b from-gray-900 to-black text-white">
      {sections.map((s) => (
        <ThemeSectionRenderer key={s.id} section={s} />
      ))}
    </footer>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Smoke test in browser**

```bash
npm run dev
```

Visit:
- `http://localhost:3000/` — homepage. Header should show logo + menu + cart (HEADER_MAIN renderer); footer should show columns from your menu + copyright.
- `http://localhost:3000/productos` — same header/footer, different middle content.
- `http://localhost:3000/carrito` — same header/footer.

Open DevTools → Elements. Confirm:
- Header has `data-color-scheme` attributes on inner section wrappers (or empty if no scheme set).
- Footer renders `FOOTER_COLUMNS` with the LINK_COLUMN sub-blocks the backfill script created.

The visual result must match the pre-refactor site. If something looks broken, compare to `LegacyHeader.tsx` / `LegacyFooter.tsx` to see what's missing.

- [ ] **Step 6: Commit**

```bash
git add components/shop/theme-sections/ThemeSectionRenderer.tsx components/shop/Header.tsx components/shop/Footer.tsx
git commit -m "feat(theme-sections): storefront shells reading from ThemeSection"
```

---

# Phase D — Customizer Integration

## Task D1: Zustand store for theme sections

**Files:**
- Create: `components/admin/customizer/theme-sections-store.ts`

- [ ] **Step 1: Create the store**

```ts
"use client"

import { create } from "zustand"
import type { ThemeSectionGroup } from "@prisma/client"
import type { ThemeSectionRow, ThemeSectionBlockRow } from "@/actions/theme-sections"

export interface SectionDraft extends Omit<ThemeSectionRow, "blocks"> {
  blocks: BlockDraft[]
  /** True when the section was added in this session and has not been saved. */
  isNew: boolean
  /** True when the draft differs from what's persisted. */
  dirty: boolean
}

export interface BlockDraft extends ThemeSectionBlockRow {
  isNew: boolean
  dirty: boolean
}

export type SidebarTarget =
  | { kind: "section"; sectionId: string }
  | { kind: "section-block"; sectionId: string; blockId: string }
  | null

interface Store {
  themeId: string | null
  header: SectionDraft[]
  footer: SectionDraft[]
  selected: SidebarTarget

  hydrate: (themeId: string, header: ThemeSectionRow[], footer: ThemeSectionRow[]) => void
  select: (target: SidebarTarget) => void

  addSection: (group: ThemeSectionGroup, type: string, defaultContent: object, defaultBlocks?: Array<{ type: string; content: object }>) => string
  removeSection: (sectionId: string) => void
  reorderSections: (group: ThemeSectionGroup, orderedIds: string[]) => void
  updateSectionContent: (sectionId: string, content: object) => void
  toggleSectionEnabled: (sectionId: string) => void

  addBlock: (sectionId: string, type: string, defaultContent: object) => string
  removeBlock: (blockId: string) => void
  reorderBlocks: (sectionId: string, orderedIds: string[]) => void
  updateBlockContent: (blockId: string, content: object) => void
  toggleBlockEnabled: (blockId: string) => void

  /** Returns the in-memory snapshot of a group, ready to send to saveThemeSectionGroup. */
  getGroupSnapshot: (group: ThemeSectionGroup) => SectionDraft[]
}

let counter = 0
const tmpId = (kind: "s" | "b") => `tmp-${kind}-${++counter}-${Date.now()}`

export const useThemeSectionsStore = create<Store>((set, get) => ({
  themeId: null,
  header: [],
  footer: [],
  selected: null,

  hydrate(themeId, header, footer) {
    set({
      themeId,
      header: header.map(toDraft),
      footer: footer.map(toDraft),
      selected: null,
    })
  },

  select(target) {
    set({ selected: target })
  },

  addSection(group, type, defaultContent, defaultBlocks) {
    const id = tmpId("s")
    const list = group === "HEADER" ? get().header : get().footer
    const newSection: SectionDraft = {
      id,
      themeId: get().themeId ?? "",
      group,
      type,
      position: list.length,
      enabled: true,
      content: defaultContent,
      blocks: (defaultBlocks ?? []).map<BlockDraft>((b, i) => ({
        id: tmpId("b"),
        sectionId: id,
        type: b.type,
        position: i,
        enabled: true,
        content: b.content,
        isNew: true,
        dirty: true,
      })),
      isNew: true,
      dirty: true,
    }
    set((s) => (group === "HEADER" ? { header: [...s.header, newSection] } : { footer: [...s.footer, newSection] }))
    return id
  },

  removeSection(sectionId) {
    set((s) => ({
      header: s.header.filter((x) => x.id !== sectionId),
      footer: s.footer.filter((x) => x.id !== sectionId),
      selected: s.selected?.kind === "section" && s.selected.sectionId === sectionId ? null : s.selected,
    }))
  },

  reorderSections(group, orderedIds) {
    set((s) => {
      const list = group === "HEADER" ? s.header : s.footer
      const map = new Map(list.map((x) => [x.id, x]))
      const reordered = orderedIds
        .map((id, idx) => {
          const item = map.get(id)
          if (!item) return null
          return { ...item, position: idx, dirty: true }
        })
        .filter((x): x is SectionDraft => x !== null)
      return group === "HEADER" ? { header: reordered } : { footer: reordered }
    })
  },

  updateSectionContent(sectionId, content) {
    set((s) => ({
      header: s.header.map((x) => (x.id === sectionId ? { ...x, content, dirty: true } : x)),
      footer: s.footer.map((x) => (x.id === sectionId ? { ...x, content, dirty: true } : x)),
    }))
  },

  toggleSectionEnabled(sectionId) {
    set((s) => ({
      header: s.header.map((x) => (x.id === sectionId ? { ...x, enabled: !x.enabled, dirty: true } : x)),
      footer: s.footer.map((x) => (x.id === sectionId ? { ...x, enabled: !x.enabled, dirty: true } : x)),
    }))
  },

  addBlock(sectionId, type, defaultContent) {
    const id = tmpId("b")
    set((s) => {
      const patchList = (list: SectionDraft[]) =>
        list.map((sec) => {
          if (sec.id !== sectionId) return sec
          return {
            ...sec,
            dirty: true,
            blocks: [
              ...sec.blocks,
              {
                id,
                sectionId,
                type,
                position: sec.blocks.length,
                enabled: true,
                content: defaultContent,
                isNew: true,
                dirty: true,
              },
            ],
          }
        })
      return { header: patchList(s.header), footer: patchList(s.footer) }
    })
    return id
  },

  removeBlock(blockId) {
    set((s) => {
      const patchList = (list: SectionDraft[]) =>
        list.map((sec) => ({
          ...sec,
          dirty: sec.blocks.some((b) => b.id === blockId) ? true : sec.dirty,
          blocks: sec.blocks.filter((b) => b.id !== blockId),
        }))
      return {
        header: patchList(s.header),
        footer: patchList(s.footer),
        selected:
          s.selected?.kind === "section-block" && s.selected.blockId === blockId
            ? null
            : s.selected,
      }
    })
  },

  reorderBlocks(sectionId, orderedIds) {
    set((s) => {
      const patchList = (list: SectionDraft[]) =>
        list.map((sec) => {
          if (sec.id !== sectionId) return sec
          const map = new Map(sec.blocks.map((b) => [b.id, b]))
          const reordered = orderedIds
            .map((id, idx) => {
              const b = map.get(id)
              if (!b) return null
              return { ...b, position: idx, dirty: true }
            })
            .filter((x): x is BlockDraft => x !== null)
          return { ...sec, blocks: reordered, dirty: true }
        })
      return { header: patchList(s.header), footer: patchList(s.footer) }
    })
  },

  updateBlockContent(blockId, content) {
    set((s) => {
      const patchList = (list: SectionDraft[]) =>
        list.map((sec) => {
          if (!sec.blocks.some((b) => b.id === blockId)) return sec
          return {
            ...sec,
            dirty: true,
            blocks: sec.blocks.map((b) =>
              b.id === blockId ? { ...b, content, dirty: true } : b,
            ),
          }
        })
      return { header: patchList(s.header), footer: patchList(s.footer) }
    })
  },

  toggleBlockEnabled(blockId) {
    set((s) => {
      const patchList = (list: SectionDraft[]) =>
        list.map((sec) => {
          if (!sec.blocks.some((b) => b.id === blockId)) return sec
          return {
            ...sec,
            dirty: true,
            blocks: sec.blocks.map((b) =>
              b.id === blockId ? { ...b, enabled: !b.enabled, dirty: true } : b,
            ),
          }
        })
      return { header: patchList(s.header), footer: patchList(s.footer) }
    })
  },

  getGroupSnapshot(group) {
    return group === "HEADER" ? get().header : get().footer
  },
}))

function toDraft(row: ThemeSectionRow): SectionDraft {
  return {
    ...row,
    isNew: false,
    dirty: false,
    blocks: row.blocks.map((b) => ({ ...b, isNew: false, dirty: false })),
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/customizer/theme-sections-store.ts
git commit -m "feat(theme-sections): Zustand store for customizer drafts"
```

---

## Task D2: AddSectionPanel + ThemeSectionGroupEditor

**Files:**
- Create: `components/admin/customizer/AddSectionPanel.tsx`
- Create: `components/admin/customizer/ThemeSectionGroupEditor.tsx`

- [ ] **Step 1: `AddSectionPanel.tsx`**

```tsx
"use client"

import { useMemo } from "react"
import { Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getAvailableSectionDefinitions,
} from "@/lib/theme-sections/registry"
import type { ThemeSectionCatalog, ThemeSectionGroup } from "@/lib/theme-sections/types"

interface Props {
  group: ThemeSectionGroup
  catalog: ThemeSectionCatalog
  /** Current count of each type in this group, to gate maxPerGroup. */
  counts: Record<string, number>
  onAdd: (type: string) => void
}

export function AddSectionPanel({ group, catalog, counts, onAdd }: Props) {
  const available = useMemo(() => {
    const all = getAvailableSectionDefinitions(group, catalog)
    return all.filter((d) => {
      if (d.maxPerGroup === undefined) return true
      return (counts[d.type] ?? 0) < d.maxPerGroup
    })
  }, [group, catalog, counts])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-primary hover:bg-muted/40 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar sección
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {available.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No hay tipos disponibles.
          </div>
        ) : (
          available.map((def) => {
            const Icon = def.icon
            return (
              <DropdownMenuItem
                key={def.type}
                onSelect={() => onAdd(def.type)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="text-sm">{def.label}</span>
                  {def.description && (
                    <span className="text-xs text-muted-foreground">{def.description}</span>
                  )}
                </div>
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: `ThemeSectionGroupEditor.tsx`** — sortable list with nested sub-blocks.

```tsx
"use client"

import { useMemo } from "react"
import { ChevronRight, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { useThemeSectionsStore, type SectionDraft, type BlockDraft } from "./theme-sections-store"
import { AddSectionPanel } from "./AddSectionPanel"
import {
  getThemeSectionDefinition,
  getSectionBlockDefinition,
} from "@/lib/theme-sections/registry"
import type { ThemeSectionCatalog, ThemeSectionGroup } from "@/lib/theme-sections/types"

interface Props {
  group: ThemeSectionGroup
  catalog: ThemeSectionCatalog
}

export function ThemeSectionGroupEditor({ group, catalog }: Props) {
  const sections = useThemeSectionsStore((s) =>
    group === "HEADER" ? s.header : s.footer,
  )
  const reorderSections = useThemeSectionsStore((s) => s.reorderSections)
  const addSection = useThemeSectionsStore((s) => s.addSection)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of sections) map[s.type] = (map[s.type] ?? 0) + 1
    return map
  }, [sections])

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = sections.findIndex((s) => s.id === active.id)
    const newIdx = sections.findIndex((s) => s.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(sections, oldIdx, newIdx).map((s) => s.id)
    reorderSections(group, reordered)
  }

  function handleAdd(type: string) {
    const def = getThemeSectionDefinition(type)
    if (!def) return
    addSection(group, type, def.defaultContent as object, def.defaultBlocks as Array<{ type: string; content: object }> | undefined)
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section) => (
            <SortableSectionRow key={section.id} section={section} />
          ))}
        </SortableContext>
      </DndContext>
      <AddSectionPanel group={group} catalog={catalog} counts={counts} onAdd={handleAdd} />
    </div>
  )
}

function SortableSectionRow({ section }: { section: SectionDraft }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  const def = getThemeSectionDefinition(section.type)
  const select = useThemeSectionsStore((s) => s.select)
  const selected = useThemeSectionsStore((s) => s.selected)
  const toggleEnabled = useThemeSectionsStore((s) => s.toggleSectionEnabled)
  const removeSection = useThemeSectionsStore((s) => s.removeSection)
  const isSelected = selected?.kind === "section" && selected.sectionId === section.id

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="border-b">
      <div
        className={`flex items-center gap-2 px-3 py-2 transition-colors cursor-pointer ${
          isSelected ? "bg-muted/50" : "hover:bg-muted/30"
        } ${section.enabled ? "" : "opacity-60"}`}
        onClick={() => select({ kind: "section", sectionId: section.id })}
      >
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab"
          aria-label="Arrastrar"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="flex-1 text-sm truncate">
          {def?.label ?? section.type}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleEnabled(section.id)
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label={section.enabled ? "Ocultar" : "Mostrar"}
        >
          {section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(`¿Eliminar la sección "${def?.label ?? section.type}"?`)) {
              removeSection(section.id)
            }
          }}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {def?.acceptedBlockTypes && def.acceptedBlockTypes.length > 0 && (
        <SectionBlocksList section={section} />
      )}
    </div>
  )
}

function SectionBlocksList({ section }: { section: SectionDraft }) {
  const reorderBlocks = useThemeSectionsStore((s) => s.reorderBlocks)
  const addBlock = useThemeSectionsStore((s) => s.addBlock)
  const def = getThemeSectionDefinition(section.type)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = section.blocks.findIndex((b) => b.id === active.id)
    const newIdx = section.blocks.findIndex((b) => b.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(section.blocks, oldIdx, newIdx).map((b) => b.id)
    reorderBlocks(section.id, reordered)
  }

  return (
    <div className="pl-6 bg-muted/20">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={section.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {section.blocks.map((block) => (
            <SortableBlockRow key={block.id} sectionId={section.id} block={block} />
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap gap-2 px-3 py-2">
        {def?.acceptedBlockTypes?.map((bt) => (
          <Button
            key={bt.type}
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => addBlock(section.id, bt.type, bt.defaultContent as object)}
            className="h-7 text-xs"
          >
            <ChevronRight className="h-3 w-3 mr-1" />
            {bt.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

function SortableBlockRow({ sectionId, block }: { sectionId: string; block: BlockDraft }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })
  const select = useThemeSectionsStore((s) => s.select)
  const selected = useThemeSectionsStore((s) => s.selected)
  const removeBlock = useThemeSectionsStore((s) => s.removeBlock)
  const toggleEnabled = useThemeSectionsStore((s) => s.toggleBlockEnabled)
  const isSelected =
    selected?.kind === "section-block" && selected.blockId === block.id

  const def = getSectionBlockDefinition(
    useThemeSectionsStore.getState().header.find((s) => s.id === sectionId)?.type ??
      useThemeSectionsStore.getState().footer.find((s) => s.id === sectionId)?.type ??
      "",
    block.type,
  )

  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${isSelected ? "bg-muted/60" : "hover:bg-muted/40"}`}
      onClick={() => select({ kind: "section-block", sectionId, blockId: block.id })}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground cursor-grab"
        aria-label="Arrastrar"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <span className="flex-1 text-xs truncate">{def?.block.label ?? block.type}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleEnabled(block.id)
        }}
        className="text-muted-foreground hover:text-foreground"
        aria-label={block.enabled ? "Ocultar" : "Mostrar"}
      >
        {block.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          removeBlock(block.id)
        }}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/customizer/AddSectionPanel.tsx components/admin/customizer/ThemeSectionGroupEditor.tsx
git commit -m "feat(theme-sections): customizer group editor with DnD + nested blocks"
```

---

## Task D3: Wire ZoneList + CustomizerShell

**Files:**
- Modify: `components/admin/customizer/ZoneList.tsx`
- Modify: `components/admin/customizer/CustomizerShell.tsx`
- Modify: `app/admin/personalizar/temas/[themeId]/customize/page.tsx`

- [ ] **Step 1: Update server fetch in `app/admin/personalizar/temas/[themeId]/customize/page.tsx`**

Add a fetch for the theme's existing sections (HEADER + FOOTER) and pass them as a prop to `CustomizerShell`. Look at the current server component, find the existing `prisma.theme.findUnique({...})` or related calls, and extend with:

```ts
const headerSections = await listThemeSections(theme.id, "HEADER")
const footerSections = await listThemeSections(theme.id, "FOOTER")
```

Pass to `<CustomizerShell ... headerSections={headerSections} footerSections={footerSections} sectionCatalog={theme.sectionCatalog as ThemeSectionCatalog} />`.

- [ ] **Step 2: Modify `CustomizerShell.tsx`**

Extend the `Props` interface:

```ts
interface Props {
  // ... existing fields ...
  headerSections: ThemeSectionRow[]
  footerSections: ThemeSectionRow[]
  sectionCatalog: ThemeSectionCatalog
}
```

Inside the component, hydrate the store on mount:

```tsx
import { useEffect } from "react"
import { useThemeSectionsStore } from "./theme-sections-store"

// ... inside CustomizerShell ...
const hydrate = useThemeSectionsStore((s) => s.hydrate)
useEffect(() => {
  hydrate(theme.id, headerSections, footerSections)
}, [hydrate, theme.id, headerSections, footerSections])
```

Add an autosave effect that batches calls to `saveThemeSectionGroup`:

```tsx
import { saveThemeSectionGroup } from "@/actions/theme-sections"

const headerDrafts = useThemeSectionsStore((s) => s.header)
const footerDrafts = useThemeSectionsStore((s) => s.footer)
const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
const saveTimer = useRef<NodeJS.Timeout | null>(null)

useEffect(() => {
  if (!headerDrafts.some((s) => s.dirty || s.blocks.some((b) => b.dirty))) return
  if (saveTimer.current) clearTimeout(saveTimer.current)
  saveTimer.current = setTimeout(async () => {
    setSaveStatus("saving")
    try {
      await saveThemeSectionGroup(theme.id, "HEADER", headerDrafts.map(snapshotForSave))
      setSaveStatus("saved")
      handleAnySaved()
    } catch {
      setSaveStatus("error")
    }
  }, 800)
  return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
}, [headerDrafts, theme.id, handleAnySaved])

// Same effect for footerDrafts → "FOOTER"
```

Define `snapshotForSave`:

```ts
function snapshotForSave(section: SectionDraft) {
  return {
    id: section.id,
    type: section.type,
    position: section.position,
    content: section.content as Record<string, unknown>,
    enabled: section.enabled,
    blocks: section.blocks.map((b) => ({
      id: b.id,
      type: b.type,
      position: b.position,
      content: b.content as Record<string, unknown>,
      enabled: b.enabled,
    })),
  }
}
```

When the action returns, the server action's `revalidatePath` triggers a router refresh; we still need to re-hydrate to replace `tmp-` ids with persisted ones. Easiest: on save success, re-fetch via `router.refresh()` (already wired) and the page server component will re-fetch sections — wrap the next render in a re-hydrate. Since hydration depends on `headerSections` prop, an `headerSections.map((s) => s.id).join(",")` dep on the hydrate effect ensures re-hydration on prop change.

- [ ] **Step 3: Modify `ZoneList.tsx`**

Replace the two `SectionAccordion` calls (Encabezado, Pie de página) with `ThemeSectionGroupEditor`:

```tsx
import { ThemeSectionGroupEditor } from "./ThemeSectionGroupEditor"
import type { ThemeSectionCatalog } from "@/lib/theme-sections/types"

interface Props {
  // ... drop initialHeaderMenuId, initialFooterMenuId, menus from props ...
  sectionCatalog: ThemeSectionCatalog
  // ... keep editorKey, initialBlocks, saveBlocks, targetLabel ...
}

// Inside ZoneList:
<Zone label="Encabezado" icon={Layout}>
  <ThemeSectionGroupEditor group="HEADER" catalog={sectionCatalog} />
</Zone>

<Zone label="Plantilla" icon={LayoutTemplate} sublabel={targetLabel}>
  {/* Existing EmbeddedBlocksEditor block stays */}
</Zone>

<Zone label="Pie de página" icon={Footprints}>
  <ThemeSectionGroupEditor group="FOOTER" catalog={sectionCatalog} />
</Zone>
```

Delete the `MenuPickerSection` and `SectionAccordion` components from this file (they're no longer needed). Save the deletion for Phase E if you prefer to keep this commit smaller — but since the props change requires removing them, do it now.

- [ ] **Step 4: Update RightSidebar to handle new target kinds**

Open `components/admin/page-builder/RightSidebar/RightSidebar.tsx`. Today its `context` is `{ type: "page", page: {...} }`. Extend the union to also accept theme-section targets, and read the selected target from `useThemeSectionsStore`:

```tsx
const sectionsSelected = useThemeSectionsStore((s) => s.selected)
const selectedSection = useThemeSectionsStore((s) => {
  if (!s.selected || s.selected.kind !== "section") return null
  return s.header.find((x) => x.id === s.selected!.sectionId) ?? s.footer.find((x) => x.id === s.selected!.sectionId) ?? null
})
const selectedBlock = useThemeSectionsStore((s) => {
  if (!s.selected || s.selected.kind !== "section-block") return null
  const sec = s.header.find((x) => x.id === s.selected!.sectionId) ?? s.footer.find((x) => x.id === s.selected!.sectionId)
  return sec?.blocks.find((b) => b.id === s.selected!.blockId) ?? null
})
```

When `selectedSection` is non-null, render a `SchemaForm` reading from `getThemeSectionDefinition(selectedSection.type).fields`, with `value = selectedSection.content` and `onChange = (next) => updateSectionContent(selectedSection.id, next)`. Same for `selectedBlock` using `getSectionBlockDefinition`.

The existing block-target case (page-builder) continues to work — only when the customizer has a section/section-block selected does the new code path run.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Smoke test**

```bash
npm run dev
```

Open `http://localhost:3000/admin/personalizar/temas/<theme-id>/customize`.

- The Encabezado zone should list the existing `HEADER_MAIN` section.
- The Pie de página zone should list `FOOTER_COLUMNS` (with sub-blocks `LINK_COLUMN` indented under it) and `FOOTER_COPYRIGHT`.
- Click "+ Agregar sección" on Encabezado → dropdown shows the 6 unused header types. Pick `ANNOUNCEMENT_BAR` → it appears at the bottom of the list. The iframe (right) reloads showing the bar.
- Drag the `ANNOUNCEMENT_BAR` to the top of the header list → after a brief delay, the iframe refreshes and the bar moves to top.
- Click `HEADER_MAIN` → the right sidebar shows the menu picker + show-search/auth/cart toggles.
- Toggle "Mostrar buscador" off → the iframe re-renders without the search bar.
- Toggle the eye icon on `FOOTER_COPYRIGHT` → the footer in the iframe loses its copyright row.

- [ ] **Step 7: Commit**

```bash
git add components/admin/customizer/ZoneList.tsx components/admin/customizer/CustomizerShell.tsx app/admin/personalizar/temas/ components/admin/page-builder/RightSidebar/
git commit -m "feat(theme-sections): wire customizer (ZoneList, autosave, RightSidebar)"
```

---

# Phase E — Contract Migration + Cleanup

## Task E1: Generate the contract migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Edit `prisma/schema.prisma`**

In the `Theme` model, remove the four lines:

```diff
-  headerMenuId   String?
-  headerMenu     Menu?  @relation("ThemeHeaderMenu", fields: [headerMenuId], references: [id], onDelete: SetNull)
-  footerMenuId   String?
-  footerMenu     Menu?  @relation("ThemeFooterMenu", fields: [footerMenuId], references: [id], onDelete: SetNull)
```

Open `prisma/schema.prisma` and find the `Menu` model. Remove the inverse relation arms `themesAsHeader` and `themesAsFooter` (or whatever they are named — search for `"ThemeHeaderMenu"` and `"ThemeFooterMenu"` to locate them).

- [ ] **Step 2: Generate the migration**

```bash
npx prisma migrate dev --name theme_sections_contract --create-only
```

- [ ] **Step 3: Inspect generated SQL**

Confirm the migration file contains:
- `ALTER TABLE "Theme" DROP CONSTRAINT "Theme_headerMenuId_fkey";`
- `ALTER TABLE "Theme" DROP CONSTRAINT "Theme_footerMenuId_fkey";`
- `ALTER TABLE "Theme" DROP COLUMN "headerMenuId";`
- `ALTER TABLE "Theme" DROP COLUMN "footerMenuId";`

- [ ] **Step 4: Apply the migration**

```bash
npx prisma migrate dev
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

If `actions/themes.ts` still references `headerMenuId` / `footerMenuId` in its `ThemeRow` interface or its `themeIncludes`, drop those references — the next task handles cleanup.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(theme-sections): contract migration (drop legacy menu columns)"
```

---

## Task E2: Cleanup `actions/themes.ts` and remove legacy components

**Files:**
- Modify: `actions/themes.ts`
- Modify: `components/admin/customizer/CustomizerShell.tsx`
- Modify: `components/admin/customizer/ZoneList.tsx` (if leftover)
- Delete: `components/admin/themes/ThemeMenuPicker.tsx` (if still present)

- [ ] **Step 1: Edit `actions/themes.ts`**

In the `ThemeRow` interface, remove these fields:

```diff
-  headerMenuId: string | null
-  headerMenuTitle: string | null
-  headerMenuSlug: string | null
-  footerMenuId: string | null
-  footerMenuTitle: string | null
-  footerMenuSlug: string | null
```

Remove from `themeIncludes`:

```diff
-  headerMenu: { select: { id: true, title: true, slug: true } },
-  footerMenu: { select: { id: true, title: true, slug: true } },
```

Find the row mapper that converts `ThemeWithJoins` → `ThemeRow` and remove the corresponding lines.

In `updateThemeMetadata` (or whichever action accepts partial updates), remove `headerMenuId` and `footerMenuId` from the accepted fields. If they remain in the Zod schema, drop them.

- [ ] **Step 2: Drop dead props from `CustomizerShell.tsx`**

Search for any remaining `theme.headerMenuId` / `theme.footerMenuId` references and delete. The shell already swapped to passing `sectionCatalog` in Phase D — confirm both old props are gone.

- [ ] **Step 3: Drop dead props from `ZoneList.tsx`**

Search for `initialHeaderMenuId` / `initialFooterMenuId` / `MenuPickerSection`. Delete any remaining references (they should already be gone after Phase D Task D3, but doublecheck).

- [ ] **Step 4: Delete unused files**

```bash
git rm components/admin/themes/ThemeMenuPicker.tsx
```

If the file does not exist (already removed in earlier housekeeping), skip this step. Also check for `ThemeHomePagePicker.tsx`, `ThemeCartPagePicker.tsx`, `ThemeProductDefaultPicker.tsx`, `ActiveThemeEditor.tsx`, `ThemeTokensForm.tsx` — per CLAUDE.md these may still be present from before; if any of them still reference `headerMenuId` / `footerMenuId` and are dead code, remove them.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Type-check should pass cleanly with no `headerMenuId` / `footerMenuId` references anywhere.

- [ ] **Step 6: Smoke test**

```bash
npm run dev
```

- Storefront `/` and `/productos` render the same as before.
- Customizer opens and lists existing sections; everything still saves.
- Theme list page (`/admin/personalizar/temas`) still works (the legacy fields it might have shown are gone).

- [ ] **Step 7: Commit**

```bash
git add actions/themes.ts components/admin/customizer/ components/admin/themes/
git commit -m "chore(theme-sections): remove legacy menu picker code paths"
```

---

# Phase F — Per-Theme Catalog UI (Optional)

This phase is optional for v1. The system works with `Theme.sectionCatalog = {}` (permissive default — all 13 types available) for every theme. Implement only if you want to ship the catalog management UI in this iteration.

## Task F1: `updateSectionCatalog` action

**Files:**
- Modify: `actions/theme-sections.ts`

- [ ] **Step 1: Append the action**

```ts
const updateCatalogSchema = z.object({
  themeId: z.string().min(1),
  catalog: z.object({
    header: z.array(z.string()).optional(),
    footer: z.array(z.string()).optional(),
  }),
})

export async function updateThemeSectionCatalog(
  themeId: string,
  catalog: { header?: string[]; footer?: string[] },
): Promise<void> {
  await protectRoute("themes:update")
  const input = updateCatalogSchema.parse({ themeId, catalog })
  await prisma.theme.update({
    where: { id: input.themeId },
    data: { sectionCatalog: input.catalog as object },
  })
  revalidatePath(`/admin/personalizar/temas/${input.themeId}/customize`)
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add actions/theme-sections.ts
git commit -m "feat(theme-sections): updateThemeSectionCatalog action"
```

---

## Task F2: Catalog UI panel

**Files:**
- Create: `components/admin/customizer/ThemeCatalogPanel.tsx`
- Modify: `components/admin/customizer/CustomizerTokensPanel.tsx` (add a tab)

- [ ] **Step 1: `ThemeCatalogPanel.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateThemeSectionCatalog } from "@/actions/theme-sections"
import { getAllThemeSectionDefinitions } from "@/lib/theme-sections/registry"
import type { ThemeSectionCatalog } from "@/lib/theme-sections/types"

interface Props {
  themeId: string
  initialCatalog: ThemeSectionCatalog
  onSaved?: () => void
}

export function ThemeCatalogPanel({ themeId, initialCatalog, onSaved }: Props) {
  const [catalog, setCatalog] = useState<ThemeSectionCatalog>(initialCatalog ?? {})
  const [pending, startTransition] = useTransition()

  const all = getAllThemeSectionDefinitions()
  const headerTypes = all.filter((d) => d.groups.includes("HEADER"))
  const footerTypes = all.filter((d) => d.groups.includes("FOOTER"))

  function isAllowed(group: "header" | "footer", type: string): boolean {
    const list = catalog[group]
    return !list || list.length === 0 || list.includes(type)
  }

  function toggle(group: "header" | "footer", type: string) {
    const current = catalog[group] ?? all.filter((d) => d.groups.includes(group.toUpperCase() as "HEADER" | "FOOTER")).map((d) => d.type)
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    const nextCatalog = { ...catalog, [group]: next }
    setCatalog(nextCatalog)
    startTransition(async () => {
      try {
        await updateThemeSectionCatalog(themeId, nextCatalog)
        onSaved?.()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-2">Tipos de Header habilitados</h3>
        <div className="space-y-2">
          {headerTypes.map((d) => (
            <div key={d.type} className="flex items-center gap-2">
              <Checkbox
                id={`h-${d.type}`}
                checked={isAllowed("header", d.type)}
                onCheckedChange={() => toggle("header", d.type)}
                disabled={pending}
              />
              <Label htmlFor={`h-${d.type}`} className="text-sm cursor-pointer">
                {d.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Tipos de Footer habilitados</h3>
        <div className="space-y-2">
          {footerTypes.map((d) => (
            <div key={d.type} className="flex items-center gap-2">
              <Checkbox
                id={`f-${d.type}`}
                checked={isAllowed("footer", d.type)}
                onCheckedChange={() => toggle("footer", d.type)}
                disabled={pending}
              />
              <Label htmlFor={`f-${d.type}`} className="text-sm cursor-pointer">
                {d.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into CustomizerTokensPanel**

Open `components/admin/customizer/CustomizerTokensPanel.tsx`. Add a tab/section "Catálogo de secciones" that renders `<ThemeCatalogPanel themeId={theme.id} initialCatalog={theme.sectionCatalog as ThemeSectionCatalog} onSaved={onSaved} />`.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Smoke test**

In the customizer, open the tokens panel → switch to "Catálogo de secciones" → uncheck `MEGA_MENU` → close and reopen the AddSectionPanel for header → confirm `MEGA_MENU` no longer appears. Re-check it → confirm it reappears.

- [ ] **Step 5: Commit**

```bash
git add components/admin/customizer/ThemeCatalogPanel.tsx components/admin/customizer/CustomizerTokensPanel.tsx
git commit -m "feat(theme-sections): per-theme catalog management UI"
```

---

# Final integration

## Task X1: Final smoke test + PR

- [ ] **Step 1: Reset to a clean state and run from scratch**

```bash
npm run build
```

Should pass with zero errors.

- [ ] **Step 2: Manual smoke checklist**

Open in two tabs:

**Storefront** (`http://localhost:3000/`):
- [ ] Header renders the same as pre-refactor (`HEADER_MAIN` covers the layout).
- [ ] Footer renders columns + copyright the same as pre-refactor.
- [ ] No console errors.

**Customizer** (`http://localhost:3000/admin/personalizar/temas/<theme-id>/customize`):
- [ ] Three zones visible: Encabezado, Plantilla (page name), Pie de página.
- [ ] Add `ANNOUNCEMENT_BAR` → appears in iframe.
- [ ] Drag it above `HEADER_MAIN` → reorders in iframe.
- [ ] Toggle visibility (eye) → disappears from iframe.
- [ ] Click `FOOTER_COLUMNS` → right sidebar shows fields. Edit "About title" → iframe updates.
- [ ] Click a `LINK_COLUMN` sub-block → right sidebar shows its title + links. Edit links → iframe updates.
- [ ] Add a new `LINK_COLUMN` → appears in footer iframe.
- [ ] Add `FOOTER_NEWSLETTER` → form appears in footer iframe.
- [ ] Refresh the customizer page → all changes persisted.

**Other pages** (`/productos`, `/carrito`, `/cuenta`):
- [ ] Header/footer render correctly across all storefront pages (since they share the same layout).

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feature/plan-16-theme-sections
gh pr create --title "Plan 16: Theme Sections (Header/Footer Shopify 2.0)" --body "$(cat <<'EOF'
## Summary
- Replaces single `Theme.headerMenuId` / `footerMenuId` model with Shopify Online Store 2.0–style section groups
- New schema: `ThemeSection` + `ThemeSectionBlock` + `ThemeSectionGroup` enum + `Theme.sectionCatalog`
- 13 section types in the global registry (announcement bar, header main/logo/nav, mega menu, header search, header promo banner, footer columns/newsletter/social/rich-text/payment-icons/copyright)
- Customizer Encabezado / Pie de página zones become sortable section editors with nested sub-blocks
- Expand-contract migration: phase 1 (commit 1) keeps old columns, phase 2 (commit 5) drops them

## Test plan
- [ ] Storefront `/`, `/productos`, `/carrito` — header/footer visually identical to pre-refactor
- [ ] Customizer: add/remove/reorder sections in both groups
- [ ] Customizer: edit section content via right sidebar, see iframe update
- [ ] Customizer: nested sub-block CRUD on `FOOTER_COLUMNS` and `MEGA_MENU`
- [ ] Migration backfill ran cleanly (one HEADER_MAIN + FOOTER_COLUMNS + FOOTER_COPYRIGHT per theme)
- [ ] `npm run build` passes
EOF
)"
```

---

## Self-Review Notes

**Spec coverage check:**

- ✅ Schema `ThemeSection` + `ThemeSectionBlock` + `ThemeSectionGroup` enum → Task A1
- ✅ `Theme.sectionCatalog` field → Task A1, removed columns in Task E1
- ✅ Backfill (HEADER_MAIN, FOOTER_COLUMNS with `__legacyFooterMenuId`, FOOTER_COPYRIGHT) → Task A1 + A3
- ✅ Global registry with 13 types → Tasks B2 + B3 + B4 + B5
- ✅ Per-theme catalog filtering → `getAvailableSectionDefinitions` in Task B5; UI in Phase F (optional)
- ✅ Server actions (CRUD + batch save) → Task B6
- ✅ Storefront resolver with device flattening + color-scheme attribute → Task B7
- ✅ 13 storefront renderers → Tasks C2 + C3
- ✅ Header.tsx / Footer.tsx as shells with legacy fallback → Task C4
- ✅ Customizer integration: ZoneList groups, AddSectionPanel, RightSidebar union, autosave → Tasks D1 + D2 + D3
- ✅ Expand-contract migration order → Phase A (expand) and Phase E (contract)
- ✅ Idempotent backfill script → Task A3

**Type consistency check:**

- `ThemeSectionRow.blocks: ThemeSectionBlockRow[]` matches across `actions/theme-sections.ts`, `theme-sections-store.ts`, and `ThemeSectionGroupEditor.tsx`.
- `SectionDraft extends Omit<ThemeSectionRow, "blocks">` keeps the row shape intact.
- `ThemeSectionDefinition.fields: FormSchema` (singular array of FormFields) matches what the existing `SchemaForm` consumer expects.
- `applyThemeSectionStyle` returns `{ className, style, dataColorScheme }` consistent in every renderer.

**Placeholder scan:** none. Every step shows code or commands. Repeated patterns (renderers, schemas) explicitly say "apply the pattern from Task X" with concrete code shown each time, not just references.

**Scope:** the plan stays inside the spec. Phase F is correctly flagged optional. Mega menu drag-between-panels is explicitly scoped out (single flat panel list).

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-30-theme-sections.md`.**

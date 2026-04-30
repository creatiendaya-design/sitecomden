# Theme Sections — Design Doc

**Date:** 2026-04-30
**Status:** Approved (brainstorming)
**Plan ref:** Pending plan number (carryover item #2 from CLAUDE.md "Pending / Open Items")

## Goal

Replace the current single-`Menu`-reference model for storefront `Header` and `Footer` with a Shopify Online Store 2.0–style **section group** system: each theme has an ordered, customizer-editable list of typed sections (announcement bar, header main, mega menu, footer columns, newsletter, social, copyright, etc.). Sections support nested sub-blocks where appropriate (footer columns, mega menu panels). The catalog of available section types is curated per theme via metadata, allowing different themes to expose different feature sets while sharing a single global registry of implementations.

## Non-goals

- Per-theme UI to manage `sectionCatalog` (deferred — DB/seed only in v1).
- Mega menu visual builder beyond a flat list of panels (drag-and-drop between panels is out of scope for v1).
- `FOOTER_INSTAGRAM_FEED`, language switcher, trust badges, A/B testing.
- Cart drawer / overlay sections — covered separately by Plan 10.1.
- Multi-theme presets (canned layouts when creating a new theme) — deferred until a second theme exists.

## Architecture

### Two-layer model (Shopify-aligned)

1. **Global registry (code).** All section type definitions live in `lib/theme-sections/registry.ts` — schema, default content, default sub-blocks, accepted block types, max-instances rule, icon, label. One implementation, maintained once.
2. **Per-theme catalog (DB).** `Theme.sectionCatalog` is a JSON column listing which subset of the global registry the theme exposes:
   ```json
   { "header": ["HEADER_MAIN", "MEGA_MENU"], "footer": ["FOOTER_COLUMNS"] }
   ```
   Empty `{}` = permissive default (all types from the registry are available). The customizer's "+ Add section" panel intersects the registry with the active theme's catalog.

### Schema

Two new Prisma models + an enum, plus removal of the deprecated single-menu fields on `Theme`:

```prisma
enum ThemeSectionGroup {
  HEADER
  FOOTER
}

model ThemeSection {
  id        String              @id @default(cuid())
  themeId   String
  theme     Theme               @relation(fields: [themeId], references: [id], onDelete: Cascade)
  group     ThemeSectionGroup
  type      String              // "HEADER_MAIN", "FOOTER_NEWSLETTER", ...
  position  Int
  content   Json                @default("{}")
  enabled   Boolean             @default(true)
  blocks    ThemeSectionBlock[]
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  @@index([themeId, group, position])
}

model ThemeSectionBlock {
  id        String       @id @default(cuid())
  sectionId String
  section   ThemeSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  type      String       // "LINK_COLUMN", "MEGA_MENU_PANEL", ...
  position  Int
  content   Json         @default("{}")
  enabled   Boolean      @default(true)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@index([sectionId, position])
}
```

`Theme` changes:

```diff
- headerMenuId   String?
- headerMenu     Menu?   @relation("ThemeHeaderMenu", ...)
- footerMenuId   String?
- footerMenu     Menu?   @relation("ThemeFooterMenu", ...)
+ sectionCatalog Json    @default("{}")
+ sections       ThemeSection[]
```

Design decisions:

- `type` is `String`, not an enum — adding a new section type should not require a Prisma migration.
- `(themeId, group, position)` is the natural order key; sections are scoped to a group.
- `enabled` powers the customizer's eye-toggle to hide a section without destroying its content.
- `onDelete: Cascade` everywhere — deleting a theme cascades to sections; deleting a section cascades to its blocks.

`content` shape (both `ThemeSection.content` and `ThemeSectionBlock.content`) follows the same convention as `LandingBlock.content` today — schema-defined fields at the top level plus an optional `style` object:

```ts
{
  // schema-defined fields (per registry definition)
  menuId?: string,
  aboutTitle?: string,
  // ...

  // optional BlockStyle (reused from lib/blocks/types.ts)
  style?: {
    colorSchemeId?: string,
    padding?: { top: number, bottom: number, ... },
    visibility?: { mobile: boolean, desktop: boolean },
    // ...
  }
}
```

This means `apply-style.ts` and the `data-color-scheme` rendering logic work identically to landing blocks — no parallel pipeline.

## Section type registry

Catalog shipped in v1 (13 types — premium-theme baseline):

**Header (group = HEADER):**
- `ANNOUNCEMENT_BAR` — top strip with text + optional link.
- `HEADER_LOGO` — logo only (separable from nav).
- `HEADER_NAV` — main menu only.
- `MEGA_MENU` — menu with image-rich panels (sub-blocks: `MEGA_MENU_PANEL`).
- `HEADER_SEARCH` — standalone search bar.
- `HEADER_PROMO_BANNER` — full-width banner with image.
- `HEADER_MAIN` — combo of logo + nav + search + cart in one row (default for minimalist themes; covers today's hardcoded layout).

**Footer (group = FOOTER):**
- `FOOTER_COLUMNS` — about + N link columns + social (sub-blocks: `LINK_COLUMN`, `TEXT_COLUMN`).
- `FOOTER_NEWSLETTER` — email capture (Resend).
- `FOOTER_SOCIAL` — social-media icons.
- `FOOTER_RICH_TEXT` — free-form Tiptap block.
- `FOOTER_PAYMENT_ICONS` — accepted-payment-methods row.
- `FOOTER_COPYRIGHT` — bottom strip with copyright text.

Each definition lives in its own file under `lib/theme-sections/schema/<kebab-case>.ts` and is registered in `lib/theme-sections/registry.ts`.

`ThemeSectionDefinition` shape:

```ts
interface ThemeSectionDefinition {
  type: string                                  // "HEADER_MAIN"
  groups: ThemeSectionGroup[]                   // which groups accept this type
  label: string                                 // for AddSectionPanel
  description?: string
  icon: LucideIcon
  fields: FormField[]                           // schema-driven form
  acceptedBlockTypes?: ThemeSectionBlockDefinition[]   // sub-block types
  maxPerGroup?: number                          // instance limit per group
  defaultContent: Record<string, unknown>
  defaultBlocks?: Array<{ type: string; content: Record<string, unknown> }>
}

interface ThemeSectionBlockDefinition {
  type: string
  label: string
  icon: LucideIcon
  fields: FormField[]
  defaultContent: Record<string, unknown>
  maxPerSection?: number
}
```

Reused infrastructure:

- `FormField` types from `lib/blocks/forms/` — used as-is.
- Custom field renderers from `components/admin/page-builder/forms/` — adding one new renderer for `menu-item-list` (used by `LINK_COLUMN`).
- `lib/blocks/apply-style.ts` and `lib/blocks/resolve.ts` — reused for per-section style + responsive overrides + color schemes.

## Storefront rendering

```
components/shop/theme-sections/
├── header/
│   ├── AnnouncementBar.tsx
│   ├── HeaderMain.tsx
│   ├── HeaderLogo.tsx
│   ├── HeaderNav.tsx
│   ├── MegaMenu.tsx
│   ├── HeaderSearch.tsx
│   └── HeaderPromoBanner.tsx
├── footer/
│   ├── FooterColumns.tsx
│   ├── FooterNewsletter.tsx
│   ├── FooterSocial.tsx
│   ├── FooterRichText.tsx
│   ├── FooterPaymentIcons.tsx
│   └── FooterCopyright.tsx
├── ThemeSectionRenderer.tsx
└── index.ts

components/shop/legacy/
├── LegacyHeader.tsx       (today's components/shop/Header.tsx body)
└── LegacyFooter.tsx       (today's components/shop/Footer.tsx body)
```

`ThemeSectionRenderer` is a dispatcher that maps `type` → React component, scoped by `group`. It also emits `data-color-scheme={section.colorSchemeId}` on the wrapper so the dynamic theme CSS rebinds custom properties (same mechanism the page-builder uses).

`components/shop/Header.tsx` and `Footer.tsx` collapse into thin shells:

```tsx
export default async function Header() {
  const sections = await getThemedSections("HEADER")
  if (sections.length === 0) return <LegacyHeader />
  return (
    <header className="sticky top-0 z-50 w-full">
      {sections.map((s) => <ThemeSectionRenderer key={s.id} section={s} />)}
    </header>
  )
}
```

`getThemedSections()` lives in `lib/theme-sections/resolve-active-sections.ts`:

1. Resolves the active (or preview) theme via existing `resolveActiveTheme()`.
2. Fetches `ThemeSection` rows where `enabled = true`, ordered by position, with `blocks` included (also `enabled = true`).
3. Applies per-section style/color-scheme/visibility resolution (reusing `lib/blocks/resolve.ts`).
4. Returns an array of `ResolvedSection` ready for the renderers.

Fallback behavior: if the active theme has zero sections in a group (broken state), the shell renders the corresponding legacy component. This keeps the storefront resilient if data ever ends up in an inconsistent state.

## Server actions (`actions/theme-sections.ts`)

CRUD scoped to the customizer. Each action calls `requirePermission("themes.update")` and runs `revalidatePath("/")` plus the customizer path.

```ts
addThemeSection(themeId, group, type)
removeThemeSection(sectionId)
reorderThemeSections(themeId, group, orderedIds)
updateThemeSectionContent(sectionId, content)
toggleThemeSectionEnabled(sectionId, enabled)

addThemeSectionBlock(sectionId, type)
removeThemeSectionBlock(blockId)
reorderThemeSectionBlocks(sectionId, orderedIds)
updateThemeSectionBlockContent(blockId, content)

saveThemeSectionGroup(themeId, group, sections)   // batch write for autosave
```

Inputs validated with Zod at the action boundary. The batch action is the one consumed by the customizer's autosave, mirroring how `savePageBlocks` works for landing blocks today.

## Customizer integration

The existing `ZoneList` already has the three-zone Shopify layout (Encabezado / Plantilla / Pie de página). Today the Encabezado/Pie de página zones each contain a single accordion with a menu picker. The refactor replaces those accordions with a sortable section list:

```
┌─ ENCABEZADO ─────────────────┐
│  ⋮⋮ Barra de anuncios   👁  │
│  ⋮⋮ Encabezado          👁  │
│  ⋮⋮ Mega menú           👁  │
│  + Agregar sección           │
└──────────────────────────────┘

┌─ PLANTILLA: Página de inicio ─┐
│  (current page-builder block list)
└────────────────────────────────┘

┌─ PIE DE PÁGINA ──────────────┐
│  ⋮⋮ Newsletter          👁  │
│  ⋮⋮ Columnas de enlaces  👁  │
│      ⋮⋮ Tienda          👁  │
│      ⋮⋮ Soporte         👁  │
│      + Agregar bloque        │
│  ⋮⋮ Iconos sociales     👁  │
│  ⋮⋮ Copyright           👁  │
│  + Agregar sección           │
└──────────────────────────────┘
```

New components in `components/admin/customizer/`:

- `ThemeSectionGroupEditor.tsx` — sortable list (DnD-kit), renders sections + nested sub-blocks; click selects the target in `RightSidebar`.
- `AddSectionPanel.tsx` — popover triggered by "+ Agregar sección"; lists `ThemeSectionDefinition`s filtered by `group ∩ Theme.sectionCatalog`, hiding types at `maxPerGroup`.
- `theme-sections-store.ts` — Zustand store mirroring `page-builder/store.ts`, with optimistic mutations and autosave flush via `SaveStatusIndicator`.

`EditableSurface` (currently `page | category`) gets a third variant:

```ts
type EditableSurface =
  | { kind: "page"; id: string; title: string | null }
  | { kind: "category"; id: string; title: string }
  | { kind: "theme-section-group"; group: ThemeSectionGroup; themeId: string }
```

`RightSidebar` extends to `SidebarTarget = block | section | section-block` and looks up the correct registry by target kind. The `SchemaForm` machinery is unchanged — it just receives a different `fields` array.

Permissions: existing `themes.update` covers all section operations.

## Migration (expand-contract pattern)

The migration runs in **two phases** so the storefront never sees a half-migrated state. Old code keeps working until the new code is fully deployed.

### Phase 1 — Expand (ships in commit 1)

Migration `20260430_theme_sections_expand`:

1. Create `ThemeSection`, `ThemeSectionBlock` tables and `ThemeSectionGroup` enum.
2. Add `Theme.sectionCatalog Json @default("{}")`.
3. Backfill default sections per theme:
   - HEADER: one `HEADER_MAIN` at position 0, with `content.menuId = theme.headerMenuId`.
   - FOOTER: `FOOTER_COLUMNS` at position 0 (with `content.__legacyFooterMenuId = theme.footerMenuId`) and `FOOTER_COPYRIGHT` at position 1.
4. **Old columns `Theme.headerMenuId` / `Theme.footerMenuId` stay in place.** No code reads from the new tables yet, but legacy code keeps using the old columns.

Sub-block backfill runs in a separate TS script (`scripts/backfill-footer-columns.ts`) executed once after `prisma migrate deploy`:

- For each `FOOTER_COLUMNS` section that still has `content.__legacyFooterMenuId` (idempotency marker), read that menu id.
- Fetch the menu's root items with children.
- Create one `LINK_COLUMN` `ThemeSectionBlock` per root item, with its children as `links`.
- Strip the `__legacyFooterMenuId` field from `content`. The marker's absence prevents re-running from creating duplicate blocks.

### Phase 2 — Contract (ships in commit 5, after the new code has been live and verified)

Migration `20260430_theme_sections_contract`:

1. Drop foreign keys + columns `Theme.headerMenuId`, `Theme.footerMenuId`.
2. Remove `headerMenu` / `footerMenu` relations from the `Theme` Prisma model.

This phase only runs once the storefront and customizer (commits 3 and 4) are confirmed working in production. There is no rollback path for this phase that preserves the dropped data — it should not run until the team is confident the expand phase is stable.

### Deploy order

**Expand phase (with commits 1–4):**

1. `prisma migrate deploy` runs phase-1 migration — tables exist, old columns still in place.
2. `npx tsx scripts/backfill-footer-columns.ts` populates sub-blocks (one-shot, idempotent).
3. Code deploy ships the storefront shells, customizer integration, and server actions. Storefront now reads from `ThemeSection`. Old columns are still in DB but no longer read by app code.
4. Smoke test in preview branch before promoting.

**Contract phase (commit 5):**

1. `prisma migrate deploy` runs phase-2 migration — old columns dropped.
2. Code deploy removes any remaining references (already none after commit 4 lands cleanly, but the cleanup commit removes legacy `MenuPickerSection`, `ThemeMenuPicker`, etc.).

### Rollback

- **Phase 1 + code deploy fails halfway**: Vercel reverts the code. Old code reads from old columns, which still exist — fully functional. The new tables are unused but harmless until next attempt.
- **Backfill script fails**: re-run; idempotent via the `__legacyFooterMenuId` marker.
- **Phase 2 fails**: phase 2 only runs after phase 1 is stable. If phase 2's column drop fails mid-migration, Prisma's transactional DDL rolls it back. The new code path keeps working because it never read those columns.

### Verification post-deploy

- Storefront `/` and `/productos` look identical to pre-migration.
- Customizer shows three zones with editable section lists.
- Editing the menu inside `HEADER_MAIN` updates the iframe preview.
- Adding a `FOOTER_NEWSLETTER` makes it appear in the storefront footer.

## Roadmap (six commits)

| # | Commit | What lands | Risk |
|---|---|---|---|
| 1 | Schema + types (expand) | Phase-1 Prisma migration (new tables, keep old columns), types, backfill script | Low |
| 2 | Registry + server actions | 13 section types, `menu-item-list` field, CRUD actions | Medium |
| 3 | Storefront renderers + shells | `theme-sections/*`, legacy fallbacks, `Header.tsx`/`Footer.tsx` rewritten | High (visual parity to verify) |
| 4 | Customizer integration | `ThemeSectionGroupEditor`, `AddSectionPanel`, `RightSidebar` extension, Zustand store | High (DnD + autosave) |
| 5 | Contract migration + cleanup | Phase-2 Prisma migration (drop `headerMenuId`/`footerMenuId`), remove `MenuPickerSection`, delete legacy `ThemeMenuPicker` | Low |
| 6 | Per-theme catalog UI (optional) | UI to manage `sectionCatalog` | Low |

Each commit is independently shippable and verifiable via `npm run build` plus manual smoke testing.

## Scope cuts (explicit)

- Per-theme catalog UI deferred to commit 6 (or a later iteration). v1 leaves `Theme.sectionCatalog` as `{}` (permissive default) and exposes all 13 types in every theme.
- Mega menu drag-and-drop between panels deferred — v1 ships a flat panel list inside `MEGA_MENU`.
- `FOOTER_INSTAGRAM_FEED`, language switcher, trust badges deferred — add as separate section types when demand exists.
- Theme presets / canned layouts deferred — useful only when there is more than one theme in production.
- Cart drawer / overlay sections out of scope — Plan 10.1 already addresses cart drawer.

## Open questions

- **`HEADER_MAIN` vs split sections** — both are in the v1 catalog. Should one be the default for a new theme, or should we let the admin compose? Recommendation: leave both available; the seeder for new themes uses `HEADER_MAIN` as the default so existing behavior is preserved, and the admin can split it manually.
- **Color schemes per section** — every section accepts `colorSchemeId` via the existing `BlockStyle` pipeline, but should some types (e.g. `ANNOUNCEMENT_BAR`) force a specific scheme to maintain visual hierarchy? Decision: do not enforce; the registry's `defaultContent` can suggest a scheme but the admin can override.
- **Visibility on cart-only / checkout-only pages** — out of scope for v1; sections render on all storefront pages once enabled. Future iteration could add a `pageScope` field on `ThemeSection`.

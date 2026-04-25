# Page Builder — Plan 3: Templates with Sync

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reusable landing templates with Shopify-style sync. Admins create templates in a dedicated library, apply them to products via a "Plantilla de tema" selector, and changes to a template propagate automatically to all linked products. Editing a single block in a linked product detaches just that block; the rest stays in sync.

**Architecture:** Plan 1 already added the DB schema (`LandingTemplate`, `TemplateBlock`, `Product.landingTemplateId`, `LandingBlock.sourceTemplateBlockId`, `LandingBlock.detached`). Plan 3 builds the UI + server actions + the resolution logic on top.

**Tech stack:** Next.js 15 App Router, Prisma, Zustand (existing builder store reused for templates), shadcn/ui Dialog/Card primitives, `revalidateTag` for cache invalidation.

**Preceded by:** Plans 1, 2, 2.5, 2.7, 2.8 (all merged).
**Followed by:** GALLERY data-shape migration (orthogonal, can come anytime).

**Spec source:** `docs/superpowers/specs/2026-04-23-page-builder-visual-design.md` Section 6.

**Scope explicitly NOT in this plan:**
- Auto-generated thumbnails via Puppeteer / @vercel/og — placeholder image; manual upload via Vercel Blob is supported as override.
- Pre-seeded example templates (`scripts/seed-landing-templates.ts`).
- Migrating GALLERY to schema-driven editor (orthogonal).
- Field-level overrides (only block-level detach is supported, per spec 6.1).

**Pre-flight:**

```bash
git checkout master
git status
git checkout -b feature/page-builder-plan-3
```

---

## Phase summary

| Phase | Tasks | Goal |
|---|---|---|
| A — Library | 1-5 | CRUD on templates: list, create, edit metadata, delete, toggle active |
| B — Editor | 6-10 | Build templates with the PageBuilder using `scope="page"`, explicit save, draft protection |
| C — Apply | 11-15 | Selector "Plantilla de tema" in product, apply replaces blocks, "Save as template" flow |
| D — Sync | 16-20 | Block-level detach: visual state (🔗/✏️/📦), edit-locally vs edit-template, restore, unlink |
| E — Propagation | 21-23 | "Guardar y propagar" with diff summary + cache invalidation |
| Final | 24 | Smoke test + merge |

---

## File Structure

**New files:**
```
app/admin/landing-plantillas/
├── page.tsx                          # Library grid
├── nueva/page.tsx                    # New-template entry (modal-driven)
└── [templateId]/
    ├── page.tsx                      # Builder editor
    └── editar/page.tsx                # Edit metadata

actions/landing-templates.ts          # All template Server Actions
lib/blocks/resolve-product-blocks.ts  # Merge template + overrides for a product

components/admin/landing-templates/
├── TemplateLibraryGrid.tsx
├── TemplateCard.tsx
├── CreateTemplateDialog.tsx
├── EditTemplateMetadataForm.tsx
└── TemplateBuilderShell.tsx          # Wraps PageBuilder with explicit-save UI

components/admin/products/
├── TemplateSelector.tsx              # The "Plantilla de tema" dropdown
├── ApplyTemplateDialog.tsx           # Confirmation modal
└── SaveAsTemplateDialog.tsx          # Convert product landing → template

components/admin/page-builder/
├── DraftProtection.tsx               # localStorage backup + beforeUnload + recover modal
└── PendingChangesBadge.tsx           # Counter in topbar
```

**Modified files:**
```
components/admin/page-builder/store.ts                # Add isDraft mode + originalSnapshot for diff
components/admin/page-builder/topbar/Topbar.tsx       # Conditional save button (autosave vs explicit)
components/admin/ProductLandingBuilder.tsx            # Use resolveProductBlocks; pass currentProduct context
components/shop/templates/ProductLandingView.tsx      # Same — resolve template + overrides
app/admin/productos/[productId]/page.tsx              # Render TemplateSelector + apply/save buttons
lib/permissions.ts                                     # Add landing_templates:* permissions
scripts/setup-permissions.ts                           # Seed the new permissions
```

---

## Phase A — Template Library

### Task 1: Permissions

**Files:**
- Modify: `lib/permissions.ts`
- Modify: `scripts/setup-permissions.ts`

- [ ] Add 4 new permissions to the resource list and the slug map: `landing_templates:view`, `landing_templates:create`, `landing_templates:update`, `landing_templates:delete`.
- [ ] Update `setup-permissions.ts` so re-running it inserts the new permissions idempotently for the SUPER_ADMIN role.
- [ ] Run `npx tsx scripts/setup-permissions.ts` once locally so the permissions exist in the dev DB. Document this in the task report (NOT in the commit).

Verify: `npx tsc --noEmit`. Commit:

```bash
git add lib/permissions.ts scripts/setup-permissions.ts
git commit -m "feat(rbac): add landing_templates permissions"
```

### Task 2: Server actions

**Files:**
- Create: `actions/landing-templates.ts`

Implement these Server Actions (each preceded by `await protectRoute("landing_templates:<action>")`):

```typescript
listLandingTemplates(filters?: { active?: boolean; category?: string; q?: string }): Promise<TemplateRow[]>
getLandingTemplate(id: string): Promise<TemplateWithBlocks | null>   // includes templateBlocks ordered by position
createLandingTemplate(input: { name; description?; category? }): Promise<{ id: string }>
updateLandingTemplateMetadata(id, input): Promise<void>
deleteLandingTemplate(id: string): Promise<void>     // ON DELETE CASCADE handles templateBlocks; SET NULL on Product.landingTemplateId
toggleLandingTemplateActive(id: string): Promise<void>
countProductsUsingTemplate(id: string): Promise<number>     // for "Used in N products" UI
```

Each mutating action calls `revalidatePath("/admin/landing-plantillas")` and `revalidateTag("template:" + id)` where applicable.

`TemplateRow`: lightweight shape `{ id, name, description, category, thumbnail, active, blockCount, productCount, updatedAt }`. `blockCount` and `productCount` come from a single Prisma query with `_count`.

Verify: `npx tsc --noEmit`. Commit:

```bash
git add actions/landing-templates.ts
git commit -m "feat(templates): server actions for template CRUD"
```

### Task 3: Library page

**Files:**
- Create: `app/admin/landing-plantillas/page.tsx`
- Create: `components/admin/landing-templates/TemplateLibraryGrid.tsx`
- Create: `components/admin/landing-templates/TemplateCard.tsx`
- Create: `components/admin/landing-templates/CreateTemplateDialog.tsx`

Page is a server component that calls `protectRoute("landing_templates:view")`, fetches `listLandingTemplates()`, renders the grid client component with the rows.

`TemplateLibraryGrid.tsx` renders:
- Top bar with title "Plantillas de Landing", a search input, an active/inactive/all filter, a category dropdown, and a "+ Nueva plantilla" button (opens `CreateTemplateDialog`).
- Grid of `TemplateCard` (responsive: 1 col mobile, 3 cols desktop).
- Empty state with copy "Aún no tienes plantillas. Crea la primera para reutilizarla en varios productos."

`TemplateCard.tsx` shows: 16:9 thumbnail (placeholder if `thumbnail` is null — use a gradient with the category icon), name, "X bloques · Y productos", a `⋯` menu (Edit content, Edit metadata, Duplicate, Activate/Deactivate, Delete with confirmation toast), and an "active: false" muted overlay if inactive.

`CreateTemplateDialog.tsx`: form with name + description + category fields. On submit calls `createLandingTemplate` and routes to `/admin/landing-plantillas/[newId]`.

Verify: `npx tsc --noEmit` + `npm run build`. Commit:

```bash
git add app/admin/landing-plantillas/page.tsx components/admin/landing-templates/
git commit -m "feat(templates): library page with grid + create dialog"
```

### Task 4: Edit metadata page

**Files:**
- Create: `app/admin/landing-plantillas/[templateId]/editar/page.tsx`
- Create: `components/admin/landing-templates/EditTemplateMetadataForm.tsx`

Server component → form → calls `updateLandingTemplateMetadata`. Includes fields: name, description, category, **manual thumbnail upload** (single image, posts to `/api/upload` as elsewhere in this codebase). On save, redirects back to `/admin/landing-plantillas`.

Verify + commit:

```bash
git add app/admin/landing-plantillas/[templateId]/editar/ components/admin/landing-templates/EditTemplateMetadataForm.tsx
git commit -m "feat(templates): edit metadata page with manual thumbnail upload"
```

### Task 5: Sidebar nav entry

**Files:**
- Modify: existing admin sidebar component (search for `Productos|Configuración` to locate it)

Add a "Plantillas de Landing" entry under a relevant section (e.g. between "Productos" and "Categorías"), guarded by `landing_templates:view` permission.

Verify + commit:

```bash
git add <sidebar file>
git commit -m "feat(templates): admin sidebar entry for templates library"
```

---

## Phase B — Template Editor

### Task 6: Template editor page

**Files:**
- Create: `app/admin/landing-plantillas/[templateId]/page.tsx`
- Create: `components/admin/landing-templates/TemplateBuilderShell.tsx`

Server page → `getLandingTemplate(id)` → renders `TemplateBuilderShell` (client) with the template's blocks.

`TemplateBuilderShell` is a thin wrapper over the existing `PageBuilder` that:
- Sets `scope="page"` so RELATED_PRODUCTS isn't available (already supported by registry — Plan 1).
- Hydrates the builder store with `templateBlocks` cast to `BlockInstance[]`.
- Sets a new builder-store flag `editorMode: "template"` (vs `"product"`) — see Task 7.
- Replaces the existing Topbar's autosave indicator with a "Guardar y propagar" button + pending-changes badge.

Verify + commit:

```bash
git add app/admin/landing-plantillas/[templateId]/page.tsx components/admin/landing-templates/TemplateBuilderShell.tsx
git commit -m "feat(templates): template editor page reuses PageBuilder with scope=page"
```

### Task 7: Explicit-save model + pending counter

**Files:**
- Modify: `components/admin/page-builder/store.ts`
- Create: `components/admin/page-builder/PendingChangesBadge.tsx`
- Modify: `components/admin/page-builder/topbar/Topbar.tsx` (or wherever the save indicator currently lives)

Extend the Zustand store with:
- `editorMode: "product" | "template"` (default `"product"`).
- `originalSnapshot: BlockInstance[]` — copy of the blocks as they were on load. Used to diff against the current `blocks` to compute pending changes.
- `pendingChangeCount: number` — derived from a diff (Task 21 implements the full diff for the propagation summary; this counter is a simple "blocks-not-equal-to-original" count).

`PendingChangesBadge` reads `pendingChangeCount` from the store and renders "N cambios pendientes" when > 0. In template mode it lives in the topbar next to "Guardar y propagar"; in product mode it's hidden (autosave handles it).

`Topbar` gains a conditional render: if `editorMode === "template"`, show the badge + "Guardar y propagar" button (disabled when count = 0) + "Descartar cambios" link. Otherwise, keep the current product autosave indicator.

Verify + commit:

```bash
git add components/admin/page-builder/store.ts components/admin/page-builder/PendingChangesBadge.tsx components/admin/page-builder/topbar/Topbar.tsx
git commit -m "feat(templates): editor mode flag + pending-changes counter + topbar wiring"
```

### Task 8: Draft localStorage backup + recover modal

**Files:**
- Create: `components/admin/page-builder/DraftProtection.tsx`
- Modify: `TemplateBuilderShell.tsx` to mount `DraftProtection` only in template mode.

`DraftProtection`:
- On mount, reads `template-draft-${templateId}-${userId}` from `localStorage`. If a backup is newer than the persisted `updatedAt` (compare timestamps), shows a recover modal: "Recuperar cambios no guardados de tu sesión anterior? [Sí] [Descartar]". On "Sí", hydrates the store with the backup. On "Descartar", clears the backup.
- Subscribes to store changes and writes the current blocks snapshot to localStorage every 5 seconds (`setInterval`). Cleared on save success.

Pass `userId` from the server component (already available via `getCurrentUser()`).

Verify + commit:

```bash
git add components/admin/page-builder/DraftProtection.tsx components/admin/landing-templates/TemplateBuilderShell.tsx
git commit -m "feat(templates): draft localStorage backup with recover modal"
```

### Task 9: Save Server Action

**Files:**
- Modify: `actions/landing-templates.ts` (add `saveTemplateBlocks`)

```typescript
saveTemplateBlocks(templateId: string, blocks: BlockInstance[]): Promise<void>
```

Single transaction:
1. Fetch the existing `TemplateBlock[]` for `templateId`.
2. Diff: ids in incoming but not existing → INSERT; ids in both → UPDATE; ids in existing but not incoming → DELETE.
3. Update `LandingTemplate.updatedAt`.
4. After commit (outside the txn), call `revalidateTag(\`template:${templateId}\`)`.

`TemplateBuilderShell` wires the topbar's "Guardar y propagar" button to call this action with the current store blocks. On success: clear `localStorage`, refresh `originalSnapshot`, toast "Plantilla guardada".

Verify + commit:

```bash
git add actions/landing-templates.ts components/admin/landing-templates/TemplateBuilderShell.tsx
git commit -m "feat(templates): saveTemplateBlocks transactional Server Action"
```

### Task 10: BeforeUnload + Discard confirm

**Files:**
- Modify: `DraftProtection.tsx` (or a small helper).

- `useEffect` on `pendingChangeCount` > 0: `window.addEventListener("beforeunload", handler)` that calls `e.preventDefault()` to trigger the native browser warning. Cleanup on unmount and when count = 0.
- "Descartar cambios" button (added in Task 7) opens a shadcn AlertDialog: "Se perderán N cambios. ¿Continuar?". On confirm: reset `blocks` to `originalSnapshot`, clear localStorage.

Verify + commit:

```bash
git add components/admin/page-builder/DraftProtection.tsx
git commit -m "feat(templates): beforeunload + discard-confirm safeguards"
```

---

## Phase C — Apply Template to Product

### Task 11: TemplateSelector dropdown in product builder

**Files:**
- Create: `components/admin/products/TemplateSelector.tsx`
- Modify: `app/admin/productos/[productId]/page.tsx` to render it above the page builder.

`TemplateSelector` is a shadcn `Select`:
- Options: "Producto predeterminado" (no template) + each active template by name.
- Trailing eye icon → opens template preview in a dialog (read-only render of the template's blocks).
- Trailing `⋯` menu when a template is selected: "Aplicar plantilla..." (Task 12 modal), "Desvincular plantilla" (Task 19), "Guardar como plantilla..." (Task 15).
- Reads `product.landingTemplateId` and current product's `slug` for the value.

Wire it into the product page's header area where the "Landing" tab UI lives.

Verify + commit:

```bash
git add components/admin/products/TemplateSelector.tsx app/admin/productos/[productId]/page.tsx
git commit -m "feat(templates): TemplateSelector dropdown on product page"
```

### Task 12: ApplyTemplateDialog + applyTemplate Server Action

**Files:**
- Create: `components/admin/products/ApplyTemplateDialog.tsx`
- Modify: `actions/landing-templates.ts` (add `applyTemplateToProduct`)

```typescript
applyTemplateToProduct(productId: string, templateId: string | null): Promise<void>
```

Atomic transaction:
1. Delete all `LandingBlock` rows for the product (including any prior detached overrides from a previous template).
2. `Product.update({ landingTemplateId: templateId })`.
3. Outside the txn: `revalidateTag(\`product:${product.slug}\`)`.

`ApplyTemplateDialog`:
- Shows the warning per spec 6.6 ("Se REEMPLAZARÁN los X bloques actuales por los Y bloques de la plantilla. ⚠ Los bloques locales se perderán.").
- Confirms calls `applyTemplateToProduct(productId, templateId)`.
- Note: if user picks "Producto predeterminado" in the selector, this dialog isn't shown — that's the unlink flow handled in Task 19.

Verify + commit:

```bash
git add components/admin/products/ApplyTemplateDialog.tsx actions/landing-templates.ts
git commit -m "feat(templates): apply-template dialog + transactional applyTemplateToProduct"
```

### Task 13: Resolve helper

**Files:**
- Create: `lib/blocks/resolve-product-blocks.ts`

```typescript
export interface ResolvedProductBlock {
  id: string                // template block id OR LandingBlock id (override or local)
  origin: "template" | "detached" | "local"
  type: LandingBlockType
  position: number
  content: BlockContentV2
  sourceTemplateBlockId?: string   // present for "template" and "detached"
}

export async function resolveProductBlocks(productId: string): Promise<ResolvedProductBlock[]>
```

Implements the algorithm in spec 2.4:

1. Fetch product with `landingTemplateId`, its `LandingBlock[]`, and (if linked) the template's `templateBlocks` (one query with includes).
2. If no template: return `LandingBlock[]` mapped as `origin: "local"`.
3. Else, walk the template blocks in order:
   - For each `TemplateBlock`, look for a `LandingBlock` with `sourceTemplateBlockId === templateBlock.id` AND `detached === true`. If found → emit as `origin: "detached"` with the LandingBlock content. Else → emit as `origin: "template"` with the TemplateBlock content.
4. After the template walk, append all `LandingBlock` rows where `sourceTemplateBlockId === null` (pure-local interleaves) — ordered by their stored `position` (float, see spec 2.4).

This single helper feeds both the canvas (Task 14) and the storefront (also Task 14).

Verify + commit:

```bash
git add lib/blocks/resolve-product-blocks.ts
git commit -m "feat(templates): resolveProductBlocks merges template + overrides"
```

### Task 14: Renderer integration

**Files:**
- Modify: `components/admin/ProductLandingBuilder.tsx`
- Modify: `components/shop/templates/ProductLandingView.tsx`

Both currently load `product.landingBlocks` directly. Replace with calls to `resolveProductBlocks(productId)` so they pick up template inheritance.

`ProductLandingBuilder` (admin canvas):
- Receives the resolved blocks AND the `origin` per block.
- Hydrates the builder store with the resolved blocks. Add `block.meta.origin` to the store's BlockInstance shape (or pass through via a separate map indexed by block id).

`ProductLandingView` (storefront):
- Calls `resolveProductBlocks` server-side and passes the resolved blocks to `LandingBlockRenderer`.

Verify: open a product without a template (still works) AND with a template (template blocks render). Commit:

```bash
git add components/admin/ProductLandingBuilder.tsx components/shop/templates/ProductLandingView.tsx
git commit -m "feat(templates): builder + storefront resolve template+overrides"
```

### Task 15: Save-as-template flow

**Files:**
- Create: `components/admin/products/SaveAsTemplateDialog.tsx`
- Modify: `actions/landing-templates.ts` (add `saveProductLandingAsTemplate`)

```typescript
saveProductLandingAsTemplate(productId: string, metadata: { name, description?, category? }): Promise<{ templateId: string }>
```

Atomic:
1. Read product's current `LandingBlock[]`.
2. Create `LandingTemplate` with the metadata.
3. For each LandingBlock: create a `TemplateBlock` with the same `type/position/content`.
4. Set `Product.landingTemplateId = newTemplateId`.
5. Delete the product's `LandingBlock` rows (now served from template).
6. Outside txn: `revalidateTag(\`template:${id}\`)` and `revalidateTag(\`product:${slug}\`)`.

Dialog shows the warning per spec 6.5 Flow B.

Verify + commit:

```bash
git add components/admin/products/SaveAsTemplateDialog.tsx actions/landing-templates.ts
git commit -m "feat(templates): save-product-as-template flow with auto-link"
```

---

## Phase D — Sync with Block Detach

### Task 16: Visual state badges

**Files:**
- Modify: `components/admin/page-builder/Canvas/BlockWrapper.tsx`
- Modify: `components/admin/page-builder/store.ts` (BlockInstance gains `origin` field, defaulting to `"local"`)

In the wrapper's left rail (where the drag handle lives), add a small badge that reflects `block.origin`:
- 🔗 inherited (template) — soft blue background
- ✏️ detached — soft yellow background
- 📦 local — no badge (default)

Tooltip on hover shows: "Bloque de plantilla" / "Bloque desvinculado de la plantilla" / "Bloque local".

Verify + commit:

```bash
git add components/admin/page-builder/Canvas/BlockWrapper.tsx components/admin/page-builder/store.ts
git commit -m "feat(templates): visual badges for inherited/detached/local blocks"
```

### Task 17: Click inherited → "Editar localmente" / "Editar plantilla"

**Files:**
- Modify: `components/admin/page-builder/RightSidebar/RightSidebar.tsx` (or wherever the right panel shell lives)

When the selected block has `origin === "template"`:
- Render the form inputs **read-only** with a banner above:
  > "Este bloque viene de la plantilla **{templateName}**."
- Two buttons under the banner:
  - "Editar localmente" → calls `detachBlock(blockId)` (Task 18).
  - "Editar plantilla" → routes to `/admin/landing-plantillas/{templateId}#block={templateBlockId}`. Render only if user has `landing_templates:update`.

When `origin === "detached"`:
- Banner: "Este bloque está desvinculado de la plantilla **{templateName}**."
- Button "↺ Restaurar al template" → calls `restoreBlockToTemplate(blockId)` (Task 19).

When `origin === "local"`: existing behavior unchanged.

Verify + commit:

```bash
git add components/admin/page-builder/RightSidebar/RightSidebar.tsx
git commit -m "feat(templates): right panel banners + edit-locally/edit-template/restore actions"
```

### Task 18: Detach action

**Files:**
- Modify: `actions/landing-templates.ts` (add `detachTemplateBlock`)

```typescript
detachTemplateBlock(productId: string, templateBlockId: string): Promise<{ landingBlockId: string }>
```

1. Fetch the TemplateBlock content + the matching position.
2. Create a `LandingBlock` row with `productId`, `type`, `position`, the TemplateBlock's `content` deep-cloned, `sourceTemplateBlockId = templateBlockId`, `detached = true`.
3. `revalidateTag(\`product:${slug}\`)`.

The right panel's "Editar localmente" button calls this, then re-fetches the resolved blocks (or the store optimistically swaps the block to `origin: "detached"` and unlocks the form).

Verify + commit:

```bash
git add actions/landing-templates.ts components/admin/page-builder/RightSidebar/RightSidebar.tsx
git commit -m "feat(templates): detach inherited block to local override"
```

### Task 19: Restore + Unlink

**Files:**
- Modify: `actions/landing-templates.ts`

```typescript
restoreTemplateBlock(productId: string, landingBlockId: string): Promise<void>   // delete the LandingBlock override row
unlinkTemplateFromProduct(productId: string): Promise<void>                      // unlink without deleting blocks
```

`restoreTemplateBlock`: delete the `LandingBlock` row (which is the override). The resolver in Task 13 will fall back to the TemplateBlock on next read.

`unlinkTemplateFromProduct`: per spec 6.10 — for each TemplateBlock the product currently inherits (i.e., NOT already detached), create a corresponding `LandingBlock` row with the TemplateBlock's content + `sourceTemplateBlockId = null`. Then set `landingTemplateId = null`. Existing detached overrides become pure-local (`sourceTemplateBlockId = null`, keep their content). Single transaction.

Wire `restoreTemplateBlock` into the right panel restore button. Wire `unlinkTemplateFromProduct` into the TemplateSelector's `⋯` menu "Desvincular plantilla" option.

Verify + commit:

```bash
git add actions/landing-templates.ts components/admin/products/TemplateSelector.tsx components/admin/page-builder/RightSidebar/RightSidebar.tsx
git commit -m "feat(templates): restore single block + unlink template entirely"
```

### Task 20: Template deletion + orphan handling

**Files:**
- Modify: `actions/landing-templates.ts` (`deleteLandingTemplate` from Task 2)

Update the delete action to handle orphaned `LandingBlock` rows that referenced template blocks of the deleted template:

1. Before deleting the template: for every `LandingBlock` with `sourceTemplateBlockId` pointing to one of this template's blocks (via subquery), set `sourceTemplateBlockId = null` and `detached = false` (they become pure-local).
2. The `Prisma` schema's `Product.landingTemplateId` already does `ON DELETE SET NULL`.
3. `TemplateBlock` cascade-deletes via the schema relation.
4. `revalidateTag(\`template:${id}\`)` + loop products that had this template (collected before nulling) and call `revalidateTag(\`product:${slug}\`)` for each.

Verify + commit:

```bash
git add actions/landing-templates.ts
git commit -m "feat(templates): delete template orphans LandingBlocks safely"
```

---

## Phase E — Propagation

### Task 21: Diff computation

**Files:**
- Create: `lib/blocks/template-diff.ts`

```typescript
export interface TemplateDiff {
  added: BlockInstance[]
  modified: { before: BlockInstance; after: BlockInstance }[]
  removed: BlockInstance[]
}

export function computeTemplateDiff(
  original: BlockInstance[],
  current: BlockInstance[],
): TemplateDiff
```

- `added`: ids in `current` not in `original`.
- `removed`: ids in `original` not in `current`.
- `modified`: ids in both where `JSON.stringify(content) !== JSON.stringify(originalContent)` OR position differs OR type differs.

Wire `pendingChangeCount` from Task 7 to `added.length + modified.length + removed.length`.

Verify + commit:

```bash
git add lib/blocks/template-diff.ts components/admin/page-builder/store.ts
git commit -m "feat(templates): computeTemplateDiff helper for propagation summary"
```

### Task 22: Save-and-propagate dialog

**Files:**
- Create: `components/admin/landing-templates/SaveAndPropagateDialog.tsx`
- Modify: `TemplateBuilderShell.tsx` to wire the topbar button to open this dialog.

The dialog shows:
- Product count using this template (call `countProductsUsingTemplate(id)` in the parent).
- Bulleted summary of the diff:
  - "• Bloque {label} nuevo" for added
  - "• Bloque {label} modificado" for modified
  - "• Bloque {label} eliminado" for removed
- Buttons: "Cancelar" / "Guardar y propagar" (primary).

On confirm: calls `saveTemplateBlocks` (Task 9), shows toast "Plantilla actualizada. Cambios propagados a N productos.", clears localStorage backup, refreshes `originalSnapshot`.

Verify + commit:

```bash
git add components/admin/landing-templates/SaveAndPropagateDialog.tsx components/admin/landing-templates/TemplateBuilderShell.tsx
git commit -m "feat(templates): save-and-propagate dialog with diff summary"
```

### Task 23: Cache invalidation pass

**Files:**
- Audit all Server Actions in `actions/landing-templates.ts` once more.

Ensure these actions call `revalidateTag` with the right keys:

| Action | Tags to invalidate |
|---|---|
| `saveTemplateBlocks(templateId)` | `template:${templateId}` |
| `applyTemplateToProduct(productId, templateId)` | `product:${product.slug}` |
| `unlinkTemplateFromProduct(productId)` | `product:${product.slug}` |
| `deleteLandingTemplate(id)` | `template:${id}` AND each linked product's `product:${slug}` |
| `detachTemplateBlock(productId, _)` | `product:${product.slug}` |
| `restoreTemplateBlock(productId, _)` | `product:${product.slug}` |
| `saveProductLandingAsTemplate(productId, _)` | `template:${newId}` AND `product:${product.slug}` |
| `updateLandingTemplateMetadata(id, _)` | `template:${id}` |

Then in the storefront product page (or wherever the resolved blocks are fetched), wrap the fetcher in `unstable_cache` with both tags:

```typescript
const getProductWithLanding = unstable_cache(
  async (slug) => { /* fetch + resolveProductBlocks */ },
  ["product-landing"],
  { tags: ["product:" + slug, "template:" + (templateId ?? "none")] },
)
```

The `template:none` sentinel tag is for products without a template (its invalidation is a no-op but keeps the cache key signature consistent).

Verify + commit:

```bash
git add actions/landing-templates.ts components/shop/templates/ProductLandingView.tsx
git commit -m "feat(templates): revalidateTag cache invalidation across all template mutations"
```

---

## Final

### Task 24: Smoke test + merge

- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run build` clean (88+ static pages, zero errors).
- [ ] Manual:
  1. Create a template from scratch (blank), add 3 blocks, save and propagate (no products linked yet — should succeed silently).
  2. On a product, select the template via the dropdown, confirm the apply dialog → product now shows the 3 inherited blocks (🔗 badges).
  3. Edit one inherited block ("Editar localmente") → block becomes ✏️ detached. Modify a field → autosave persists. Switch to mobile preview → still works.
  4. Restore the detached block ("↺ Restaurar al template") → returns to 🔗 inherited.
  5. Open the template editor, modify another block, click "Guardar y propagar" → confirm dialog shows the diff summary.
  6. Refresh the product → the template change is now visible in the (still 🔗) inherited block. The restored block (#3 above) reflects the latest template content.
  7. Storefront `/productos/<slug>` renders the same.
  8. Use "Save as template" from a different product whose landing has no template → that product becomes linked to a brand-new template containing its blocks.
  9. Delete a template that's linked to a product → the product's blocks become local (📦); the product no longer has `landingTemplateId`.

If anything fails, fix in-place and amend the relevant task's commit chain.

- [ ] Merge:

```bash
git checkout master
git merge --no-ff feature/page-builder-plan-3 -m "Merge Plan 3: templates with sync"
git branch -d feature/page-builder-plan-3
```

---

## What's next after Plan 3

- **GALLERY data-shape migration** (orthogonal, was deferred from Plan 2.7). Migrate stored `images: string[]` to `{id, url}[]` so GALLERY can use the schema-driven editor like the other 10 blocks.
- **Auto-thumbnails** for templates (Puppeteer or `@vercel/og` in `/admin/_render-template/[id]`). Can fold into a small Plan 3.5.
- **Pre-seeded example templates** (`scripts/seed-landing-templates.ts`) with 3 starter templates: Electrónica genérica, Moda y ropa, Producto simple.
- **Template categories** as a controlled vocabulary instead of a free-text `category` field.
- **Per-product publish state** for landings (draft / published) — orthogonal feature.

# Optimistic Locking — Tier 1 (Plan 18)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate silent lost-update bugs when two or more admins edit the same resource concurrently. The customizer's auto-save model makes this risk especially high today: when Carlos and Lucía both edit a theme, the second `updateMany` quietly overwrites the first with zero feedback. After this plan, every save is conditional on the version the client last saw, and conflicts return a structured `409`-style result that the UI presents as a recoverable dialog rather than data loss.

**Architecture:** Add an integer `version` column (`@default(0)`) to every editable resource. Server Actions move from `prisma.X.update({ where: { id } })` to `prisma.X.updateMany({ where: { id, version: expectedVersion }, data: { ..., version: { increment: 1 } } })` and inspect `count` to detect the conflict. Stock fields (`Product.stock`, `ProductVariant.stock`, loyalty `Customer.points`) are audited separately and converted to atomic `{ increment }` / `{ decrement }` operations instead of read-modify-write — these need different semantics (always-correct accumulation, not last-write-wins). A single `ConflictDialog` component handles user-facing recovery: *Recargar para ver los cambios* or *Forzar guardado*. Client stores (Zustand for the customizer + page builder) track the `version` they loaded with and pass it on every autosave.

**Tech Stack:** Prisma 6.19 + PostgreSQL, Next.js 16 Server Actions, Zustand 5, TypeScript 5, Zod 4. No new dependencies. No new infrastructure.

**Spec ref:** none — implementation is mechanical, no design surface to spec.

**Verification convention:** This project has no automated tests. Each task verifies via `npm run build` (type-check + lint) and manual smoke testing in the browser. Manual concurrency tests open the same resource in two browser profiles (or Chrome + Incognito) and confirm the second save shows the conflict dialog — see CLAUDE.md.

**Pre-flight:**

```bash
git checkout master
git pull
git status   # working tree should be clean of unrelated changes
git checkout -b feature/plan-18-optimistic-locking
```

---

## Scope decision: which models get a `version` column

In scope (admin-editable, conflict risk real):

| Model | Why it needs it |
|---|---|
| `Theme` | Customizer auto-save, several admins likely on the same theme |
| `Page` | Page builder auto-save; landing pages edited by marketing |
| `PageBlock` | Granular per-block save |
| `LandingBlock` | Per-product landing edits |
| `LandingTemplate` + `TemplateBlock` | Shared templates touched by multiple admins |
| `CategoryBlock` | Category builder |
| `Menu` + `MenuItem` | Menu tree editor |
| `ThemeSection` + `ThemeSectionBlock` | Header/footer customizer |
| `Policy` | Long-form rich text edits |
| `Product` | Concurrent inventory + content edits |
| `ProductVariant` | Concurrent stock + price edits |
| `Coupon` | Editing while another admin uses the same coupon code |
| `Order` | Status updates from two admins |
| `Setting` | Site-wide config |
| `Role` + `RolePermission` | Roles edited by super admin alongside RBAC seed scripts |

Out of scope (append-only or single-writer):

- `OrderItem`, `InventoryMovement`, `PointTransaction`, `RewardRedemption` — append-only logs, no edits
- `Customer` — Clerk-synced; conflicts go through Clerk
- `Department` / `Province` / `District` — read-only reference data
- `ElectronicDocument` — externally sourced from NubeFact
- `CustomizableTemplate` — already low-collision; can be added in a follow-up if needed

Atomic-counter audit (separate from `version` — these models need `{ increment }` patterns, not optimistic locking, because the operation is "add to whatever it currently is" not "set to what I last saw"):

- `Product.stock`
- `ProductVariant.stock`
- `Customer.points`
- `Customer.totalSpent`
- `Coupon.usedCount`

---

## File Structure

**Phase A — Schema migration**

```
prisma/migrations/<ts>_add_version_columns/migration.sql   (new)
prisma/schema.prisma                                       (modified — +version Int @default(0) on all in-scope models)
lib/concurrency/types.ts                                   (new — ConflictResult type)
```

**Phase B — Server Actions: conflict-aware mutations**

```
lib/concurrency/with-version.ts                            (new — helper wrapping updateMany + count check)
actions/themes.ts                                          (modified)
actions/pages.ts                                           (modified)
actions/landing-blocks.ts                                  (modified)
actions/landing-templates.ts                               (modified)
actions/categories-blocks.ts                               (modified)
actions/menus.ts                                           (modified)
actions/theme-sections.ts                                  (modified)
actions/policies.ts                                        (modified)
actions/products.ts                                        (modified)
actions/coupons.ts                                         (modified)
actions/orders.ts                                          (modified)
actions/users.ts                                           (modified — Role updates)
```

**Phase C — Atomic counters audit (separate concern, same PR)**

```
actions/stock.ts                                           (audit — convert any read-modify-write to { increment }/{ decrement })
actions/inventory.ts                                       (audit)
actions/loyalty.ts                                         (audit — points / totalSpent)
actions/orders.ts                                          (audit — usedCount, stock decrement at checkout)
scripts/audit-non-atomic-updates.ts                        (new — grep tool that fails the build if `read-then-set` patterns appear on counter fields)
```

**Phase D — UI: conflict surfacing**

```
components/admin/concurrency/ConflictDialog.tsx            (new — reusable Radix Dialog)
components/admin/concurrency/use-version-aware-save.ts     (new — hook wrapping a server action with conflict detection)
components/admin/page-builder/store.ts                     (modified — track version, expose `setVersion`)
components/admin/customizer/CustomizerShell.tsx            (modified — wire up ConflictDialog)
components/admin/customizer/SaveStatusIndicator.tsx        (modified — new "conflict" state)
components/admin/pages/PageEditor.tsx                      (modified)
components/admin/menus/MenuEditor.tsx                      (modified)
components/admin/landing-templates/TemplateEditor.tsx      (modified)
components/admin/policies/PolicyEditor.tsx                 (modified)
components/admin/products/ProductForm.tsx                  (modified)
components/admin/categorias/CategoryBuilderShell.tsx       (modified)
```

**Phase E — Verification utilities + docs**

```
scripts/test-concurrent-save.ts                            (new — opens 2 sessions via fetch, asserts conflict)
docs/superpowers/guides/concurrency-and-locking.md         (new — when to use version, when to use atomic counters, recovery patterns)
CLAUDE.md                                                  (modified — add concurrency conventions section)
```

---

## Task Breakdown

### Phase A — Schema migration

- [ ] **A1.** Add `version Int @default(0)` to every in-scope model in [prisma/schema.prisma](../../../prisma/schema.prisma). Match formatting of existing fields; place after `updatedAt`.
- [ ] **A2.** Generate migration: `npx prisma migrate dev --name add_version_columns`. Confirm the SQL only contains `ALTER TABLE ... ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0` (no destructive ops).
- [ ] **A3.** Run `npx prisma generate`. Verify the new field appears on the typed `Prisma.X` types.
- [ ] **A4.** Create [lib/concurrency/types.ts](../../../lib/concurrency/types.ts) exporting:
      ```ts
      export type SaveResult<T> =
        | { ok: true; data: T; version: number }
        | { ok: false; reason: "conflict"; current: T | null }
        | { ok: false; reason: "validation"; message: string }
        | { ok: false; reason: "unauthorized" };
      ```
- [ ] **A5.** Verify: `npm run build` passes. No code uses the new field yet — this commit is the schema-only baseline.

### Phase B — Server Action helper + migrations

- [ ] **B1.** Create [lib/concurrency/with-version.ts](../../../lib/concurrency/with-version.ts) exporting `updateWithVersion(model, id, expectedVersion, data, refetch)`. Internally uses `prisma[model].updateMany({ where: { id, version: expectedVersion }, data: { ..., version: { increment: 1 } } })` and inspects `count`. On conflict (`count === 0`), calls `refetch` to return fresh state.
- [ ] **B2.** Update [actions/themes.ts](../../../actions/themes.ts): every `updateTheme*` accepts `expectedVersion: number`, uses the helper, returns `SaveResult`. Cover `updateTokens`, `updateColorSchemes`, `setHomePageId`, `setCartPageId`, `setDefaultProductLandingTemplateId`, `updateSectionCatalog`.
- [ ] **B3.** Update [actions/pages.ts](../../../actions/pages.ts) `updatePage` / `updatePageMetadata` / `setActive`. Block-list mutations operate on `PageBlock.version` per-block.
- [ ] **B4.** Update [actions/landing-blocks.ts](../../../actions/landing-blocks.ts), [actions/landing-templates.ts](../../../actions/landing-templates.ts), [actions/categories-blocks.ts](../../../actions/categories-blocks.ts).
- [ ] **B5.** Update [actions/menus.ts](../../../actions/menus.ts), [actions/theme-sections.ts](../../../actions/theme-sections.ts), [actions/policies.ts](../../../actions/policies.ts).
- [ ] **B6.** Update [actions/products.ts](../../../actions/products.ts) — only the content fields (title, description, SEO, images, variants metadata). Stock stays atomic (Phase C).
- [ ] **B7.** Update [actions/coupons.ts](../../../actions/coupons.ts), [actions/orders.ts](../../../actions/orders.ts) (status transitions only), [actions/users.ts](../../../actions/users.ts) (Role edits).
- [ ] **B8.** Update Zod schemas in each action to accept `expectedVersion: z.number().int().min(0)`.
- [ ] **B9.** Verify: `npm run build`. Manually call one of the updated actions from the admin UI — current UI passes `expectedVersion: 0` as a temporary stub until Phase D wires it up — confirm it saves and increments `version`.

### Phase C — Atomic counters audit

- [ ] **C1.** Run a grep audit across `actions/` for read-modify-write patterns on counter fields:
      ```
      const x = await prisma.X.findUnique(...); ... prisma.X.update({ data: { stock: x.stock - n } })
      ```
      Each hit gets converted to `prisma.X.update({ data: { stock: { decrement: n } } })`. Focus on `stock`, `points`, `totalSpent`, `usedCount`, `loyaltyPointsBalance`.
- [ ] **C2.** Audit the Culqi webhook ([app/api/webhook/route.ts](../../../app/api/webhook/route.ts)) and `actions/orders.ts` checkout path. Stock decrement at "order paid" must be inside a transaction with `{ decrement: qty }` and reject the transaction if any variant would go negative — use a transactional check, not a pre-fetch.
- [ ] **C3.** Audit loyalty: [actions/loyalty.ts](../../../actions/loyalty.ts) `addPoints` / `redeemReward` must use `{ increment }` / `{ decrement }`. Redemption must guard against negative balance in the transaction.
- [ ] **C4.** Create [scripts/audit-non-atomic-updates.ts](../../../scripts/audit-non-atomic-updates.ts) that scans `actions/` and `app/api/` for the regex `(stock|points|usedCount|totalSpent)\s*:\s*[^{]` (set-style assignment, not the atomic `{ increment }` block). Exits non-zero on any hit. Wire into `npm run build` as a pre-step or document as a manual lint.
- [ ] **C5.** Verify: place an order in dev, confirm stock decrement; redeem a reward, confirm points decrement; both operations work under concurrent test traffic from [scripts/test-concurrent-save.ts](../../../scripts/test-concurrent-save.ts) (Phase E).

### Phase D — UI: surface conflicts

- [ ] **D1.** Create [components/admin/concurrency/ConflictDialog.tsx](../../../components/admin/concurrency/ConflictDialog.tsx): Radix Dialog with two buttons — *Recargar* (refetches and discards local changes) and *Forzar guardado* (sends save again with the fresh `version` from server response, overwriting). Include who-saved info if `updatedBy` available, else just timestamp.
- [ ] **D2.** Create [components/admin/concurrency/use-version-aware-save.ts](../../../components/admin/concurrency/use-version-aware-save.ts): hook that wraps a server action. Signature `useVersionAwareSave({ action, onConflict })`. Tracks current `version`, calls action with it, on `{ ok: false, reason: "conflict" }` sets dialog state and exposes `acceptServerCopy()` / `forceOverwrite()` callbacks.
- [ ] **D3.** Update [components/admin/page-builder/store.ts](../../../components/admin/page-builder/store.ts): add `versions: Record<string, number>` map keyed by resource id, plus `setVersion(id, v)`. Initial values come from the loader.
- [ ] **D4.** Wire `ConflictDialog` into [CustomizerShell.tsx](../../../components/admin/customizer/CustomizerShell.tsx). Update [SaveStatusIndicator.tsx](../../../components/admin/customizer/SaveStatusIndicator.tsx) to add a `"conflict"` state shown as an amber pill (between "saving" and "error" visually).
- [ ] **D5.** Wire `ConflictDialog` into the page editor, menu editor, policy editor, landing template editor, product form, category builder.
- [ ] **D6.** Update loaders / Server Components that fetch editable resources to pass `version` down to client components. Pattern: `select: { ..., version: true }` in the Prisma fetch.
- [ ] **D7.** Manual concurrency smoke test:
      1. Open `/admin/personalizar/temas/X/customize` in Chrome.
      2. Open same URL in Chrome Incognito (different admin session).
      3. In Chrome: change primary color to red; let it auto-save.
      4. In Incognito: change primary color to blue.
      5. Expect: `ConflictDialog` appears in Incognito with red as the server's current value.
      6. Repeat for: page edit, menu edit, product variant edit, menu item reorder.

### Phase E — Verification + docs

- [ ] **E1.** Create [scripts/test-concurrent-save.ts](../../../scripts/test-concurrent-save.ts): uses `fetch` against a running local dev server. Logs in as admin, opens a page, fires two parallel `updatePage` calls with the same `expectedVersion`, asserts exactly one succeeds and one returns `{ ok: false, reason: "conflict" }`. Run with `npx tsx scripts/test-concurrent-save.ts`.
- [ ] **E2.** Create [docs/superpowers/guides/concurrency-and-locking.md](../../guides/concurrency-and-locking.md):
      - When to use `version` (content edits with last-write-wins risk)
      - When to use atomic counters (stock, points, anything accumulated)
      - Conflict dialog UX guidance (always offer *Recargar*, only offer *Forzar* when low-risk)
      - Limitations: doesn't help with two tabs of the same admin (browser session sees both `version`s); doesn't replace transactions; not real-time presence
- [ ] **E3.** Add a short "Concurrency" subsection to [CLAUDE.md](../../../CLAUDE.md) under Conventions:
      > Concurrent edits — Every editable model has a `version Int` column. Server Actions use `updateMany` with `where: { id, version }` and return `SaveResult` from `lib/concurrency/types.ts`. UI consumers wrap server actions with `useVersionAwareSave` (see [docs/superpowers/guides/concurrency-and-locking.md](docs/superpowers/guides/concurrency-and-locking.md)). Atomic counters (`stock`, `points`, `usedCount`) use Prisma's `{ increment }` / `{ decrement }` — never `select → modify → update`.
- [ ] **E4.** Final verification: `npm run build` clean. Re-run concurrency smoke tests from D7. Run [scripts/audit-non-atomic-updates.ts](../../../scripts/audit-non-atomic-updates.ts) — must exit 0.
- [ ] **E5.** Commit + PR. Suggested commit messages:
      - `feat(db): add version column to editable resources`
      - `feat(actions): version-aware updates with conflict detection`
      - `fix(stock): convert read-modify-write to atomic increment/decrement`
      - `feat(admin): ConflictDialog and useVersionAwareSave hook`
      - `docs: concurrency and optimistic locking guide`

---

## Risk register

| Risk | Mitigation |
|---|---|
| Same admin in two tabs — both load `version: 5`, both save | Out of scope for Tier 1; surfaces as a conflict dialog on the second tab. Tier 2 (presence) addresses this. |
| Server Action returns the new `version` but client store doesn't update → next save uses stale version → spurious conflict on every save | `useVersionAwareSave` MUST call `setVersion` on success. Add this to the hook itself, not call sites. |
| `Forzar guardado` overwrites another admin's work | Confirmation step in `ConflictDialog`; show the other admin's value before overwriting. Consider hiding the button entirely for high-risk resources (Orders, Products with stock). |
| `updatedAt` was previously used somewhere as a poor-man's version check | Grep `actions/` for `updatedAt` comparisons in `where` clauses — replace with `version`. |
| Migration locks tables on a large DB | `ADD COLUMN ... DEFAULT 0` in PG is metadata-only in recent versions (≥11). Neon is fine. No `UPDATE` required. |
| Block-list reorders (drag-and-drop position changes) generate many small writes | Each block has its own `version`; reorders increment each touched block. Confirm this matches existing batched-update patterns; if a single transaction updates 30 blocks, the helper must accept an array form. |
| Existing autosave debounce (~300ms) could send save N+1 before save N's `version` returns | Make `useVersionAwareSave` serialize writes per-resource — queue while a save is in flight, replace queued payload with latest (collapse). |

## Out of scope (explicit)

- Real-time presence ("Carlos is editing this") → Tier 2, separate plan
- CRDT-based collaborative editing (Yjs / Liveblocks) → Tier 3, separate plan
- Lock acquisition / leasing → not needed for Tier 1
- `CustomizableTemplate` versioning — defer; low collision risk today
- Audit log of who-saved-what — `AuditLog` already exists ([lib/audit-log.ts](../../../lib/audit-log.ts)); this plan does not extend it

---

## Estimated effort

| Phase | Effort |
|---|---|
| A — Schema + types | 30 min |
| B — Server Actions | 3-4 h |
| C — Atomic counters audit | 2-3 h (depends on findings) |
| D — UI surfacing | 3-4 h |
| E — Verification + docs | 1 h |
| **Total** | **~1 day of focused work** |

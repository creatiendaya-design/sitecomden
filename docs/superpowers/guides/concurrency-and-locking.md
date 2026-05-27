# Concurrency and Optimistic Locking (Plan 18 — Tier 1)

> Read this before adding a Server Action that mutates an admin-editable
> resource, before wiring an admin editor's save path, or when debugging
> "my changes disappeared after another admin saved".

## The problem

Two admins editing the same resource at once:

```
10:00  Carlos opens /admin/personalizar/temas/X/customize
10:01  Lucía opens the same customizer
10:02  Carlos: primary color → red. Auto-save fires.
10:03  Lucía: primary color → blue. Auto-save fires.
       ↓
       DB holds blue. Carlos's red was overwritten in silence.
       Carlos still sees red on screen — his next save sneaks past
       Lucía's value because his client thinks he wrote it.
```

This is the **lost-update problem**, amplified here because the customizer
auto-saves on every change — there is no manual "Save" button moment where
a conflict would naturally surface.

## The fix (Tier 1)

Every editable model has an integer `version` column (`@default(0)`).
Server Actions update with a conditional WHERE:

```ts
UPDATE Theme SET tokens = ..., version = version + 1
WHERE id = X AND version = $expected
```

If the row was touched since the client read it, `version` won't match,
the UPDATE affects zero rows, and the action returns
`{ ok: false, reason: "conflict", current, serverVersion }`. The UI shows
`<ConflictDialog>` with two recovery options.

This is **optimistic** locking: we don't lock anything ahead of time; we
just refuse the write if state changed. No DB-level locks, no Redis, no
WebSockets, no infrastructure changes.

## When to use `version` vs. atomic counters vs. transactions

| Pattern | When | Example |
|---|---|---|
| `version` + `SaveResult` | Content edits where last-write-wins is dangerous | Theme tokens, page blocks, menu items, policies, product description |
| `{ increment }` / `{ decrement }` | Counters that **accumulate** — the right answer is "whatever it was, plus/minus N" | `stock`, `points`, `usageCount`, `referralCount`, `totalSpent` |
| `prisma.$transaction` | Multi-statement operations that must be atomic | Order checkout (read stock → check → decrement + create OrderItem + decrement coupon), stock adjustment with movement record |

**Common mistake**: using `version` for a counter. Two admins both
incrementing `usageCount` would needlessly collide. Counters need atomic
ops, not optimistic locking.

**Common mistake**: using atomic ops for content. `{ set: { tokens: ... } }`
isn't a thing — content updates are last-write-wins by nature and need
`version` to detect collisions.

## Migrating a Server Action to versioned

Reference: `actions/themes.ts` → `updateThemeMetadataVersioned`. Pattern:

```ts
import { updateWithVersionAndRefetch } from "@/lib/concurrency/with-version";
import {
  conflict, errored, notFound, ok, unauthorized, validation,
  type SaveResult,
} from "@/lib/concurrency/types";

export async function updateXVersioned(
  id: string,
  expectedVersion: number,
  input: { ... },
): Promise<SaveResult<XRow>> {
  // 1. Auth without redirect (auto-save needs JSON, not 302).
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return unauthorized();
  const allowed = await hasPermission(userId, "x:update");
  if (!allowed) return unauthorized();

  // 2. Validation → return validation(message), NOT throw.
  if (someInvalidCondition) return validation("Mensaje claro");

  // 3. Build the data object.
  const data: Record<string, unknown> = { ... };

  // 4. Fast path: empty data → no version bump.
  if (Object.keys(data).length === 0) {
    const fresh = await prisma.x.findUnique({ where: { id }, include: ... });
    if (!fresh) return notFound();
    return ok(toXRow(fresh), fresh.version);
  }

  // 5. Conditional UPDATE.
  const result = await updateWithVersionAndRefetch({
    model: prisma.x,
    id,
    expectedVersion,
    data,
    refetch: (rowId) => prisma.x.findUnique({ where: { id: rowId }, include: ... }),
  });

  if (!result.ok) {
    if (result.reason === "conflict") {
      return conflict(result.current ? toXRow(result.current) : null, result.serverVersion);
    }
    return result;
  }

  // 6. Cache invalidation only on success.
  revalidatePath(...);

  return ok(toXRow(result.data), result.data.version);
}
```

Keep the existing function (`updateX`) untouched. Callers that don't need
conflict detection (background scripts, one-shot admin forms) can keep
using it; the customizer and other auto-save paths migrate to
`updateXVersioned` one by one.

## Wiring a versioned action in the UI

```tsx
"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useVersionAwareSave } from "@/components/admin/concurrency/use-version-aware-save";
import { ConflictDialog } from "@/components/admin/concurrency/ConflictDialog";
import { updateThemeMetadataVersioned, type ThemeRow } from "@/actions/themes";

export function ThemeEditor({ theme }: { theme: ThemeRow }) {
  const router = useRouter();

  const { state, save, acceptServerCopy, forceOverwrite, dismissConflict } =
    useVersionAwareSave({
      action: (expectedVersion, input: Parameters<typeof updateThemeMetadataVersioned>[2]) =>
        updateThemeMetadataVersioned(theme.id, expectedVersion, input),
      initialVersion: theme.version,
      onSuccess: () => {
        // Optional: update local store with the fresh data.
      },
      onReload: () => router.refresh(),
      onError: (message) => toast.error(message),
    });

  return (
    <>
      <button onClick={() => save({ name: "new name" })} disabled={state.saving}>
        Guardar
      </button>

      <ConflictDialog
        open={state.hasConflict}
        onOpenChange={(next) => { if (!next) dismissConflict(); }}
        onReload={acceptServerCopy}
        onForce={forceOverwrite}
        resourceLabel="este tema"
      />
    </>
  );
}
```

## When to hide *Forzar guardado*

The `<ConflictDialog onForce={...}>` button lets the user overwrite the
other admin's save. Hide it (`onForce={undefined}`) for high-risk
resources where forcing is more likely to cause damage than help:

- **Orders** — payment status, fulfillment status. A forced overwrite
  could mark a shipped order as pending, etc.
- **Stock** — almost always use atomic decrement instead, not versioned.
- **RolePermission** — accidentally restoring a permission another admin
  just revoked has security implications.
- **Coupons** — usage counters are atomic. The coupon definition itself
  is low-risk to force.

For routine content (theme tokens, page blocks, policy body, product
description) showing *Forzar guardado* is fine.

## What this does NOT solve

Be explicit with users / future-you about the limits of Tier 1:

| Scenario | Tier 1 behavior | What would fix it |
|---|---|---|
| Same admin opens the editor in two browser tabs | Second tab sees conflict on first save | Tier 2 (presence) — show "you have this open elsewhere" |
| Two admins editing different blocks of the same page | No conflict (per-block `version`) | Already works |
| Admin A reorders blocks while Admin B edits one block's content | Whichever finishes first wins on that block; the reorder is independent | Already works |
| Admin's last save happens after an external script (seed, migration) ran | Conflict raised | Tier 1 |
| Real-time collaborative editing à la Figma | Out of scope | Tier 3 — Yjs/Liveblocks |

## Atomic counters audit (as of Plan 18 deploy)

Critical paths already correct:

- `actions/payments.ts` — order paid → `stock: { decrement: qty }` ✓
- `actions/orders.ts:525` — coupon `usageCount: { increment: 1 }` ✓
- `actions/loyalty.ts` — points / totalSpent / referralCount all `{ increment }` / `{ decrement }` ✓
- `actions/inventory.ts:282,291` — recordInventoryMovement uses `{ increment }` ✓

Lower-priority follow-up:

- `actions/inventory.ts adjustStock` — admin "set stock to X" path uses
  read-modify-write outside a transaction. Two simultaneous adjustments
  race. Wrap in `prisma.$transaction` if/when this becomes a real problem
  (rare path; admin-only).

## How to apply the migration

The version columns are declared in `prisma/schema.prisma` and the SQL
sits in `prisma/migrations/20260526180000_add_version_columns/`.

Local dev:

```bash
npx prisma migrate dev
```

Prisma detects the pending migration and applies it. Because every column
is `ADD COLUMN ... NOT NULL DEFAULT 0`, the operation is metadata-only on
PG ≥ 11 and Neon — no table rewrite, no row-level locks.

Production:

```bash
npx prisma migrate deploy
```

No backfill script required. Every existing row gets `version = 0`. The
first save bumps it to `1`. Existing UI that hasn't been migrated yet
keeps calling the original `updateX` functions (last-write-wins), which
also bump `version` because the helper-driven actions do; but those
clients don't pass `expectedVersion` so they don't get conflict detection
until they migrate.

## Implementation status

### Shipped — single-resource conflict detection

- Schema + types + migration ✓
- `lib/concurrency/with-version.ts` helper ✓
- `ConflictDialog` + `useVersionAwareSave` ✓
- This guide + CLAUDE.md convention update ✓
- `scripts/diagnose-version-conflict.ts` — DB-layer self-test ✓
- **`actions/themes.ts`** → `updateThemeMetadataVersioned`
  → Wired into `CustomizerTokensPanel.tsx` (4 save paths)
- **`actions/policies.ts`** → `updatePolicyVersioned`
  → Wired into `PolicyEditor.tsx`
- **`actions/menus.ts`** → `updateMenuMetadataVersioned`
  → Wired into `EditMenuMetadataForm.tsx`
- **`actions/landing-templates.ts`** → `updateLandingTemplateMetadataVersioned`
  → Wired into `EditTemplateMetadataForm.tsx`

### Shipped — batch (multi-row) conflict detection

`lib/concurrency/batch.ts` adds the per-row pre-check helper and the
all-or-nothing `BatchSaveResult` discriminated union. The atomicity policy
is documented in that file's module comment.

UI surface:
- `components/admin/concurrency/BatchConflictDialog.tsx` — reusable list-style
  conflict dialog (label + force/reload buttons).
- `components/admin/concurrency/use-version-aware-batch-save.ts` — hook with
  serialized queue + force-overwrite helpers (currently used as a reference
  pattern; each editor implements its own inline save flow because their
  Zustand stores differ).

DB-layer self-test: `scripts/diagnose-batch-conflict.ts`.

Versioned batch actions + wired editors:

| Action | Wired editor |
|---|---|
| `actions/theme-sections.ts saveThemeSectionGroupVersioned` | `CustomizerShell.tsx` (header + footer zones) |
| `actions/pages.ts savePageBlocksVersioned` | `CustomizerShell.tsx` (Plantilla zone), `PageBuilderShell.tsx` |
| `actions/categories-blocks.ts saveCategoryBlocksVersioned` | `CustomizerShell.tsx` (category targets), `CategoryBuilderShell.tsx` |
| `actions/landing-blocks.ts syncProductLandingBlocksVersioned` | `ProductLandingBuilder.tsx` |
| `actions/menus.ts saveMenuItemsVersioned` | `MenuTreeEditor.tsx` |

Every per-row store also got a `version?` field threaded through:
- `lib/blocks/types.ts BlockInstance.version`
- `theme-sections-store.ts SectionDraft.version + BlockDraft.version`
- `menu MenuItemSheet.tsx DraftItem.version`

The page-builder store grew a `replaceBlocksFromServer(persisted)` method
that adopts the post-save snapshot (fresh ids + versions) without
clobbering simultaneous local edits.

### Deferred — different mutation pattern

These use API Routes (not Server Actions); the `updateWithVersion` helper applies but the result envelope is different (HTTP Response vs SaveResult):

- `app/api/admin/products/[productId]/update/route.ts` — product content
- `app/api/admin/coupons/[couponId]/update/route.ts` — coupon definition
- (Other admin REST endpoints)

When tackling these:
- Add `expectedVersion` to the request body (Zod-validated).
- On conflict, return `409` with `{ current, serverVersion }` in JSON.
- Client `fetch()` callers branch on `res.status === 409` to surface the dialog.

### Always pending — atomic counter cleanup

- `actions/inventory.ts adjustStock` — wrap in `prisma.$transaction` (rare admin path).
- Periodic re-audit of new code via grep for `select stock → modify → update stock` patterns.

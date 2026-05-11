# Menu Builder · 3-level support (Shopify-style)

**Date**: 2026-05-01
**Scope**: Lift the menu builder from 2 levels to 3 levels, matching Shopify's main-menu UX. Affects admin editor, storefront desktop nav, mobile nav, and server validation.
**Status**: Design approved by user — pending implementation plan.

---

## 1. Motivation

The current `Menu` / `MenuItem` model is self-referential, but the comment in `prisma/schema.prisma:1121` caps depth at 2 ("max depth 2 in v1") and both the admin editor (`MenuTreeEditor`) and the storefront renderer (`HeaderNavMenu`) hard-code that cap. Real catalogs frequently need 3 levels (e.g. `Hombres → Ropa → Camisas`). Shopify's admin caps at 3 — that's the target.

The data layer (`lib/menus/resolve-menu.ts`) already builds N-level trees with a generic parent→children loop and does **not** need changes.

---

## 2. Non-goals

- N>3 nesting. The cap is exactly 3, like Shopify. Beyond that, users should split into multiple menus.
- Drag-to-reparent across levels in v1. Reorder is sibling-only (current behavior preserved).
- Mega-menu auto-derivation from 3-level menus. ShopGood already has a separate `MEGA_MENU` theme section for that need; the regular menu stays as cascading dropdowns.
- Cache layer changes. `unstable_cache` + `menu:<slug>` tag invalidation in `lib/menus/get-menu-by-slug.ts` / `lib/menus/get-menu-by-id.ts` already work for arbitrary depth.

---

## 3. Architecture

### 3.1 Files touched

| File | Change |
|---|---|
| `lib/menus/constants.ts` | **NEW** — exports `MAX_MENU_DEPTH = 3`. |
| `prisma/schema.prisma:1121` | Update comment from `"max depth 2 in v1"` to `"max depth 3 — enforced server-side in actions/menus.ts"`. **No migration**. |
| `actions/menus.ts` | Replace 2-pass save with topological save; add Zod validation for depth ≤ 3, no cycles, parentId belongs to same menu. |
| `components/admin/menus/MenuTreeEditor.tsx` | Recursive `NestedChildren` with `depth` prop; per-level styling; collapse/expand; "Agregar subitem" hidden when `depth >= MAX_MENU_DEPTH - 1`. |
| `components/admin/menus/MenuItemSheet.tsx` | Add breadcrumb in header showing `Root > Parent > [current]`. |
| `components/shop/HeaderNavMenu.tsx` | Recursive `NavItem` with `depth` prop; cascade fly-out for `depth >= 1`; intent delay; auto-flip on viewport overflow; full keyboard + ARIA. |
| `components/shop/MobileMenu.tsx` | Recursive accordion; per-level indent; separated label-tap (navigate) vs caret-tap (expand). |

### 3.2 Files NOT touched

- `lib/menus/resolve-menu.ts` — already builds N-level trees.
- `lib/menus/get-menu-by-slug.ts`, `get-menu-by-id.ts`, `get-themed-menu.ts` — already cache by tag and depth-agnostic.
- `components/shop/theme-sections/header/HeaderMain.tsx` — passes the resolved tree to `HeaderNavMenu` and `MobileMenu` unchanged.
- `MEGA_MENU` theme section — orthogonal feature.

---

## 4. Editor UX (`MenuTreeEditor`)

### 4.1 Visual hierarchy

| Level | Background | Indent | Left border |
|---|---|---|---|
| 0 (root) | `bg-card` (white) | `pl-3` | none |
| 1 | `bg-muted/30` | `pl-6` | `border-l-2 border-primary/30` |
| 2 | `bg-muted/50` | `pl-12` | `border-l-2 border-primary/50` |

A discreet badge `[L1] / [L2] / [L3]` sits next to the link-type badge so the user always knows the depth. Badge color follows the same primary opacity ramp as the border.

### 4.2 Drag & drop

- `useSortable` per item, one `DndContext` + `SortableContext` per parent (matches current pattern, just generalized via recursion).
- Reorder is sibling-only. No cross-parent drag in v1.
- `GripVertical` handle is present at every level.

### 4.3 Add subitem button

- Renders **only on hover** of the parent row (no permanent visual clutter).
- Hidden when the parent is at `depth === MAX_MENU_DEPTH - 1` (i.e. its potential children would be at level 4, which is forbidden).
- When hidden, the parent's `MenuItemSheet` shows a small `text-muted-foreground` line: `"Nivel máximo alcanzado — este item no puede tener subitems."`

### 4.4 Collapse / expand

- `ChevronDown` (rotated 180° when expanded) on rows that have children.
- State held in a local `Set<string>` of expanded ids inside `MenuTreeEditor`. Not persisted — purely an editing-session UX aid.
- Default state: all expanded on first render (matches current behavior).
- "Expandir todo" / "Colapsar todo" buttons in the header for big menus.

### 4.5 Empty submenu

- When a parent has 0 children and is being expanded, the panel shows a `border-dashed` drop-zone-style placeholder with text `"Sin subitems · "` followed by an inline `+ Agregar` button.

### 4.6 MenuItemSheet breadcrumb

- New header line above the form: `Inicio › Tienda › Hombres` (where `Inicio` is the menu title and the rest is the ancestor chain).
- Computed by walking `parentId` up the tree.

### 4.7 Save flow

- Unchanged contract (single `saveMenuItems(menuId, items)` call), unchanged dirty/discard tracking.
- `originalRef` snapshot still uses `JSON.stringify` on the items array; works for arbitrary depth.

---

## 5. Storefront desktop UX (`HeaderNavMenu`)

### 5.1 Cascade fly-out

- `NavItem` becomes recursive with a `depth: number` prop.
- `depth === 0` (top-level): button in nav-bar; on hover/focus opens a panel **below** (`top-full left-0 pt-2`).
- `depth >= 1`: row in dropdown; on hover/focus opens a panel **to the right** (`top-0 left-full pl-2`).
- Indicator: items with children render a chevron-right (`›`) icon at the trailing edge of the row at `depth >= 1`, and chevron-down at `depth === 0` (current behavior preserved).

### 5.2 Mouse retention

- Each `NavItem` wraps row + child panel in a single `<div>` with shared `onMouseEnter` / `onMouseLeave`. The cursor crossing the gap between row and panel does not close the menu because the wrapper covers both.
- 120ms timeout on `onMouseLeave` (cleared on `onMouseEnter`) to absorb accidental brushes.

### 5.3 Auto-flip

- On panel open, measure `getBoundingClientRect()`. If `right > window.innerWidth - 8`, set `data-flip="true"` which swaps `left-full` for `right-full` and `pl-2` for `pr-2`.
- Re-measure on window `resize` (throttled).

### 5.4 Highlight active parent

- When a parent's panel is open, the parent row gets `bg-muted/40` for visual continuity with the open panel.

### 5.5 Animation

- Panel: `opacity-0 translate-y-1` → `opacity-100 translate-y-0` over `100ms`. Same axis-flipped (`translate-x-1` → `translate-x-0`) for fly-outs at `depth >= 1`.
- Use Tailwind's `data-[state=open]` selector pattern — no JS animation lib.

### 5.6 Accessibility

- Top-level `<nav>` has `role="menubar"`. Panels have `role="menu"`. Items have `role="menuitem"`. Items with children carry `aria-haspopup="true"` + `aria-expanded={open}`.
- Keyboard map:
  - `↓` / `↑` — move within current panel.
  - `→` — open child panel and focus first item; or move to next top-level item if at `depth === 0`.
  - `←` — close current panel and return focus to parent; or move to previous top-level if at `depth === 0`.
  - `Esc` — close all open panels, return focus to top-level item.
  - `Enter` / `Space` — activate link.
  - `Tab` — natural focus flow (closes panels along the way).
- Focus management: when opening a panel via keyboard, focus moves into the first item. When closing, focus returns to the trigger.

### 5.7 Click outside

- Document-level `mousedown` listener closes all open panels when target is outside the nav. Mounted only while at least one panel is open.

---

## 6. Mobile UX (`MobileMenu`)

### 6.1 Recursive accordion

- Same component handles all 3 levels.
- Each level adds `pl-4 border-l border-border/50` so depth is visible.
- Animated height: `max-h-0` → `max-h-[1000px]` + `overflow-hidden` + `transition-[max-h] duration-200`. (1000px upper bound is safe for any realistic submenu length and avoids needing `ResizeObserver`.)

### 6.2 Tap targets

- The row splits into:
  - **Label** (left, flex-1) — clickable link if the item has a navigable href; otherwise styled as a plain header for grouping-only items.
  - **Caret** (right, fixed 44×44 hit area) — toggles expand/collapse independently.
- Items without children render only the label (no caret, full-width tap).

### 6.3 Active state

- Expanded parents get `bg-muted/30`; the caret rotates 180°.

---

## 7. Server validation (`actions/menus.ts`)

### 7.1 Topological save

Replace lines 232–274 (2-pass roots-then-children) with a Kahn-style iterative pass:

```ts
const tmpToReal = new Map<string, string>()
const resolved = new Set<string>()
let pending = [...incoming]
let lastSize = -1

while (pending.length > 0 && pending.length !== lastSize) {
  lastSize = pending.length
  const next: typeof pending = []
  for (const it of pending) {
    const parentResolved =
      it.parentId === null ||
      resolved.has(it.parentId) ||
      tmpToReal.has(it.parentId) ||
      existingIds.has(it.parentId)
    if (!parentResolved) {
      next.push(it)
      continue
    }
    const realParentId =
      it.parentId === null
        ? null
        : tmpToReal.get(it.parentId) ?? it.parentId
    const data = { menuId, parentId: realParentId, position, label, ... }
    const isNew = it.id.startsWith("tmp-") || !existingIds.has(it.id)
    if (isNew) {
      const created = await tx.menuItem.create({ data, select: { id: true } })
      tmpToReal.set(it.id, created.id)
    } else {
      await tx.menuItem.update({ where: { id: it.id }, data })
      tmpToReal.set(it.id, it.id)
    }
    resolved.add(it.id)
  }
  pending = next
}

if (pending.length > 0) {
  throw new Error("Ciclo o referencia inválida en parentId")
}
```

### 7.2 Zod schema at boundary

```ts
const itemSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  position: z.number().int().min(0),
  label: z.string().min(1).max(100),
  linkType: z.enum(["HOME","PRODUCTS_INDEX","COLLECTIONS_INDEX","PAGE","PRODUCT","CATEGORY","EXTERNAL_URL"]),
  targetId: z.string().nullable(),
  externalUrl: z.string().url().nullable(),
  openInNewTab: z.boolean(),
})
const itemsSchema = z.array(itemSchema)
```

Apply at the top of `saveMenuItems`: `const items = itemsSchema.parse(incoming)`.

### 7.3 Depth + cycle validation

After parsing, before the transaction:

```ts
function computeDepth(itemId: string, byId: Map<string, IncomingItem>, seen = new Set<string>()): number {
  if (seen.has(itemId)) throw new Error("Ciclo detectado en el árbol del menú")
  const it = byId.get(itemId)
  if (!it || it.parentId === null) return 0
  seen.add(itemId)
  return 1 + computeDepth(it.parentId, byId, seen)
}

const byId = new Map(items.map(i => [i.id, i]))
for (const it of items) {
  const depth = computeDepth(it.id, byId)
  if (depth >= MAX_MENU_DEPTH) {
    throw new Error(`El menú no puede tener más de ${MAX_MENU_DEPTH} niveles`)
  }
}
```

`MAX_MENU_DEPTH = 3` means valid depths are `0, 1, 2` (3 levels total).

### 7.4 parentId belongs to same menu

For `parentId` values that reference an existing item (not a `tmp-` id), verify the parent's `menuId` matches the current menu before the transaction. Prevents cross-menu reparenting via crafted payloads.

---

## 8. Edge cases

| Case | Behavior |
|---|---|
| User tries to drag a level-3 item under another level-3 item | Not possible in v1 — drag is sibling-only. Future feature. |
| User has an existing menu with depth-2 items and adds a level-3 child | Works seamlessly. The new constant allows it. |
| Migration from existing data | None needed. Schema is unchanged. |
| Client sends a depth-4 payload (out-of-band) | Server `computeDepth` throws; user sees toast `"El menú no puede tener más de 3 niveles"`. |
| Empty submenu collapsed/expanded toggle | Local state only; refresh resets to all-expanded. |
| Mobile tap on a parent with no link (e.g. `linkType === HOME` with no own purpose) | Label still navigates per `resolveMenuItemHref`. If href is null, the label becomes non-interactive (cursor-default) and only the caret toggles. |
| Fly-out at depth-2 hits viewport edge | Auto-flip to `right-full`. If still doesn't fit (very narrow viewport), it gets clipped — acceptable since desktop nav is hidden below `md` breakpoint. |
| Keyboard user opens a fly-out and Tab leaves the nav | All open panels close, focus continues naturally to next focusable element on page. |

---

## 9. Testing strategy

No automated tests exist in the project. Verification is `npm run build` (type-check) + manual smoke testing.

**Manual checklist (post-implementation):**

Editor:
- [ ] Add 3 levels via UI, save, refresh, see them persisted.
- [ ] Try to add a 4th level — "Agregar subitem" button is hidden at level 3.
- [ ] Reorder items at each of the 3 levels via drag.
- [ ] Collapse/expand toggles work; "Expandir todo" / "Colapsar todo" header buttons work.
- [ ] Delete a level-1 item with grandchildren — cascade works (Prisma `onDelete: Cascade`).
- [ ] Breadcrumb in `MenuItemSheet` shows the full ancestor chain.

Storefront desktop:
- [ ] Hover top-level → dropdown opens below.
- [ ] Hover dropdown item with children → fly-out opens to the right.
- [ ] Mouse traveling from dropdown row to fly-out does not close the menu.
- [ ] Quick mouse pass-by does not flicker open/close (intent delay).
- [ ] Fly-out near right edge of viewport flips left.
- [ ] Keyboard: Tab/↓/↑/→/←/Esc all behave per spec.
- [ ] Screen reader announces `aria-expanded` correctly (test with NVDA or VoiceOver).
- [ ] Click outside closes panels.

Mobile:
- [ ] All 3 levels expandable via caret tap.
- [ ] Label tap on a parent with a link navigates; caret tap toggles expand.
- [ ] Indent visible at each level.
- [ ] Animation smooth, no layout shift.

Server:
- [ ] Save a 3-level menu via UI → success.
- [ ] Hand-craft a payload with depth 4 via DevTools → server throws.
- [ ] Hand-craft a payload with a cycle (`a.parentId = b`, `b.parentId = a`) → server throws.
- [ ] Hand-craft a payload with `parentId` pointing to an item from another menu → server throws.

---

## 10. Implementation phasing

Suggested phases for the implementation plan (to be detailed via writing-plans skill):

**Phase 1 — Foundation**
- Create `lib/menus/constants.ts` with `MAX_MENU_DEPTH`.
- Update schema comment.
- Replace `saveMenuItems` save loop with topological pass.
- Add Zod schema + depth/cycle/menuId validation.

**Phase 2 — Editor**
- Make `NestedChildren` recursive with `depth` prop.
- Per-level styling (bg + indent + border).
- Collapse/expand state + header controls.
- "Agregar subitem" hover-only + depth gate.
- Breadcrumb in `MenuItemSheet`.

**Phase 3 — Storefront desktop**
- Recursive `NavItem` with `depth` prop.
- Cascade fly-out positioning.
- Intent delay + mouse retention.
- Auto-flip on viewport overflow.
- Keyboard + ARIA.
- Click outside handler.

**Phase 4 — Mobile**
- Recursive accordion.
- Split label/caret tap targets.
- Per-level indent.

**Phase 5 — QA**
- `npm run build`.
- Manual checklist run-through in Chrome + mobile viewport (DevTools).
- Smoke test on a real 3-level menu (e.g. `Hombres → Ropa → Camisas`).

---

## 11. Open questions

None at design time. User has approved scope, visual style (cascade fly-out), and overall UX direction.

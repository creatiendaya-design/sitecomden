# Menu Builder · 3-level support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the menu builder from 2 levels to 3 levels (Shopify-style) across editor, storefront desktop, mobile, and server validation.

**Architecture:** Recursive components with `depth` prop and a `MAX_MENU_DEPTH = 3` cap; topological server-side save replaces the 2-pass parent/child save; storefront desktop uses cascading fly-outs with intent-delay + auto-flip; mobile uses a recursive accordion.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Prisma 6 · @dnd-kit · Tailwind v4 · Zod 4 · sonner toasts.

**Spec:** [docs/superpowers/specs/2026-05-01-menu-builder-3-levels-design.md](../specs/2026-05-01-menu-builder-3-levels-design.md)

**Verification model:** This project has zero automated tests (per `CLAUDE.md`). Each phase ends with `npm run build` (type-check) and manual smoke per the spec's section 9 checklist.

---

## Phase 1 — Foundation: constants, schema comment, server validation

### Task 1: Create depth constant module

**Files:**
- Create: `lib/menus/constants.ts`

- [ ] **Step 1: Create the file with the depth constant**

```ts
/**
 * Maximum nesting depth allowed in a Menu, counting from 0.
 * Depth 0 = root, 1 = child, 2 = grandchild → 3 levels total.
 * Matches Shopify's main-menu cap.
 *
 * Enforced server-side in actions/menus.ts (computeDepth + cycle check)
 * and surfaced in the admin editor + storefront renderers as a UI gate.
 */
export const MAX_MENU_DEPTH = 3
```

- [ ] **Step 2: Type-check builds clean**

Run: `npm run build`
Expected: build succeeds; the new file is unused but compiles.

- [ ] **Step 3: Commit**

```bash
git add lib/menus/constants.ts
git commit -m "feat(menus): add MAX_MENU_DEPTH constant for 3-level support"
```

---

### Task 2: Update schema docblock

**Files:**
- Modify: `prisma/schema.prisma:1121`

- [ ] **Step 1: Update the comment**

Replace the existing comment on the `MenuItem.parentId` field:

```prisma
  /// Self-referential parent. Max depth 3 — enforced server-side in
  /// actions/menus.ts (computeDepth + cycle check). The DB itself does
  /// not enforce a cap; depth is treated as a domain rule.
  parentId      String?
```

- [ ] **Step 2: Verify nothing else changed**

Run: `git diff prisma/schema.prisma`
Expected: only the comment block on the `parentId` field changed. No `prisma migrate` needed (no schema change).

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "docs(schema): note 3-level cap on MenuItem.parentId"
```

---

### Task 3: Add Zod input schema to saveMenuItems

**Files:**
- Modify: `actions/menus.ts` (top of file imports + before `saveMenuItems`)

- [ ] **Step 1: Add zod import at the top of the file**

After the existing imports in `actions/menus.ts`:

```ts
import { z } from "zod"
import { MAX_MENU_DEPTH } from "@/lib/menus/constants"
```

- [ ] **Step 2: Define the validation schema right above `saveMenuItems`**

Insert this block before `export async function saveMenuItems(...)`:

```ts
const linkTypeEnum = z.enum([
  "HOME",
  "PRODUCTS_INDEX",
  "COLLECTIONS_INDEX",
  "PAGE",
  "PRODUCT",
  "CATEGORY",
  "EXTERNAL_URL",
])

const incomingItemSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  position: z.number().int().min(0),
  label: z.string().trim().min(1).max(120),
  linkType: linkTypeEnum,
  targetId: z.string().nullable(),
  externalUrl: z
    .string()
    .url()
    .nullable()
    .or(z.literal("").transform(() => null)),
  openInNewTab: z.boolean(),
})

const incomingItemsSchema = z.array(incomingItemSchema)
```

- [ ] **Step 3: Apply the schema at the start of `saveMenuItems`**

Inside `saveMenuItems`, immediately after `await protectRoute("menus:update")`, replace the use of `incoming` with a parsed copy:

```ts
export async function saveMenuItems(
  menuId: string,
  incoming: IncomingItem[],
): Promise<{ success: true }> {
  await protectRoute("menus:update")
  const items = incomingItemsSchema.parse(incoming)
  // … the rest of the function uses `items` instead of `incoming`
```

Then **rename every reference to `incoming` inside the function body to `items`** (search/replace within the function only).

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: build succeeds. Any `incoming` reference left over will surface as a type error.

- [ ] **Step 5: Commit**

```bash
git add actions/menus.ts
git commit -m "feat(menus): zod-validate saveMenuItems input"
```

---

### Task 4: Add depth + cycle + cross-menu validation helpers

**Files:**
- Modify: `actions/menus.ts`

- [ ] **Step 1: Add validation helpers before `saveMenuItems`**

Insert below the schema definitions from Task 3:

```ts
type ValidatedItem = z.infer<typeof incomingItemSchema>

/**
 * Walks the parent chain of `itemId` and returns its depth (root = 0).
 * Throws on cycles. Used to enforce MAX_MENU_DEPTH server-side.
 */
function computeDepth(
  itemId: string,
  byId: Map<string, ValidatedItem>,
  seen: Set<string> = new Set(),
): number {
  if (seen.has(itemId)) {
    throw new Error("Ciclo detectado en el árbol del menú")
  }
  const it = byId.get(itemId)
  if (!it || it.parentId === null) return 0
  seen.add(itemId)
  return 1 + computeDepth(it.parentId, byId, seen)
}

/**
 * Throws if any item exceeds MAX_MENU_DEPTH or if the tree contains a cycle.
 */
function assertDepthAndAcyclic(items: ValidatedItem[]): void {
  const byId = new Map(items.map((i) => [i.id, i]))
  for (const it of items) {
    const depth = computeDepth(it.id, byId)
    if (depth >= MAX_MENU_DEPTH) {
      throw new Error(
        `El menú no puede tener más de ${MAX_MENU_DEPTH} niveles`,
      )
    }
  }
}

/**
 * Asserts that every non-tmp parentId reference points to an item that
 * already belongs to the same menu. Prevents cross-menu reparenting via
 * crafted payloads.
 */
async function assertParentsBelongToMenu(
  menuId: string,
  items: ValidatedItem[],
): Promise<void> {
  const incomingIds = new Set(items.map((i) => i.id))
  const externalParentIds = items
    .map((i) => i.parentId)
    .filter((p): p is string => p !== null && !p.startsWith("tmp-") && !incomingIds.has(p))
  if (externalParentIds.length === 0) return
  const found = await prisma.menuItem.findMany({
    where: { id: { in: externalParentIds } },
    select: { id: true, menuId: true },
  })
  for (const id of externalParentIds) {
    const row = found.find((f) => f.id === id)
    if (!row || row.menuId !== menuId) {
      throw new Error("parentId inválido: no pertenece a este menú")
    }
  }
}
```

- [ ] **Step 2: Call the validators inside `saveMenuItems`**

Right after `const items = incomingItemsSchema.parse(incoming)` (added in Task 3), before the `prisma.menu.findUnique` call:

```ts
  assertDepthAndAcyclic(items)
  await assertParentsBelongToMenu(menuId, items)
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add actions/menus.ts
git commit -m "feat(menus): enforce 3-level cap + acyclic + same-menu parentId"
```

---

### Task 5: Replace 2-pass save with topological save

**Files:**
- Modify: `actions/menus.ts` lines 232–274 (the `roots`/`children` save loop)

- [ ] **Step 1: Replace the save loop**

Find the block that starts with `const roots = items.filter((i) => i.parentId === null)` and ends with the close of the `for (const it of children)` loop. Replace it entirely with:

```ts
    // Topological insert: each pass inserts items whose parent is already
    // resolved (root, previously inserted in this transaction, or pre-existing).
    // Repeat until none remain. If a pass makes no progress, the payload has
    // a cycle or an unreachable parent — abort.
    let pending: ValidatedItem[] = [...items]
    let lastSize = -1

    while (pending.length > 0 && pending.length !== lastSize) {
      lastSize = pending.length
      const next: ValidatedItem[] = []

      for (const it of pending) {
        const parentResolved =
          it.parentId === null ||
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

        const data = {
          menuId,
          parentId: realParentId,
          position: it.position,
          label: it.label,
          linkType: it.linkType,
          targetId: it.targetId,
          externalUrl: it.externalUrl,
          openInNewTab: it.openInNewTab,
        }

        const isNew = it.id.startsWith("tmp-") || !existingIds.has(it.id)
        if (isNew) {
          const created = await tx.menuItem.create({
            data,
            select: { id: true },
          })
          tmpToReal.set(it.id, created.id)
        } else {
          await tx.menuItem.update({ where: { id: it.id }, data })
          tmpToReal.set(it.id, it.id)
        }
      }

      pending = next
    }

    if (pending.length > 0) {
      throw new Error(
        "No se pudo guardar el menú: referencia inválida en parentId",
      )
    }
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual smoke (level 1 only — sanity check that save still works)**

Run: `npm run dev`
Open `/admin/menus/<any-existing-menu-id>`, drag-reorder a root item, save. Verify toast `"Menú guardado"` and that the order persists after refresh.

- [ ] **Step 4: Commit**

```bash
git add actions/menus.ts
git commit -m "feat(menus): topological save (supports 3 levels)"
```

---

## Phase 2 — Editor: recursive 3-level UI

### Task 6: Make `NestedChildren` recursive in MenuTreeEditor

**Files:**
- Modify: `components/admin/menus/MenuTreeEditor.tsx`

- [ ] **Step 1: Add the depth import**

Add to the existing imports at the top:

```ts
import { MAX_MENU_DEPTH } from "@/lib/menus/constants"
```

- [ ] **Step 2: Refactor `NestedChildren` to accept a `depth` prop and recurse**

Replace the existing `NestedChildren` component (currently at the bottom of the file) with:

```tsx
function NestedChildren({
  parentId,
  items,
  childrenOf,
  onReorder,
  sensors,
  onEdit,
  onDelete,
  onAddChild,
  depth,
  expanded,
  toggleExpand,
}: {
  parentId: string
  items: DraftItem[]
  childrenOf: (id: string) => DraftItem[]
  onReorder: (parentId: string) => (e: DragEndEvent) => void
  sensors: ReturnType<typeof useSensors>
  onEdit: (item: DraftItem) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  depth: number
  expanded: Set<string>
  toggleExpand: (id: string) => void
}) {
  const canAddDeeper = depth < MAX_MENU_DEPTH - 1
  const indent = depth === 1 ? "pl-6" : "pl-12"
  const bg = depth === 1 ? "bg-muted/30" : "bg-muted/50"
  const borderColor = depth === 1 ? "border-primary/30" : "border-primary/50"

  return (
    <div className={`border-t ${indent} pr-3 pb-3 pt-2 space-y-2 ${bg} border-l-2 ${borderColor}`}>
      {items.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onReorder(parentId)}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((child) => {
              const grandchildren = childrenOf(child.id)
              const isExpanded = expanded.has(child.id)
              return (
                <SortableMenuItem
                  key={child.id}
                  item={child}
                  depth={depth}
                  hasChildren={grandchildren.length > 0}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleExpand(child.id)}
                  onEdit={() => onEdit(child)}
                  onDelete={() => onDelete(child.id)}
                  onAddChild={
                    canAddDeeper ? () => onAddChild(child.id) : undefined
                  }
                >
                  {isExpanded && canAddDeeper && (
                    <NestedChildren
                      parentId={child.id}
                      items={grandchildren}
                      childrenOf={childrenOf}
                      onReorder={onReorder}
                      sensors={sensors}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAddChild={onAddChild}
                      depth={depth + 1}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                    />
                  )}
                </SortableMenuItem>
              )
            })}
          </SortableContext>
        </DndContext>
      ) : null}
      {canAddDeeper && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onAddChild(parentId)}
        >
          <Plus className="mr-1.5 h-3 w-3" />
          Agregar subitem
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update `SortableMenuItem` to accept depth + hasChildren + expand controls + onAddChild + add the level badge**

Replace the existing `SortableMenuItem` with:

```tsx
function SortableMenuItem({
  item,
  depth,
  hasChildren,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddChild,
  children,
}: {
  item: DraftItem
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
  onAddChild?: () => void
  children?: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  const levelLabel = `L${depth + 1}`
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="rounded-lg border bg-card group/item"
    >
      <div className="flex items-center gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground"
          aria-label="Arrastrar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {hasChildren ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isExpanded ? "Colapsar" : "Expandir"}
            aria-expanded={isExpanded}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                isExpanded ? "rotate-0" : "-rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="w-3.5" aria-hidden />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.label}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className="text-[10px] font-normal h-4 px-1">
              {levelLabel}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-normal h-4 px-1.5">
              {LINK_TYPE_LABEL[item.linkType] ?? item.linkType}
            </Badge>
          </p>
        </div>
        {onAddChild && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover/item:opacity-100 transition-opacity"
            onClick={onAddChild}
            aria-label="Agregar subitem"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Add the missing imports**

Add to the existing imports at the top of the file:

```ts
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
```

- [ ] **Step 5: Update the `MenuTreeEditor` body to pass new props + manage expanded state**

Replace the body of `MenuTreeEditor` between `const sensors = useSensors(...)` and the `return (` with:

```tsx
  // Local UI state — collapse/expand per item id (not persisted).
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.parentId === null).map((i) => i.id)),
  )
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const expandAll = () =>
    setExpanded(new Set(items.map((i) => i.id)))
  const collapseAll = () => setExpanded(new Set())

  const roots = items
    .filter((i) => i.parentId === null)
    .sort((a, b) => a.position - b.position)

  const childrenOf = (parentId: string): DraftItem[] =>
    items
      .filter((i) => i.parentId === parentId)
      .sort((a, b) => a.position - b.position)
```

- [ ] **Step 6: Update the root render to use the new SortableMenuItem props**

Inside the existing `<DndContext>` for roots, replace the `roots.map((root) => …)` block with:

```tsx
                {roots.map((root) => {
                  const children = childrenOf(root.id)
                  const isExpanded = expanded.has(root.id)
                  return (
                    <SortableMenuItem
                      key={root.id}
                      item={root}
                      depth={0}
                      hasChildren={children.length > 0}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleExpand(root.id)}
                      onEdit={() => setEditing(root)}
                      onDelete={() => setConfirmDeleteId(root.id)}
                      onAddChild={() => addChild(root.id)}
                    >
                      {isExpanded && (
                        <NestedChildren
                          parentId={root.id}
                          items={children}
                          childrenOf={childrenOf}
                          onReorder={reorderChildren}
                          sensors={sensors}
                          onEdit={(it) => setEditing(it)}
                          onDelete={(id) => setConfirmDeleteId(id)}
                          onAddChild={(pid) => addChild(pid)}
                          depth={1}
                          expanded={expanded}
                          toggleExpand={toggleExpand}
                        />
                      )}
                    </SortableMenuItem>
                  )
                })}
```

- [ ] **Step 7: Add Expandir/Colapsar buttons in the header**

In the header `<div className="flex items-center gap-2">` block (next to "Descartar"), add **before** the "Descartar" button:

```tsx
          <Button
            variant="ghost"
            size="sm"
            onClick={expanded.size > 0 ? collapseAll : expandAll}
            className="text-xs"
          >
            {expanded.size > 0 ? "Colapsar todo" : "Expandir todo"}
          </Button>
```

- [ ] **Step 8: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 9: Manual smoke (3-level creation)**

Run: `npm run dev`. On `/admin/menus/<menu-id>`:
- Add a root item, save.
- Add a child to that root via the `+` button on hover, save.
- Add a grandchild via the `+` button on hover of the level-2 item, save.
- Refresh the page — the 3-level tree persists.
- Verify `+` button does NOT appear on level-3 items.
- Test collapse/expand: chevron toggles, "Colapsar todo" / "Expandir todo" header buttons work.

- [ ] **Step 10: Commit**

```bash
git add components/admin/menus/MenuTreeEditor.tsx
git commit -m "feat(menus): 3-level recursive editor with collapse/expand"
```

---

### Task 7: Add ancestor breadcrumb to MenuItemSheet

**Files:**
- Modify: `components/admin/menus/MenuTreeEditor.tsx` (pass ancestors to the sheet)
- Modify: `components/admin/menus/MenuItemSheet.tsx` (render breadcrumb + max-depth notice)

- [ ] **Step 1: Compute the ancestor chain in `MenuTreeEditor` and pass it down**

In `MenuTreeEditor`, just before the `editing && (...)` JSX block, add:

```tsx
  const ancestorsOf = (id: string): DraftItem[] => {
    const chain: DraftItem[] = []
    let current = items.find((i) => i.id === id)
    while (current && current.parentId) {
      const parent = items.find((i) => i.id === current!.parentId)
      if (!parent) break
      chain.unshift(parent)
      current = parent
    }
    return chain
  }

  const depthOf = (id: string): number => ancestorsOf(id).length
```

Update the `MenuItemSheet` invocation to pass `menuTitle`, `ancestors`, and `atMaxDepth`:

```tsx
      {editing && (
        <MenuItemSheet
          item={editing}
          menuTitle={menu.title}
          ancestors={ancestorsOf(editing.id).map((a) => a.label)}
          atMaxDepth={depthOf(editing.id) >= MAX_MENU_DEPTH - 1}
          pages={pages}
          categories={categories}
          onSave={updateItem}
          onClose={() => setEditing(null)}
        />
      )}
```

- [ ] **Step 2: Update `MenuItemSheet` props interface**

In `components/admin/menus/MenuItemSheet.tsx`, update the `Props` interface:

```ts
interface Props {
  item: DraftItem
  menuTitle: string
  ancestors: string[]
  atMaxDepth: boolean
  pages: PageOption[]
  categories: CategoryOption[]
  onSave: (next: DraftItem) => void
  onClose: () => void
}
```

And update the destructure:

```ts
export function MenuItemSheet({
  item,
  menuTitle,
  ancestors,
  atMaxDepth,
  pages,
  categories,
  onSave,
  onClose,
}: Props) {
```

- [ ] **Step 3: Render the breadcrumb in the sheet header**

Replace the existing `<SheetHeader>` block in `MenuItemSheet.tsx` with:

```tsx
        <SheetHeader className="border-b p-4">
          <SheetTitle>Editar item</SheetTitle>
          <SheetDescription>
            Cambiá la etiqueta y el destino del item del menú.
          </SheetDescription>
          <p className="text-[11px] text-muted-foreground mt-1 truncate">
            {[menuTitle, ...ancestors].join(" › ")}
            {ancestors.length > 0 ? " › " : " › "}
            <span className="font-medium text-foreground">{item.label}</span>
          </p>
          {atMaxDepth && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Nivel máximo alcanzado — este item no puede tener subitems.
            </p>
          )}
        </SheetHeader>
```

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Manual smoke**

In the editor, click the pencil icon on an item at each level. Verify:
- Level 1: breadcrumb shows `Menu Title › <item label>`.
- Level 2: shows `Menu Title › Parent › <item label>`.
- Level 3: shows `Menu Title › Grandparent › Parent › <item label>` AND the "Nivel máximo alcanzado" line.

- [ ] **Step 6: Commit**

```bash
git add components/admin/menus/MenuTreeEditor.tsx components/admin/menus/MenuItemSheet.tsx
git commit -m "feat(menus): ancestor breadcrumb + max-depth notice in item sheet"
```

---

## Phase 3 — Storefront desktop: cascade fly-out

### Task 8: Refactor HeaderNavMenu into a recursive NavItem with fly-out

**Files:**
- Modify: `components/shop/HeaderNavMenu.tsx` (full rewrite of `NavItem`)

- [ ] **Step 1: Replace the entire file with the cascade-aware version**

Overwrite `components/shop/HeaderNavMenu.tsx` with:

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { MenuLink } from "./MenuLink"
import { resolveMenuItemHref } from "@/lib/menus/resolve-link"
import { cn } from "@/lib/utils"
import type { ResolvedMenuItem } from "@/lib/menus/get-menu-by-slug"

interface Props {
  items: ResolvedMenuItem[]
}

export function HeaderNavMenu({ items }: Props) {
  // NOTE: do NOT use overflow-x-auto on this <nav>. Setting any non-visible
  // overflow-x value forces overflow-y to clip in most browsers (the
  // "overflow visible quirk"), which would hide the dropdown panels
  // emerging downward from parent items.
  return (
    <nav
      role="menubar"
      className="flex h-10 items-center space-x-6 text-sm flex-wrap"
    >
      {items.map((item) => (
        <NavItem key={item.id} item={item} depth={0} />
      ))}
    </nav>
  )
}

const CLOSE_DELAY_MS = 120

function NavItem({
  item,
  depth,
}: {
  item: ResolvedMenuItem
  depth: number
}) {
  const [open, setOpen] = useState(false)
  const [flip, setFlip] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const hasChildren = item.children.length > 0

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }
  useEffect(() => () => cancelClose(), [])

  // Auto-flip fly-out at depth >= 1 if it would overflow the viewport.
  useEffect(() => {
    if (!open || depth === 0 || !panelRef.current) {
      setFlip(false)
      return
    }
    const rect = panelRef.current.getBoundingClientRect()
    if (rect.right > window.innerWidth - 8) setFlip(true)
  }, [open, depth])

  // Close on outside click while open.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setOpen(false)
      ;(e.currentTarget.querySelector("button, a") as HTMLElement | null)?.focus()
    } else if (e.key === "ArrowRight" && hasChildren && !open) {
      e.preventDefault()
      setOpen(true)
    } else if (e.key === "ArrowLeft" && open && depth > 0) {
      e.preventDefault()
      setOpen(false)
    }
  }

  if (!hasChildren) {
    const href = resolveMenuItemHref(item)
    if (!href) return null
    if (depth === 0) {
      return (
        <MenuLink
          item={item}
          className="transition-colors hover:text-foreground/80 whitespace-nowrap"
        />
      )
    }
    return (
      <MenuLink
        item={item}
        className="block px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
      />
    )
  }

  // Parent with children — button + cascade panel.
  const isTop = depth === 0
  const Chevron = isTop ? ChevronDown : ChevronRight

  const panelPositionClass = isTop
    ? "absolute left-0 top-full pt-2"
    : flip
      ? "absolute right-full top-0 pr-2"
      : "absolute left-full top-0 pl-2"

  return (
    <div
      ref={wrapperRef}
      className={cn("relative", !isTop && "w-full")}
      onMouseEnter={() => {
        cancelClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose()
        setOpen(true)
      }}
      onBlur={(e) => {
        // Only close if focus left the entire wrapper (not just moved inside).
        if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) {
          scheduleClose()
        }
      }}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground/80 whitespace-nowrap",
          isTop
            ? ""
            : "w-full justify-between px-2 py-1.5 text-sm rounded hover:bg-muted",
          open && !isTop && "bg-muted",
          open && isTop && "text-foreground/90",
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        role="menuitem"
      >
        <span className="truncate">{item.label}</span>
        <Chevron className="h-3 w-3 opacity-60 shrink-0" />
      </button>

      <div
        ref={panelRef}
        role="menu"
        className={cn(
          panelPositionClass,
          "z-50 min-w-[220px]",
          "transition-[opacity,transform] duration-100",
          open
            ? "opacity-100 translate-y-0 translate-x-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none",
        )}
      >
        <div className="rounded-md border bg-popover shadow-md p-2 space-y-0.5">
          {item.children.map((child) => (
            <NavItem key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual smoke (desktop)**

Run: `npm run dev` and open the storefront in a desktop-width browser window. Using a 3-level menu created in Phase 2:
- Hover top-level item → dropdown opens below.
- Hover dropdown item with children → fly-out opens to the right.
- Move the mouse from the dropdown row to the fly-out without crossing outside — menus stay open.
- Quickly drag the mouse across the nav without stopping on any item — no flicker (intent delay).
- Resize the window so the fly-out would overflow → on next hover it flips to the left.
- Click outside the menu → all panels close.
- Press `Esc` while a panel is open → closes.
- Tab into the menu, use ↓ ↑ → ← to navigate.

- [ ] **Step 4: Commit**

```bash
git add components/shop/HeaderNavMenu.tsx
git commit -m "feat(storefront): cascade fly-out for 3-level header nav"
```

---

## Phase 4 — Mobile: recursive accordion

### Task 9: Refactor MobileMenu to recursive accordion with split tap targets

**Files:**
- Modify: `components/shop/MobileMenu.tsx` (full rewrite of `ParentSection` + add `MenuRow`)

- [ ] **Step 1: Replace the file with the recursive version**

Overwrite `components/shop/MobileMenu.tsx` with:

```tsx
"use client"

import { UserMenu } from "./UserMenu"
import Link from "next/link"
import { Menu, Home, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useState } from "react"
import { resolveMenuItemHref } from "@/lib/menus/resolve-link"
import { cn } from "@/lib/utils"
import type { ResolvedMenuItem } from "@/lib/menus/get-menu-by-slug"

interface MobileMenuProps {
  menuItems: ResolvedMenuItem[]
  isAdmin?: boolean
}

export default function MobileMenu({ menuItems, isAdmin: _isAdmin }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>

        <div className="mt-6 pb-4 border-b">
          <UserMenu />
        </div>

        <nav className="flex flex-col space-y-1 mt-4">
          <Link
            href="/"
            onClick={close}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Inicio</span>
          </Link>

          {menuItems.length === 0 ? (
            <Link
              href="/productos"
              onClick={close}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
            >
              <span>Todos los Productos</span>
            </Link>
          ) : (
            menuItems.map((root) => (
              <MobileNode
                key={root.id}
                item={root}
                depth={0}
                onLinkClick={close}
              />
            ))
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function MobileNode({
  item,
  depth,
  onLinkClick,
}: {
  item: ResolvedMenuItem
  depth: number
  onLinkClick: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = item.children.length > 0
  const href = resolveMenuItemHref(item)

  const indent = depth === 0 ? "" : "pl-4 border-l border-border/50"
  const rowClass = cn(
    "flex items-center rounded-md transition-colors",
    expanded ? "bg-muted/30" : "hover:bg-accent",
  )
  const labelClass = cn(
    "flex-1 px-3 py-2.5 text-sm",
    depth === 0 ? "font-medium" : "",
  )

  // Leaf: pure link.
  if (!hasChildren) {
    if (!href) return null
    const isExternal = item.linkType === "EXTERNAL_URL"
    const linkClass = cn(rowClass, "px-3 py-2.5", indent && `ml-3 ${indent}`)
    if (isExternal) {
      return (
        <a
          href={href}
          target={item.openInNewTab ? "_blank" : undefined}
          rel={item.openInNewTab ? "noopener noreferrer" : undefined}
          onClick={onLinkClick}
          className={linkClass}
        >
          <span className="text-sm">{item.label}</span>
        </a>
      )
    }
    return (
      <Link
        href={href}
        target={item.openInNewTab ? "_blank" : undefined}
        onClick={onLinkClick}
        className={linkClass}
      >
        <span className="text-sm">{item.label}</span>
      </Link>
    )
  }

  // Parent with children: split label (link if href) + caret (expand).
  return (
    <div className={cn("flex flex-col", indent && `ml-3 ${indent}`)}>
      <div className={rowClass}>
        {href ? (
          <Link
            href={href}
            onClick={onLinkClick}
            className={labelClass}
          >
            {item.label}
          </Link>
        ) : (
          <span className={cn(labelClass, "cursor-default")}>{item.label}</span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="h-11 w-11 flex items-center justify-center text-muted-foreground"
          aria-expanded={expanded}
          aria-label={expanded ? "Colapsar" : "Expandir"}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              expanded ? "rotate-180" : "rotate-0",
            )}
          />
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-[max-height] duration-200 ease-in-out",
          expanded ? "max-h-[1000px]" : "max-h-0",
        )}
      >
        <div className="space-y-1 py-1">
          {item.children.map((child) => (
            <MobileNode
              key={child.id}
              item={child}
              depth={depth + 1}
              onLinkClick={onLinkClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual smoke (mobile viewport)**

Run: `npm run dev`. In Chrome DevTools, switch to a mobile viewport (e.g. iPhone 14). Open the mobile menu and verify with a 3-level menu:
- Tap caret on a parent → expands.
- Tap label of a parent that has a link → navigates (closes drawer).
- Tap label of a parent without a link → does nothing (cursor-default style).
- Each nesting level is visibly indented with the left border.
- Tapping a leaf navigates and closes drawer.
- Animation smooth, no layout jump.

- [ ] **Step 4: Commit**

```bash
git add components/shop/MobileMenu.tsx
git commit -m "feat(storefront): 3-level recursive mobile menu"
```

---

## Phase 5 — QA

### Task 10: Full manual checklist + final build

**Files:** none modified.

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 2: Editor checklist** (`/admin/menus/<menu-id>`, real menu with 3 levels)

- Add 3 levels via UI, save, refresh, see them persisted.
- Try to add a 4th level — `+` button is hidden on level-3 items; the `MenuItemSheet` shows the "Nivel máximo alcanzado" notice for level-3 items.
- Reorder items at each of the 3 levels via drag.
- Collapse/expand toggles work; "Expandir todo" / "Colapsar todo" header buttons work.
- Delete a level-1 item with grandchildren — cascade works (children + grandchildren disappear after save).
- Breadcrumb in `MenuItemSheet` shows the full ancestor chain.

- [ ] **Step 3: Storefront desktop checklist**

- Hover top-level → dropdown opens below.
- Hover dropdown item with children → fly-out opens to the right.
- Mouse traveling from dropdown row to fly-out does not close the menu.
- Quick mouse pass-by does not flicker open/close (intent delay).
- Fly-out near right edge of viewport flips left.
- Keyboard: Tab/↓/↑/→/←/Esc all behave per spec (visual focus rings visible).
- Click outside closes panels.

- [ ] **Step 4: Mobile checklist** (Chrome DevTools mobile viewport)

- All 3 levels expandable via caret tap.
- Label tap on a parent with a link navigates; caret tap toggles expand.
- Indent visible at each level.
- Animation smooth, no layout shift.

- [ ] **Step 5: Server-validation checklist**

Open Chrome DevTools → Network → "Fetch/XHR" while on the menu editor. Save normally — observe the action call. Then craft a malicious payload:

a) **Depth > 3 attempt:** In the React DevTools or local store mutator, manually set an item to be a great-grandchild (parent chain of 4) and trigger save.
   Expected: toast `"El menú no puede tener más de 3 niveles"`.

b) **Cycle attempt:** Manually set `a.parentId = b` and `b.parentId = a` and save.
   Expected: toast `"Ciclo detectado en el árbol del menú"` (or `"No se pudo guardar el menú: referencia inválida en parentId"` depending on which check trips first — either is acceptable).

c) **Cross-menu parent attempt:** Set `parentId` to an item id from a different menu and save.
   Expected: toast `"parentId inválido: no pertenece a este menú"`.

If reproducing these is impractical from the UI, just confirm the validators are in place via grep:

Run: `grep -n "Ciclo detectado\|niveles\|no pertenece" actions/menus.ts`
Expected: 3 matches, one per validator.

- [ ] **Step 6: Commit any QA fixes (if needed)**

If any checklist item fails, fix and commit per the relevant phase's pattern.

If everything passes, no further commit needed for QA.

- [ ] **Step 7: Final summary**

Confirm via `git log --oneline` that the branch contains a clean sequence of feat/docs commits for this feature.

---

## Self-Review

(Performed by the plan author after writing.)

**1. Spec coverage:**
- ✅ Spec § 3 architecture — Tasks 1–9 cover every file in the table.
- ✅ Spec § 4 editor UX — Tasks 6, 7.
- ✅ Spec § 5 storefront desktop UX — Task 8.
- ✅ Spec § 6 mobile UX — Task 9.
- ✅ Spec § 7 server validation — Tasks 3, 4, 5.
- ✅ Spec § 8 edge cases — exercised in Task 10 checklist.
- ✅ Spec § 9 testing — Task 10.
- ✅ Spec § 10 phasing — phases match.

**2. Placeholder scan:** No "TBD"/"TODO"/"add appropriate"/"similar to" sentences. Each step shows concrete code or commands.

**3. Type consistency:**
- `ValidatedItem` type defined in Task 4, used in Task 5. Consistent.
- `MAX_MENU_DEPTH` exported from `lib/menus/constants.ts` in Task 1, imported in Tasks 3, 4, 6, 7. Consistent.
- `NestedChildren` props in Task 6: `parentId, items, childrenOf, onReorder, sensors, onEdit, onDelete, onAddChild, depth, expanded, toggleExpand`. Same props referenced in the recursive call inside the same task. Consistent.
- `SortableMenuItem` props in Task 6: `item, depth, hasChildren, isExpanded, onToggleExpand, onEdit, onDelete, onAddChild, children`. Used in both the root render (Task 6 step 6) and recursive call (Task 6 step 2). Consistent.
- `MenuItemSheet` new props `menuTitle, ancestors, atMaxDepth` introduced in Task 7 and consumed in `MenuTreeEditor` in the same task. Consistent.

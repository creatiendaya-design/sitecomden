# Design Spec: Visual Page Builder for Product Landings (Shopify-style)

**Date:** 2026-04-23
**Status:** Approved (pending user spec review)
**Scope:** New WYSIWYG editor for product landing pages in shopgood-pe, replacing the current form-based block editor. Foundation for future expansion to full site page builder (Phases 2-4).

---

## 1. Overview and Long-term Vision

### 1.1 Long-term roadmap (4 phases)

| Phase | Scope |
|---|---|
| **Phase 1 (v1, this project)** | Visual WYSIWYG editor for `/admin/productos/[id]` — 12 blocks, templates with sync, mobile/desktop toggle |
| **Phase 2 (future)** | General site pages (homepage, about, custom URLs via `/admin/paginas`) — reuses the generic `PageBuilder` and universal blocks |
| **Phase 3 (future)** | System pages (cart, checkout, 404) — editable slots without breaking transactional logic |
| **Phase 4 (future)** | Menu builder (navigation, footer, mobile drawer) — separate data model (`MenuItem`) |

### 1.2 v1 architectural choices that enable future phases (without building them)

1. **Block "scope" distinction** — each block declares whether it is `"universal"` (works anywhere) or `"product"` (needs product context). Phase 2 automatically reuses universal blocks.
2. **Generic `PageBuilder` component from day 1** — receives `blocks[]`, `onBlocksChange`, optional `context`, and `scope: "product" | "page"`. Phase 2 passes `scope="page"` without rewriting the editor.
3. **Block registry with metadata** — `lib/blocks/registry.ts` maps each block type to its renderer, form, icon, label, scope, and category. Adding new blocks is a repeatable recipe.
4. **NOT building in v1:** generic `Page` model. `LandingBlock` stays `productId`-scoped in DB. Phase 2 will introduce `Page` and `PageBlock` as a clean migration when needed.

### 1.3 What v1 delivers (vs. current state)

| Today | After v1 |
|---|---|
| Vertical list of collapsed forms per block | Central canvas with live preview |
| "Save section" button per block | Autosave on blur |
| No real mobile preview | Desktop/Mobile toggle with real viewport width |
| 7 predefined blocks tightly coupled to products | 12 blocks (11 universal + 1 product-specific) |
| 3-5 basic fields per block | Level 2 style controls on every block |
| Single value per field | Per-device overrides on images/configs/colors; text stays shared |
| No templates | Template library with sync (block-level overrides) |

### 1.4 Explicitly out of scope for v1

- Non-product pages (homepage, about, custom URLs) — Phase 2
- System pages (cart, checkout) — Phase 3
- Menu builder — Phase 4
- Per-device overrides on text content
- "Sections Everywhere" / field-level override granularity
- Level 3 styling (custom CSS, free typography)
- Undo/redo stack (v1 uses autosave + `beforeunload` warning)
- v1.5 blocks: Countdown, Stats, Comparison, CTA Section, Spacer

---

## 2. Data Model

### 2.1 Schema changes (all additive)

```prisma
// ───── Modified models ─────

model Product {
  // ... existing fields ...
  landingTemplateId String?
  landingTemplate   LandingTemplate? @relation(fields: [landingTemplateId], references: [id], onDelete: SetNull)
}

model LandingBlock {
  // ... existing fields ...
  sourceTemplateBlockId String?     // if block inherits from a template
  detached              Boolean @default(false)  // true if locally edited
  @@index([sourceTemplateBlockId])
}

enum LandingBlockType {
  HERO
  BENEFITS
  GALLERY
  TESTIMONIALS
  VIDEO
  COLORS
  TICKER
  // New in v1:
  RICH_TEXT
  FAQ
  IMAGE_TEXT
  RELATED_PRODUCTS
  TRUST_BADGES
}

// ───── New models ─────

model LandingTemplate {
  id             String   @id @default(cuid())
  name           String
  description    String?
  category       String?
  thumbnail      String?
  active         Boolean  @default(true)
  createdBy      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  templateBlocks TemplateBlock[]
  products       Product[]
  @@index([active, category])
}

model TemplateBlock {
  id         String           @id @default(cuid())
  templateId String
  template   LandingTemplate  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  type       LandingBlockType
  position   Int
  content    Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([templateId, position])
}
```

### 2.2 Standardized `content` JSON shape

Every block (both `LandingBlock.content` and `TemplateBlock.content`) uses a unified structure with three zones:

```typescript
type BlockContent = {
  // Content fields (text, rich text) — shared across mobile/desktop
  data: Record<string, any>

  // Visual configuration (Level 2) — may have per-device overrides
  style: {
    backgroundColor?: DeviceValue<string>
    textColor?:       DeviceValue<string>
    paddingY?:        DeviceValue<"none" | "sm" | "md" | "lg" | "xl">
    alignment?:       DeviceValue<"left" | "center" | "right">
    containerWidth?:  DeviceValue<"narrow" | "normal" | "full">
    cornerRadius?:    "none" | "sm" | "md" | "lg"  // no override
    border?:          "none" | "subtle" | "strong" // no override
    shadow?:          "none" | "subtle" | "strong" // no override
    visibility?:      "always" | "mobile-only" | "desktop-only"
  }

  // Media (images, videos) — always uses per-device override shape
  media: {
    image?:     { desktop?: string, mobile?: string }
    bgImage?:   { desktop?: string, mobile?: string }
    bgOverlay?: { desktop?: string, mobile?: string }
    // ... block-specific media fields
  }
}

type DeviceValue<T> = T | { desktop?: T, mobile?: T }
```

### 2.3 Device resolver

```typescript
// lib/blocks/resolve.ts
export function resolveForDevice<T>(
  value: DeviceValue<T> | undefined,
  device: "desktop" | "mobile"
): T | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value !== "object") return value as T
  if ("desktop" in value || "mobile" in value) {
    return device === "mobile" ? (value.mobile ?? value.desktop) : (value.desktop ?? value.mobile)
  }
  return value as T
}

export function resolveContentForDevice(content: BlockContent, device: "desktop" | "mobile") {
  // Recursively resolve all DeviceValue<T> fields in style and media zones
  return {
    data: content.data,
    style: mapValues(content.style, v => resolveForDevice(v, device)),
    media: mapValues(content.media, v => resolveForDevice(v, device)),
  }
}
```

### 2.4 Rendering resolution rule for a product

```
Input: product with landingTemplateId and its LandingBlock[]

If product.landingTemplateId == null:
  → Render LandingBlock[] of the product (legacy, ordered by position)

If product.landingTemplateId != null:
  Load template.templateBlocks (ordered by position)
  Load product.landingBlocks where sourceTemplateBlockId IS NOT NULL (detached overrides)
  Load product.landingBlocks where sourceTemplateBlockId IS NULL (pure local)

  Build merged array:
    1. For each TemplateBlock (in template.position order):
       - If a detached LandingBlock with sourceTemplateBlockId matches: use the override
       - Else: use the TemplateBlock directly
       - Assigned merge_position = TemplateBlock.position (float)
    2. For each pure local LandingBlock:
       - Use the block's own position value (float)

  Sort merged array by merge_position ascending.
  → Render merged list in order.
```

**Position scheme:** positions are floats. When inserting a pure local block between two blocks at positions 2 and 3, the backend assigns 2.5. When inserting between 2 and 2.5, it assigns 2.25. This allows arbitrary interleaving of local blocks with template blocks without requiring renumbering.

A background maintenance job can rebalance positions periodically (converting float sequences back to whole integers 0, 1, 2, …) to avoid float precision drift — this is orthogonal to rendering and optional.

### 2.5 Data migration of existing blocks

Script `scripts/migrate-landing-blocks-to-v2.ts`:

1. For each existing `LandingBlock`, detect if shape is legacy (flat fields) vs. v2 (has `data`/`style`/`media` keys). Idempotent.
2. For legacy shape: move text fields to `content.data`, apply Level 2 defaults to `content.style`, move images to `content.media` as `{ desktop: url, mobile: url }` (duplicated for both devices).
3. Run in batches of 100 with transactions. Dry-run by default (`--apply` flag to commit).
4. Logging per block type for verification.

Renderer (`LandingBlockRenderer.tsx`) remains backward-compatible during the migration window — detects legacy shape and reads it directly; detects v2 shape and uses `resolveContentForDevice`.

---

## 3. Editor Architecture (Panel Layout and Composition)

### 3.1 Three-panel layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOPBAR                                                                 │
│ ← Back   📄 Producto X   •   [🖥️ Desktop │ 📱 Mobile]   [Preview] [⋯] │
├──────────────┬─────────────────────────────────────┬────────────────────┤
│  LEFT        │              CANVAS                 │   RIGHT            │
│  SIDEBAR     │                                     │   SIDEBAR          │
│  (280px)     │    (responsive width by device)     │   (340px)          │
│              │                                     │                    │
│  Sections    │    [Live preview render]            │   Block properties │
│  list        │                                     │   (tabs: Content / │
│              │                                     │    Style / Advanced)│
│  [+ Add]     │    Click blocks to select them      │                    │
│              │                                     │                    │
│  Templates   │    [+ Add block here] slots         │   (Empty state     │
│  actions     │    between blocks on hover          │    when nothing    │
│              │                                     │    selected)       │
└──────────────┴─────────────────────────────────────┴────────────────────┘
```

### 3.2 Component tree

```
/components/admin/page-builder/
├── PageBuilder.tsx             # Root generic component
├── TopBar.tsx
├── DeviceToggle.tsx
│
├── LeftSidebar/
│   ├── LeftSidebar.tsx
│   ├── BlockList.tsx
│   ├── BlockListItem.tsx
│   ├── AddBlockPanel.tsx
│   └── TemplateActions.tsx
│
├── Canvas/
│   ├── Canvas.tsx
│   ├── CanvasFrame.tsx
│   ├── BlockRenderer.tsx
│   ├── BlockWrapper.tsx
│   ├── BlockFloatingToolbar.tsx
│   └── EmptySlot.tsx
│
└── RightSidebar/
    ├── RightSidebar.tsx
    ├── EmptyState.tsx
    ├── tabs/
    │   ├── ContentTab.tsx
    │   └── StyleTab.tsx
    └── controls/
        ├── ColorControl.tsx
        ├── PaddingControl.tsx
        ├── AlignmentControl.tsx
        ├── ContainerWidthControl.tsx
        ├── CornerRadiusControl.tsx
        ├── BorderControl.tsx
        ├── ShadowControl.tsx
        ├── VisibilityControl.tsx
        ├── ImageControl.tsx
        ├── TextControl.tsx
        ├── RichTextControl.tsx
        └── SelectControl.tsx
```

### 3.3 `PageBuilder` is generic

```typescript
interface PageBuilderProps {
  blocks: LandingBlockData[]
  onBlocksChange: (blocks: LandingBlockData[]) => void
  context?: BuilderContext
  scope: "product" | "page"
  actions?: {
    onApplyTemplate?: () => void
    onSaveAsTemplate?: () => void
    onUnlinkTemplate?: () => void
  }
}

type BuilderContext =
  | { type: "product", product: ProductData }
  | { type: "page", page: PageData }           // Phase 2
  | { type: "system-page", slot: string }      // Phase 3
```

Product-specific wrapper handles persistence:

```typescript
// components/admin/ProductLandingBuilder.tsx
// - Knows about the product
// - Invokes Server Actions (createLandingBlock, updateLandingBlock, ...)
// - Wraps <PageBuilder scope="product" context={...} />
```

### 3.4 Builder state — Zustand store

```typescript
// components/admin/page-builder/store.ts
interface BuilderStore {
  blocks: LandingBlockData[]
  selectedBlockId: string | null
  device: "desktop" | "mobile"
  isDirty: boolean
  isSaving: boolean

  selectBlock: (id: string | null) => void
  toggleDevice: () => void
  updateBlockContent: (id: string, content: BlockContent) => void
  reorderBlocks: (fromIndex: number, toIndex: number) => void
  addBlock: (type: LandingBlockType, position?: number) => void
  removeBlock: (id: string) => void
  duplicateBlock: (id: string) => void
}
```

Store is local to the builder (not app-global). Created on mount, destroyed on unmount. Persistence to DB is driven by store actions: debounced for text edits (600ms), immediate for reorder/add/delete.

### 3.5 Renderer reuse

The existing storefront components `HeroBlock`, `GalleryBlock`, etc. in `/components/shop/templates/blocks/` are reused as-is inside the canvas. `BlockRenderer` wraps them:

```typescript
function BlockRenderer({ block, device, context }) {
  const Renderer = BLOCK_REGISTRY[block.type].renderer
  const resolvedContent = resolveContentForDevice(block.content, device)
  return (
    <BlockWrapper blockId={block.id}>
      <Renderer content={resolvedContent} context={context} />
    </BlockWrapper>
  )
}
```

The renderers do not know they are in edit mode. Interaction (click, hover, outline) is handled in `BlockWrapper`, externally. Zero coupling.

### 3.6 Responsive canvas

- Desktop: `max-width: 1280px`, canvas frame simulates browser viewport
- Mobile: `width: 375px`, canvas frame simulates phone frame
- Smooth transition between modes (200ms)
- Internal scroll within the canvas (not page-level)

### 3.7 Admin editor responsive behavior

- ≥1280px: all 3 panels visible
- 1024-1280px: left sidebar collapsible, right always visible
- <1024px: tabs to switch between sidebars (builder is not primarily designed for mobile editing, but does not break)

---

## 4. Canvas Interaction Model

### 4.1 Block visual states

| State | Appearance |
|---|---|
| **Idle** | Clean render, no borders — same as storefront |
| **Hover** | Dashed blue outline (2px, 4px offset), `cursor: pointer`, floating toolbar visible |
| **Selected** | Solid blue outline (2px), right panel shows block properties |
| **Dragging** | 40% opacity, gray placeholder at drop target |

### 4.2 Floating toolbar

Appears on hover or selection:

```
┌─────────────────────────────────────────────────┐
│  ⋮⋮   ↑    ↓    📋    👁    🗑                  │
│  grip  move up/down  duplicate  visibility  delete │
└─────────────────────────────────────────────────┘
```

- **Grip handle (⋮⋮)** — cursor becomes `grab`/`grabbing`. Primary drag handle for reordering.
- **↑ / ↓** — move block one position (alternative to drag, useful on tablet)
- **📋 Duplicate** — clones block below original
- **👁 Visibility** — quick toggle Always / Mobile-only / Desktop-only
- **🗑 Delete** — inline confirmation (no modal)

**Toolbar behavior by block sync state:**

| Action | 🔗 Inherited | ✏️ Detached | 📦 Pure local |
|---|---|---|---|
| Grip/drag reorder | ❌ disabled | ✅ enabled | ✅ enabled |
| ↑ / ↓ | ❌ disabled | ✅ enabled | ✅ enabled |
| 📋 Duplicate | ✅ (creates pure local copy) | ✅ (creates pure local copy) | ✅ |
| 👁 Visibility | ⚠️ clicking triggers detach confirmation first | ✅ | ✅ |
| 🗑 Delete | ❌ disabled (must edit template) | ✅ (prompts "esto eliminará el override, ¿restaurar al template?") | ✅ |

Disabled controls are rendered grayed with a tooltip explaining why ("Para editar un bloque heredado, desvincúlalo primero o edita la plantilla").

### 4.3 Click behaviors

| Action | Effect |
|---|---|
| Click a block | Select (solid outline), right panel opens "Content" tab |
| Click canvas empty area | Deselect, right panel shows empty state |
| Click "+ Add block here" between blocks | Popover with categories, insert at exact position |
| Click sidebar "+ Add" button | Insert at end of list |
| Click block title in left sidebar | Select block and scroll canvas to center it |
| Double-click text inside block | Focus the matching input in right panel (shortcut) |

### 4.4 Drag & drop

Uses `@dnd-kit` (already in the project).

**Drag initiators (ordered by primary → secondary):**

1. **Grip handle (⋮⋮) of floating toolbar** — primary drag handle; works on hover AND on selected state; single source of truth for the drag gesture on the canvas
2. **Body of already-selected block** — secondary drag initiator; only active when block has solid-outline selected state; allows grabbing anywhere on the block once focused
3. **Body of unselected block** — NOT a drag initiator (click+drag on an unselected block body performs selection only, not drag). Prevents conflicts with selection intent.
4. **`BlockListItem` in left sidebar** — grip on each row; independent from canvas drag

**Visual feedback:**
- Dragged block at 40% opacity
- Blue line at candidate drop zones (between blocks)
- Drop zone closest to cursor highlighted stronger
- Auto-scroll when cursor is within 60px of canvas top/bottom edge

**Touch/tablet:** 300ms long-press on grip (or on selected block body) activates drag.

**Accessibility:** `aria-label="Arrastrar para reordenar"` on grip handle; `Ctrl+↑`/`Ctrl+↓` as keyboard alternative.

### 4.5 Adding a new block

Two entry points, same UI:

1. **Left sidebar "+ Add" button** — opens panel, inserts at end
2. **Empty slot between blocks in canvas** — opens popover anchored to position

Add panel structure:

```
┌──────────────────────────────────┐
│  🔍 Search block...              │
├──────────────────────────────────┤
│  📝 CONTENT                      │
│   Hero, Rich Text, FAQ,          │
│   Image + Text                   │
│                                  │
│  🖼 MEDIA                        │
│   Gallery, Video                 │
│                                  │
│  💬 SOCIAL PROOF                 │
│   Testimonials, Trust Badges     │
│                                  │
│  🎨 VISUAL                       │
│   Benefits, Colors, Ticker       │
│                                  │
│  🛒 COMMERCE                     │
│   Related Products               │
└──────────────────────────────────┘
```

New block is inserted, automatically selected, right panel opens Content tab.

### 4.6 Inline editing strategy (MVP-light)

v1 does NOT implement true contentEditable inline editing on the canvas. Shopify does not either. Instead:

- Click a block → right panel opens
- Edit happens in right-panel inputs; canvas updates in real-time
- Exception: double-click on text in canvas → focuses matching input in right panel (UX shortcut)

### 4.7 URL-persistent selection

Selected block reflects in URL hash: `/admin/productos/[id]#block=<blockId>`

Benefits: shareable links, refresh doesn't lose selection, back/forward respects history.

### 4.8 Unsaved changes warning

`beforeunload` native warning + visual "Guardando..." indicator in topbar during pending saves.

### 4.9 Topbar states

```
[Guardando...]                  (spinner during in-flight save)
[Guardado ✓]                    (green, 2s after success, auto-hides)
[Error al guardar — reintentar] (red, with retry button)
```

### 4.10 Keyboard shortcuts

| Key | Action |
|---|---|
| `Esc` | Deselect current block |
| `Del` / `Backspace` | Delete selected block (with confirmation) |
| `Ctrl+D` | Duplicate selected block |
| `↑` / `↓` | Navigate between blocks |
| `Ctrl+↑` / `Ctrl+↓` | Move selected block up/down |
| `Ctrl+S` | Force immediate save (redundant with autosave) |

Shortcuts active only when focus is not in an input field.

---

## 5. Right Panel: Style Controls and Device Overrides

### 5.1 Right panel structure

```
┌──────────────────────────────────────┐
│  [Hero Block]                    ✕   │  header with block name + close
├──────────────────────────────────────┤
│  [Content] [Style] [Advanced]        │  tabs (sticky)
├──────────────────────────────────────┤
│                                      │
│  (Tab content)                       │
│                                      │
└──────────────────────────────────────┘
```

### 5.2 Content tab (block-specific)

Forms are specific to each block type, defined in `lib/blocks/types/<blockType>.ts` via the registry.

### 5.3 Style tab (universal Level 2 controls)

```
COLORS
  Background    [🖥️ #FFFFFF]  [+ Override 📱]
                [📱 #F9FAFB]
  Text color    [#1F2937]     (shared)

SPACING
  Padding Y     🖥️ [S ▪M L XL]
                📱 [S M ▪L XL]

LAYOUT
  Alignment     🖥️ [◂ ▪ ▴ ▸]
                📱 [▪ ◂ ▴ ▸]
  Container     🖥️ [Narrow ▪Normal Full]
                📱 [Full]

BORDERS
  Radius        [None Sm ▪Md Lg]
  Border        [None ▪Subtle Strong]
  Shadow        [None Subtle ▪Strong]

VISIBILITY
  Show on  (● Always   ○ Mobile-only   ○ Desktop-only)
```

### 5.4 Device override UX pattern

Per-field opt-in. Default is one shared value; admin clicks "+ Override mobile" to split into two rows:

```
Shared (default):
  Background   [#FFFFFF]          [+ Override 📱]

With override:
  Background
    🖥️ Desktop  [#FFFFFF]
    📱 Mobile   [#F9FAFB]         [✕ Remove]
```

Canvas device toggle in topbar highlights the active row in right panel with a subtle border. Editing mobile value while canvas is on desktop shows a hint: *"Estás editando el valor mobile. [Cambiar canvas a 📱]"*

### 5.5 Control catalog

| Control | Use | Override available |
|---|---|---|
| `ColorControl` | background, text, overlay | Yes |
| `PaddingControl` | padding Y pills (S/M/L/XL) | Yes |
| `AlignmentControl` | left/center/right | Yes |
| `ContainerWidthControl` | narrow/normal/full | Yes |
| `CornerRadiusControl` | none/S/M/L | No |
| `BorderControl` | none/subtle/strong | No |
| `ShadowControl` | none/subtle/strong | No |
| `VisibilityControl` | always/mobile-only/desktop-only | N/A (device-specific by nature) |
| `ImageControl` | image upload | Always tabs Desktop/Mobile (not opt-in) |
| `RichTextControl` | formatted text | No (text is shared, system rule) |
| `TextControl` | plain text input | No (shared) |
| `SelectControl` | generic dropdown | No |

### 5.6 Advanced tab

```
Block ID (read-only): CLB-abc123
Anchor ID: [caracteristicas]   — enables #caracteristicas deep-link
Custom CSS class (super-admin only): [              ]
Internal notes: [                                  ]
```

### 5.7 Empty state

Shown when no block is selected: guidance text with keyboard shortcuts and instructions.

### 5.8 Panel behavior

- Header and tabs are sticky-top
- Content scrolls internally
- Fixed width: 340px on desktop
- On viewports <1280px: collapsible, but not resizable (controls with tabs don't fit in narrower width)

### 5.9 Autosave per control

- Text inputs: 600ms debounce
- Toggles/selects/pills: immediate save
- Image upload: save on upload completion to Vercel Blob
- Status shown in topbar ("Guardando..." → "Guardado ✓")

---

## 6. Templates with Sync

### 6.1 Sync model — block-level overrides

**Rules:**
- A product MAY have `landingTemplateId` pointing to one template
- All template blocks render by default in linked products
- Editing ANY field of a block detaches that block entirely (field-level overrides not supported in v1)
- Detached blocks persist as `LandingBlock` rows with `sourceTemplateBlockId` set and `detached: true`
- Unchanged template blocks render directly from `TemplateBlock` data (no row in `LandingBlock` for that product)

### 6.1.1 Save model differs by editor context

Two editors, two different save models — this is intentional:

| Context | Save model | Reason |
|---|---|---|
| **Product landing editor** | Autosave on blur/change (as in Section 4.9) | Changes affect only that product; fast iteration is desirable |
| **Template editor** | **Explicit save only** — no autosave | Changes propagate to N linked products. Must be deliberate and atomic. |

In the template editor:
- All edits are held in the Zustand store as a draft
- A "Guardar y propagar" button in the topbar persists the changes transactionally
- Navigating away with unsaved changes triggers `beforeunload` prompt
- The draft is NOT persisted to the DB until the user confirms save
- If the user closes the tab, changes are lost (no draft-in-DB for templates in v1)

### 6.2 Template library — new admin routes

```
app/admin/landing-plantillas/
├── page.tsx                    # grid of templates
├── nueva/
│   └── page.tsx                # new template (builder + metadata modal first)
└── [templateId]/
    ├── page.tsx                # edit template content in builder
    └── editar/
        └── page.tsx            # edit metadata (name, category, description)
```

New sidebar entry: "Plantillas de Landing" under a new admin section, behind `landing_templates:view` permission.

### 6.3 Template library UI

Grid of template cards with:
- 16:9 thumbnail (auto-generated or manually uploaded)
- Name
- Block count
- "Used in N products" counter (informational)
- `⋯` menu: View/Edit, Edit metadata, Duplicate, Activate/Deactivate, Delete

Filter bar: Active/Inactive/All, Category dropdown, Search input.

### 6.4 Thumbnail generation

- On explicit template save (via "Guardar y propagar" — see 6.1.1), a Server Action renders template blocks in hidden route `/admin/_render-template/[id]` at 1200px wide, captures PNG via `@vercel/og` or Puppeteer serverless, uploads to Vercel Blob.
- Generation runs **asynchronously after the save transaction commits** — it does not block the user or the propagation. The template save returns immediately; thumbnail URL is populated via a deferred write.
- On generation failure (timeout, capture error): placeholder image with category icon is kept.
- Manual upload option is always available as secondary override in the metadata editor (`/admin/landing-plantillas/[id]/editar`).
- Only regenerated on the explicit save action — not on every draft change.

### 6.5 Create template — two flows

**Flow A: Create blank from library**

1. Click "+ Nueva plantilla"
2. Modal asks for name, description, category
3. Redirect to `/admin/landing-plantillas/[id]` — empty `PageBuilder` with `scope="page"`
4. Product-specific blocks (`RELATED_PRODUCTS`) are NOT available in this context

**Flow B: Save product landing as template**

Inside product builder, `⋯` menu → "Guardar como plantilla..." opens modal:

```
Save as template
─────────────────
⚠ This creates a copy of the current landing in the library.
  The product will NOT be linked to the new template unless
  you explicitly apply it afterward.

Name: [ ... ]
Description: [ ... ]
Category: [Electrónica ▼]

Blocks to save: 6

[Cancel]  [Save template]
```

Server Action `saveAsTemplate(productId, metadata)`: reads product's blocks, creates `LandingTemplate` + `TemplateBlock[]`, copying `content` as-is. Does not modify the product.

### 6.6 Apply template to a product

`⋯` menu → "Aplicar plantilla..." opens modal with template gallery + linkage confirmation:

```
⚠ El producto se VINCULARÁ a esta plantilla.
  Los cambios futuros a la plantilla afectarán automáticamente
  a este producto (excepto en bloques editados localmente).

[Cancel]  [Vincular con plantilla]
```

If product has pre-existing local blocks, an extra modal appears:

```
Este producto tiene 3 bloques locales. ¿Qué hacer?

● Descartarlos (solo los de la plantilla quedan)
○ Mantenerlos (se intercalarán con los de la plantilla)
```

Server Action `applyTemplate(productId, templateId, mode)` runs in a transaction.

### 6.7 Visual state of blocks in product builder

```
🔗 HERO "Auriculares Premium"         (inherited — soft blue background)
   (from: Template Auriculares)
   [Editar localmente]

✏️ HERO "Sony WH-1000 — Líder..."    (detached — soft yellow background)
   (local, no longer follows template)
   [↺ Restaurar al template]

📦 BENEFITS                            (pure local — no badge)
```

### 6.8 Editing an inherited block

1. Click inherited block → right panel shows fields read-only with banner:
   > "Este bloque viene de la plantilla **Template Auriculares**.
   > `[Editar localmente]`  `[Editar plantilla]`"

   The "Editar plantilla" button is rendered only if the current user has `landing_templates:update` permission. Otherwise only "Editar localmente" is shown.

2. If "Editar localmente":
   - Create `LandingBlock` with `sourceTemplateBlockId` + `detached: true`, copying content from template
   - Block transitions to ✏️ local state, fields become editable
   - Autosave resumes on subsequent edits (product-context rule from Section 4.9)

3. If "Editar plantilla":
   - Redirect to `/admin/landing-plantillas/[templateId]` with the target block pre-selected (`#block=<templateBlockId>`)
   - Template editor uses explicit save model (Section 6.1.1)
   - A banner at the top of the template editor reminds: "Estás editando una plantilla vinculada a N productos. Los cambios no se aplicarán hasta que hagas 'Guardar y propagar'."

### 6.9 Editing a linked template with propagation warning

As noted in 6.1.1, the template editor does NOT autosave — all changes are held in the client store as a draft. The topbar shows a persistent "Guardar y propagar" button (primary color) plus a "Descartar cambios" link (secondary).

Clicking "Guardar y propagar" opens a confirmation modal:

```
Guardar cambios
───────────────
Esta plantilla está vinculada a 34 productos.
Los cambios se aplicarán automáticamente a todos los bloques
que no hayan sido editados localmente en esos productos.

Resumen de cambios:
 • Bloque "Hero" modificado
 • Bloque "Trust Badges" modificado
 • Bloque "FAQ" nuevo
 • Bloque "Ticker" eliminado

[Cancel]  [Guardar y propagar]
```

The "Resumen de cambios" is generated by diffing the draft against the last-persisted `TemplateBlock[]` on open. On confirm, a transactional Server Action:

1. Upserts/deletes `TemplateBlock` rows to match the draft
2. Triggers thumbnail regeneration (async, non-blocking)
3. Returns success; client shows toast "Plantilla actualizada. Cambios propagados a 34 productos."

The detached overrides in linked products are NOT touched. Their renderer continues to show the local content; only non-detached inherited blocks reflect the new template state.

If the draft is empty (no changes detected), the button is disabled.

### 6.10 Unlink and restore actions

**Restore single block:** button in detached block header removes the `LandingBlock` override row. Block reverts to inheriting from template.

**Unlink entire template from a product:** `⋯` menu → "Desvincular plantilla" creates `LandingBlock` rows for every inherited `TemplateBlock`, sets `landingTemplateId = null`. Product becomes independent.

**Template deletion:** `ON DELETE SET NULL` on `Product.landingTemplateId`. All detached blocks stay as locals. Non-detached inherited blocks are lost (expected: the template they came from no longer exists).

**Template block deletion:** orphan `LandingBlock` rows with that `sourceTemplateBlockId` become pure local (set `sourceTemplateBlockId = null`, keep content).

### 6.11 Pre-seeded example templates

Script `scripts/seed-landing-templates.ts` (optional, opt-in only):

1. **Electrónica genérica** — Hero + Benefits + Gallery + Trust Badges + FAQ + Related Products
2. **Moda y ropa** — Hero + Gallery + Image+Text + Testimonials + Trust Badges + Related Products
3. **Producto simple** — Hero + Rich Text + Gallery + Trust Badges

---

## 7. Specification of 5 New Blocks

All blocks follow the `content = { data, style, media }` shape. Only `data` and `media` are specified below; `style` is the standard Level 2 set from Section 5.

### 7.1 `RICH_TEXT`

**Purpose:** free-form text with formatting (bold, italic, lists, links, headings) for long descriptions and marketing copy.

```typescript
content.data = {
  html: string,          // sanitized HTML from TipTap editor
  maxWidth?: "prose"     // ~65ch reading width default
}
// content.media: {} (none)
```

**Renderer:** `RichTextBlock.tsx` renders HTML in `<div class="prose prose-sm sm:prose-base">`. Sanitized server-side with `DOMPurify`. Supports headings h2-h4, bold/italic/underline, ul/ol, links, blockquotes. No embedded images or videos (use `IMAGE_TEXT` or `GALLERY` for those).

**Editor:** reuses existing `RichTextEditor` (TipTap) from the project. Toolbar: B I U | H2 H3 | • 1. | 🔗 | undo/redo.

**Responsive:** handled by Tailwind prose scale. No data overrides.

### 7.2 `FAQ`

**Purpose:** collapsible Q&A accordion. Reduces support tickets. Emits structured data for SEO.

```typescript
content.data = {
  title?: string,                   // e.g., "Preguntas frecuentes"
  items: Array<{
    id: string,                     // uuid
    question: string,
    answer: string                  // rich HTML, same sanitizer
  }>,
  allowMultipleOpen?: boolean,      // default: false
  defaultOpenFirst?: boolean        // default: false
}
// content.media: {} (none)
```

**Renderer:** `FaqBlock.tsx` uses shadcn `Accordion`. Emits JSON-LD `schema.org/FAQPage`:

```html
<script type="application/ld+json">
  { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [...] }
</script>
```

**Editor:** title input, drag-sortable list of items (each with question input + mini RichTextEditor for answer, delete button), "+ Agregar pregunta", toggles for `allowMultipleOpen` and `defaultOpenFirst`.

### 7.3 `IMAGE_TEXT`

**Purpose:** image + text side-by-side layout for showcasing features.

```typescript
content.data = {
  title?: string,
  description: string,              // short rich HTML
  imagePosition: "left" | "right",  // default: "left"
  imageAlt: string,                 // required for a11y
  ctaText?: string,
  ctaUrl?: string,
  ratioImageToText?: "40-60" | "50-50" | "60-40"  // default: "50-50"
}
content.media = {
  image: { desktop?: string, mobile?: string }
}
```

**Renderer:** `ImageTextBlock.tsx`. Grid 2-col on desktop (respects `imagePosition`, `ratioImageToText`). Stacked vertical on mobile (image always on top). CTA rendered as button if `ctaText` present.

**Editor:** title input, mini RichTextEditor for description, radio buttons for position and ratio, image upload with tabs Desktop/Mobile, required alt text, optional CTA text/URL.

### 7.4 `RELATED_PRODUCTS` *(product-specific)*

**Purpose:** cross-sell / up-sell. Unique block with `scope: "product"` in v1.

```typescript
content.data = {
  title?: string,                           // default: "También te puede gustar"
  mode: "manual" | "auto",
  manualProductIds?: string[],              // if mode="manual"
  autoFilters?: {                           // if mode="auto"
    source: "same-category" | "same-tags" | "best-sellers" | "recently-added",
    limit: number,                          // 1-12, default 4
    excludeCurrentProduct: boolean          // default: true
  },
  displayType: "carousel" | "grid",         // default: "carousel"
  columnsDesktop: 3 | 4 | 5,                // default: 4
  columnsMobile: 1 | 2,                     // default: 2
  showPrice: boolean,                       // default: true
  showRating: boolean,                      // default: false
  showAddToCart: boolean                    // default: false
}
// content.media: {} (inherited from products)
```

**Renderer:** `RelatedProductsBlock.tsx` receives `context: { type: "product", product }`. Manual mode fetches by IDs. Auto modes:

- `same-category`: products sharing at least one category via the `ProductCategory` join table, ordered by `createdAt desc`
- `same-tags`: v1 implementation reuses `ProductCategory`. Since the current schema has no dedicated `Product.tags` field, this mode is a stricter variant of `same-category`: requires sharing ALL categories (not just at least one). If tags are added as a dedicated field in a future release, this mode switches to use them.
- `best-sellers`: aggregate `OrderItem.quantity` desc over last 90 days
- `recently-added`: `createdAt desc`

Reuses existing `ProductCard` component from storefront. Carousel uses embla-carousel if present, else native swipe. Performance: `include` to avoid N+1, `revalidate: 300` (5 min).

**Editor:** tabs Manual/Automático. Manual: searchable multi-select of products. Automático: source select, limit slider (1-12), `excludeCurrentProduct` checkbox. Display radio (carousel/grid), columns selects, toggles for price/rating/addToCart.

**Template context:** `RELATED_PRODUCTS` does NOT appear in "Add block" menu when editing templates (scope filter). If a template already contains this block (legacy migration), it renders with placeholders in preview.

### 7.5 `TRUST_BADGES`

**Purpose:** icons with short trust signals ("Pago seguro", "Envío gratis", "Devolución 30 días").

```typescript
content.data = {
  badges: Array<{
    id: string,
    icon: string,           // Lucide icon name: "Shield" | "Truck" | ...
    title: string,          // short, ~20 chars
    subtitle?: string
  }>,
  layout: "horizontal" | "vertical",  // default: horizontal
  columns: 2 | 3 | 4 | 5,             // default: 4 (horizontal only)
  iconSize: "sm" | "md" | "lg",       // default: md
  iconStyle: "outline" | "solid"      // default: outline
}
// content.media: {} (icons are from Lucide, not assets)
```

**Renderer:** `TrustBadgesBlock.tsx`. Horizontal: CSS grid with `columns` on desktop, collapses to 2 on mobile. Vertical: icon left, text right. Uses `lucide-react` dynamic resolution; fallback `HelpCircle` if name not found.

**Editor:** drag-sortable list of badges with icon select/search (preview in live), title input, optional subtitle. Layout radio, columns select (enabled only for horizontal), icon size select, icon style select.

**Suggested curated icons:** `Shield`, `ShieldCheck`, `Lock`, `Truck`, `Package`, `RefreshCw`, `Award`, `Star`, `Heart`, `Gift`, `Clock`, `BadgeCheck`, `CreditCard`, `Headphones`, `Phone`, `Globe`.

### 7.6 Block summary table

| Block | Scope | Category | Complexity | Mobile-distinct data | Est. effort |
|---|---|---|---|---|---|
| `RICH_TEXT` | universal | content | Low | No | 1 day |
| `FAQ` | universal | content | Medium | No | 2 days |
| `IMAGE_TEXT` | universal | content | Medium | Image | 2 days |
| `RELATED_PRODUCTS` | product | commerce | High | No | 4-5 days |
| `TRUST_BADGES` | universal | social proof | Low-Medium | No | 2 days |

**Subtotal:** ~2 weeks for the 5 new blocks.

---

## 8. Roadmap, Risks, and Deliverables

### 8.1 Implementation phases

```
Phase 0 — Prep (2-3 days)
├─ Prisma schema migration (additive)
├─ Data migration script (v1 → v2 content shape), idempotent, dry-run default
├─ Backward-compatible reader in existing renderers
└─ Feature flag: LANDING_BUILDER_V2 (Setting key)

Phase 1 — Generic editor (2 weeks)
├─ PageBuilder + panels (left sidebar, canvas, right panel)
├─ Desktop/Mobile toggle on canvas
├─ Click-select, hover, floating toolbar, drag & drop
├─ Autosave mechanics
├─ New block registry (lib/blocks/registry.ts)
└─ 7 existing blocks ported to new editor

Phase 2 — Level 2 styling (1-1.5 weeks)
├─ Complete Style tab with all controls
├─ Per-device override system (opt-in device tabs)
├─ resolveContentForDevice resolver
└─ Renderers updated to consume new shape

Phase 3 — 5 new blocks (2 weeks)
├─ RICH_TEXT, FAQ, IMAGE_TEXT, TRUST_BADGES (parallelizable)
└─ RELATED_PRODUCTS (more complex due to product queries)

Phase 4 — Templates with sync (3 weeks)
├─ CRUD in /admin/landing-plantillas
├─ Override model (sourceTemplateBlockId, detached, landingTemplateId)
├─ UI for inherited vs. local blocks
├─ "Edit template with propagation warning" flow
├─ "Unlink template" and "Restore to template" actions
├─ Thumbnail generation (with manual fallback)
└─ Seed script for example templates

Phase 5 — Cleanup (3-4 days)
├─ Remove old form-based editor
├─ Remove backward-compatible reader path
├─ Remove feature flag
├─ Admin user guide
└─ Final QA regression
```

**Total estimate: ~9-10 weeks (single developer).**

### 8.2 Feature flag and rollout

`LANDING_BUILDER_V2` lives in `Setting` table (via existing `lib/site-settings.ts`).

- **Flag OFF (default):** old form-based editor. Production unaffected.
- **Flag ON:** new visual builder active.

Storefront never uses the flag — `LandingBlockRenderer` is backward-compatible with both content shapes during Phase 0-4.

### 8.3 Data migration

Script `scripts/migrate-landing-blocks-to-v2.ts`:

1. For each `LandingBlock`, detect shape (legacy vs. v2)
2. Transform legacy flat shape to `{ data, style, media }` with Level 2 defaults
3. Duplicate images as `{ desktop: url, mobile: url }`
4. Idempotent (skip if already v2)
5. Transactional batches of 100
6. Dry-run by default; `--apply` flag to commit
7. Logging per block type

Runs once before flag activation in staging, then in production.

### 8.4 Permissions (new)

Add to `scripts/setup-permissions.ts`:

| Permission slug | Description |
|---|---|
| `landing_templates:view` | View template library |
| `landing_templates:create` | Create/duplicate templates |
| `landing_templates:update` | Edit template content and metadata |
| `landing_templates:delete` | Delete templates |
| `landing_templates:apply` | Apply template to products |

Default role mappings:

- Staff (level 1): `view` + `apply`
- Editor (level 3): + `create` + `update`
- Manager (level 5): + `delete`
- Admin (level 10+): all

### 8.5 Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Data migration corrupts existing blocks | Medium | High | Dry-run mandatory; DB backup required before `--apply`; idempotent script |
| Right-panel overrides confuse non-technical admins | High | Medium | Opt-in per field; tooltips explaining overrides; admin guide with video |
| Auto thumbnail generation is slow or fails | Medium | Low | Manual upload fallback; deferred generation (non-blocking save) |
| Template sync propagates unintended changes | Medium | High | Pre-save warning always shown ("affects N products"); explicit confirmation required |
| Performance with 20+ blocks in builder | Low | Medium | Virtualize left sidebar at 30+ items; aggressive `useMemo` in renderer |
| N+1 queries in `RELATED_PRODUCTS` auto mode | Medium | Medium | Prisma `include`; `revalidate: 300` cache |
| TypeScript type conflicts extending `content` JSON | Low | Low | Strong typing with Zod + discriminated union per block type |
| Admin detaches a block by accident, regrets it | Medium | Low | "Restore to template" always visible in detached blocks |
| Template deletion leaves products inconsistent | Low | Medium | `ON DELETE SET NULL` on `Product.landingTemplateId`; detached blocks become local automatically |

### 8.6 QA plan (manual, per phase)

**Phase 0 — data migration smoke test:**
- Dry-run in staging, verify N blocks migrate correctly
- Verify storefront renders existing products unchanged after migration

**Phase 1 — generic editor:**
- CRUD of each existing block type in new editor
- Drag & drop with 2, 5, 20 blocks
- Autosave fires correctly
- Deselect via Esc, click-outside, nav-back
- Works in Chrome, Firefox, Safari on desktop and tablet

**Phase 2 — styling:**
- Every style control applies correctly to rendered output
- Device overrides persist and are respected when toggling canvas device
- Block with `visibility: mobile-only` hidden on desktop (canvas + storefront)

**Phase 3 — new blocks:**
- Each of 5 blocks: create, edit, reorder, delete
- `RICH_TEXT`: formatting persists; sanitizer strips scripts
- `FAQ`: accordion works; JSON-LD emitted
- `IMAGE_TEXT`: position swap; ratio correctness; distinct mobile image
- `RELATED_PRODUCTS`: manual + 4 auto modes; performance <500ms
- `TRUST_BADGES`: all icons render; grid responsive

**Phase 4 — templates with sync:**
- Create template → appears in library with thumbnail
- Apply template to product → blocks marked 🔗
- Edit inherited block → correctly detaches, becomes ✏️ local
- Restore block → reverts to 🔗 inherited, detached row removed
- Edit linked template → propagation warning shown
- Save template changes → propagate to inherited blocks, leave overrides alone
- Unlink template → all blocks become local, `landingTemplateId = null`
- Delete template → linked products gain local blocks, renderer unaffected

**Phase 5 — final regression:**
- Create 3 products with old builder, migrate them, verify visual identity
- Admin tutorial: build a landing from scratch in <5 minutes (benchmark)

### 8.7 Deliverables

**New code:**

- `components/admin/page-builder/` — ~15 components
- `lib/blocks/registry.ts` + `lib/blocks/types/*.ts` — block registry and per-type Zod schemas
- `lib/blocks/resolve.ts` — `resolveContentForDevice` helper
- `components/shop/templates/blocks/` — 5 new renderers: `RichTextBlock`, `FaqBlock`, `ImageTextBlock`, `RelatedProductsBlock`, `TrustBadgesBlock`
- `app/admin/landing-plantillas/` — 3 pages (list, new, edit)
- `actions/landing-templates.ts` — Server Actions CRUD
- `actions/landing-blocks.ts` — extensions: `detachBlock`, `restoreBlock`, `unlinkTemplate`
- `scripts/migrate-landing-blocks-to-v2.ts`
- `scripts/seed-landing-templates.ts`

**Modified code:**

- `prisma/schema.prisma` — new models and fields
- `app/admin/productos/[productId]/page.tsx` — switch between old/new editor by feature flag
- `components/admin/EditProductForm.tsx` — remove inline `LandingBlockList` when flag ON; link to builder
- `components/shop/templates/ProductLandingView.tsx` — use new resolver
- `scripts/setup-permissions.ts` — add 5 new permissions

**Documentation:**

- `docs/superpowers/specs/2026-04-23-page-builder-visual-design.md` (this document)
- `docs/guides/page-builder-admin-guide.md` — admin-facing practical guide

### 8.8 v1 scope summary

| Area | Delivered |
|---|---|
| Editor | WYSIWYG, 3 panels, desktop/mobile toggle, autosave, drag & drop |
| Blocks | 12 total: 7 existing migrated + 5 new |
| Styling | Level 2 with opt-in per-device overrides |
| Templates | Library with sync (block-level override model) |
| Schema | Additive, backward-compatible, idempotent migration |
| Scope | Product landings only — foundation ready for Phase 2 (pages) |
| Duration | ~9-10 weeks |
| New permissions | 5 slugs |

---

**End of spec.**

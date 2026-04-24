# Page Builder v1 — Plan 2: Level 2 Styling + 5 New Blocks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Level 2 styling system (all controls with opt-in per-device overrides) on top of the 7 existing block renderers, then add the 5 new v1 block types (RICH_TEXT, FAQ, IMAGE_TEXT, RELATED_PRODUCTS, TRUST_BADGES) so the editor is feature-complete for product landings.

**Architecture:** Extend the v2 content shape `{ data, style, media }` by wiring the store's mutations through a new Style tab (with opt-in per-field device override toggles). All block renderers consume a shared `applyBlockStyle()` helper that converts the resolved style values to Tailwind classes and inline CSS, so the styling pipeline is consistent across the 12 blocks. The existing block renderers also migrate to Tailwind v4 container queries (matching BenefitsBlock from Plan 1) so canvas-mobile preview matches the real storefront.

**Tech Stack:** Next.js 15 App Router, Prisma, Zustand, Tailwind v4 (with `@container`), shadcn/ui, lucide-react, @dnd-kit, TipTap (existing RichTextEditor).

**Source spec:** [docs/superpowers/specs/2026-04-23-page-builder-visual-design.md](../specs/2026-04-23-page-builder-visual-design.md)
**Preceded by:** [Plan 1 — Foundation + Generic Editor](./2026-04-23-page-builder-plan-1-foundation-editor.md) (merged to master as commit `0e55d52`)

**Scope explicitly NOT covered by this plan:** Templates with sync (Plan 3), Playwright E2E suite + cleanup (Plan 4). Feature flag `LANDING_BUILDER_V2` stays gating the editor until all four plans land and Phase 5 QA passes.

**Pre-flight:**

```bash
# Ensure on master, Plan 1 merged
git checkout master
git pull --ff-only        # if remote is in use
git status                # should be clean

# Create the Plan 2 feature branch
git checkout -b feature/page-builder-v2-plan-2

# Flag should remain ON in dev (from Plan 1 smoke test) so you can exercise changes
npx tsx scripts/toggle-page-builder-v2.ts    # prints current state
```

---

## File Structure

**New files (Phase 2 — Styling):**
```
lib/blocks/
└── apply-style.ts                       # Helper converting resolved BlockContentV2 to { className, style }

components/admin/page-builder/RightSidebar/
├── controls/
│   ├── DeviceOverrideWrapper.tsx        # Opt-in toggle that splits a control into 🖥️/📱 rows
│   ├── ColorControl.tsx                 # Color picker with hex input
│   ├── PaddingControl.tsx               # Pill group: none/sm/md/lg/xl
│   ├── AlignmentControl.tsx             # Pill group: left/center/right
│   ├── ContainerWidthControl.tsx        # Pill group: narrow/normal/full
│   ├── CornerRadiusControl.tsx          # Pill group: none/sm/md/lg (no override)
│   ├── BorderControl.tsx                # Pill group: none/subtle/strong (no override)
│   ├── ShadowControl.tsx                # Pill group: none/subtle/strong (no override)
│   ├── VisibilityControl.tsx            # Radio: always / mobile-only / desktop-only / hidden
│   └── ImageControl.tsx                 # Upload with always-on 🖥️/📱 tabs (not opt-in)
└── tabs/
    ├── StyleTab.tsx                     # Composition of all style controls
    └── AdvancedTab.tsx                  # Anchor ID, custom CSS class (permission-gated), notes
```

**New files (Phase 3 — New Blocks):**
```
components/shop/templates/blocks/
├── RichTextBlock.tsx                    # HTML renderer with DOMPurify sanitization
├── FaqBlock.tsx                         # Accordion + JSON-LD FAQPage schema
├── ImageTextBlock.tsx                   # Image + text side-by-side / stacked
├── RelatedProductsBlock.tsx             # Product cards grid/carousel
└── TrustBadgesBlock.tsx                 # Icon list (lucide-react)

components/admin/page-builder/forms/adapters/
├── RichTextContentForm.tsx              # TipTap-based rich text editor
├── FaqContentForm.tsx                   # Sortable Q&A list
├── ImageTextContentForm.tsx             # Fields + device-override image
├── RelatedProductsContentForm.tsx       # Mode toggle + product picker or filters
└── TrustBadgesContentForm.tsx           # Sortable badge list with icon picker

actions/
└── related-products.ts                  # Server actions: search products for picker, fetch auto-filter results
```

**Modified files (both phases):**
```
lib/blocks/defaults.ts                   # Replace placeholder defaults for 5 new blocks with real ones
lib/blocks/register-existing-blocks.tsx  # Rename to register-blocks.tsx + register all 12 blocks

components/shop/templates/blocks/        # Container-query migration for the 6 remaining renderers:
  HeroBlock.tsx
  GalleryBlock.tsx
  TestimonialsBlock.tsx
  VideoBlock.tsx
  ColorsBlock.tsx
  TickerBlock.tsx
  LandingBlockRenderer.tsx               # Add cases for the 5 new types

components/admin/page-builder/RightSidebar/RightSidebar.tsx  # Enable Estilo + Avanzado tabs

components/admin/page-builder/LeftSidebar/AddBlockPanel.tsx  # Nothing — picks up new blocks from registry automatically

scripts/
└── verify-apply-style.ts                # Smoke test for applyBlockStyle helper
```

---

# PHASE 2 — LEVEL 2 STYLING (Tasks 1-11, ~1.5 weeks)

---

## Task 1: Migrate 3 existing renderers to container queries (Hero, Gallery, Video)

**Why:** Plan 1 fixed BenefitsBlock to use `@container`-based responsive classes so the editor canvas preview matches the real storefront. The remaining 6 renderers still use viewport-based classes (`sm:`, `lg:`) — they produce wrong layouts inside the canvas mobile preview because the browser viewport is wide even when the simulated frame is 375px.

**Files:**
- Modify: `components/shop/templates/blocks/HeroBlock.tsx`
- Modify: `components/shop/templates/blocks/GalleryBlock.tsx`
- Modify: `components/shop/templates/blocks/VideoBlock.tsx`

- [ ] **Step 1: Update `HeroBlock.tsx`**

Current file uses `sm:` and `lg:` variants. Replace them with `@container` + `@md:` / `@lg:` so responsive layout responds to the block's container width, not the browser viewport.

Open the file, find the root `<section>` element, and replace the outer/inner classes with this pattern:

```tsx
<section className="relative min-h-[40vh] @md:min-h-[60vh] flex items-center justify-center overflow-hidden @container">
  {bgImage ? (
    <Image src={bgImage} alt={title} fill className="object-cover" priority unoptimized />
  ) : (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
  )}

  <div className="absolute inset-0" style={{ backgroundColor: overlayColor ?? "rgba(0,0,0,0.4)" }} />

  <div className="relative z-10 container mx-auto px-4 py-10 @md:py-20 text-center text-white">
    <h1 className="text-3xl @md:text-4xl @lg:text-5xl @xl:text-6xl font-bold mb-4 drop-shadow-lg">
      {title}
    </h1>
    {subtitle && (
      <p className="text-base @md:text-lg @lg:text-xl max-w-2xl mx-auto mb-6 @md:mb-8 text-white/90 drop-shadow">
        {subtitle}
      </p>
    )}
    {ctaText && (
      <button
        onClick={onCtaClick}
        className="landing-cta-btn inline-flex items-center justify-center rounded-full px-6 @md:px-8 py-3 @md:py-4 text-base @md:text-lg font-semibold shadow-xl transition-transform hover:scale-105 active:scale-95"
      >
        {ctaText}
      </button>
    )}
  </div>
</section>
```

Key changes:
- `@container` on the `<section>` to establish the container query context
- `@md:` replaces `sm:` (container ≥ 448px equals roughly small desktop/tablet)
- `@lg:` replaces `lg:` (container ≥ 512px)
- `@xl:` replaces `lg:` where the old `lg:` was actually used like xl
- Mobile baseline made slightly smaller (`min-h-[40vh]` instead of `60vh`, `text-3xl` instead of `4xl`, etc.) so the preview on 375px doesn't feel cramped

- [ ] **Step 2: Update `GalleryBlock.tsx`**

Use the Read tool to open the current file and check what responsive classes it uses. Apply the same migration:
- Add `@container` to the outermost block element
- Replace every `sm:`, `md:`, `lg:`, `xl:` variant with the `@`-prefixed container equivalent that matches the breakpoint:
  - `sm:` → `@md:`   (640px viewport ≈ 448px container for typical nested layouts)
  - `md:` → `@3xl:`  (768px viewport ≈ 768px container)
  - `lg:` → `@5xl:`  (1024px viewport ≈ 1024px container)
  - `xl:` → `@7xl:`  (1280px viewport ≈ 1280px container)

If the file uses `grid-cols-*` utilities for image layout, keep `grid-cols-1` as the base and add `@md:grid-cols-2 @lg:grid-cols-3` etc.

- [ ] **Step 3: Update `VideoBlock.tsx`**

Same migration pattern as GalleryBlock. Read the file, replace viewport variants with container variants, add `@container` to the outermost block element.

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/shop/templates/blocks/HeroBlock.tsx components/shop/templates/blocks/GalleryBlock.tsx components/shop/templates/blocks/VideoBlock.tsx
git commit -m "fix(renderers): migrate Hero, Gallery, Video to container queries for canvas-accurate preview"
```

---

## Task 2: Migrate 3 more renderers (Testimonials, Colors, Ticker)

**Files:**
- Modify: `components/shop/templates/blocks/TestimonialsBlock.tsx`
- Modify: `components/shop/templates/blocks/ColorsBlock.tsx`
- Modify: `components/shop/templates/blocks/TickerBlock.tsx`

- [ ] **Step 1: Update `TestimonialsBlock.tsx`**

Read the file. For a testimonials grid, the container-query equivalent is:

```tsx
<section className="landing-section py-8 @md:py-14 @container">
  <div className="container mx-auto px-4">
    <div className="grid gap-4 @md:gap-6 grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3">
      {/* ... items rendered with @md:/@3xl: variants ... */}
    </div>
  </div>
</section>
```

Match the number of grid columns you find in the existing file. Replace every `sm:`, `md:`, `lg:`, `xl:` with the `@`-prefixed equivalent per the mapping in Task 1.

- [ ] **Step 2: Update `ColorsBlock.tsx`**

Colors block is a small visual block. Apply `@container` to its outermost element and convert variants. If the block is tiny (e.g., a horizontal swatch list), it may not need many container-aware variants — just make sure `@container` is present so any responsive classes would work correctly.

- [ ] **Step 3: Update `TickerBlock.tsx`**

Read the file first — this block is tricky because it is the `position: sticky top-0` element from Plan 1. Make sure your changes do NOT alter the sticky behavior or the marquee animation.

Responsive changes needed:
- Add `@container` to the outermost ticker element (the one with `sticky top-0`)
- Convert any viewport variants in font size, padding, or layout classes inside

Common simple ticker has no viewport variants; mainly add `@container` and move on.

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Manually verify in canvas**

Start the dev server (`npm run dev`), open `/admin/productos/<id>?tab=landing`, and with the 6 migrated block types present:
- Toggle Desktop → multi-column / larger typography
- Toggle Mobile → single-column / smaller typography
- All previews should match what the customer sees on a real mobile browser

No commit required for this verification; if any block's layout looks wrong, go back and fix the specific file.

- [ ] **Step 6: Commit**

```bash
git add components/shop/templates/blocks/TestimonialsBlock.tsx components/shop/templates/blocks/ColorsBlock.tsx components/shop/templates/blocks/TickerBlock.tsx
git commit -m "fix(renderers): migrate Testimonials, Colors, Ticker to container queries"
```

---

## Task 3: Create the `applyBlockStyle` helper

**Why:** The Style tab writes user choices into `content.style` (background color, padding, alignment, border, shadow, etc.). Renderers need to read those values and convert them to actual CSS. Without a centralized helper, each renderer would duplicate the mapping logic (padding "md" → `py-6`, etc.). This helper produces a consistent `{ className, style }` pair for the outer wrapper of any block.

**Files:**
- Create: `lib/blocks/apply-style.ts`
- Create: `scripts/verify-apply-style.ts`

- [ ] **Step 1: Create the helper**

Create `lib/blocks/apply-style.ts`:

```typescript
import type { CSSProperties } from "react"
import type { BlockStyle, PaddingSize, Alignment, ContainerWidth, CornerRadius, BorderStyle, ShadowStyle } from "./types"

/**
 * Takes a resolved (device-flattened) BlockStyle and returns the Tailwind
 * class names + inline CSS properties that a block renderer should apply
 * to its outer wrapper element.
 *
 * Renderers compose these with their own structural classes, e.g.
 *   const { className, style } = applyBlockStyle(resolved.style)
 *   return <section className={cn("my-structural-classes", className)} style={style}>
 *
 * The goal is a SINGLE source of truth for how Level 2 style values map
 * to CSS so all 12 blocks behave identically.
 */
export function applyBlockStyle(style: BlockStyle | undefined): {
  className: string
  style: CSSProperties
} {
  if (!style) return { className: "", style: {} }

  const classes: string[] = []
  const inline: CSSProperties = {}

  if (style.paddingY) classes.push(PADDING_CLASS[style.paddingY])
  if (style.alignment) classes.push(ALIGNMENT_CLASS[style.alignment])
  if (style.containerWidth) classes.push(CONTAINER_WIDTH_CLASS[style.containerWidth])
  if (style.cornerRadius) classes.push(CORNER_RADIUS_CLASS[style.cornerRadius])
  if (style.border) classes.push(BORDER_CLASS[style.border])
  if (style.shadow) classes.push(SHADOW_CLASS[style.shadow])

  // Colors always inline (arbitrary user input, not pre-defined palette)
  if (style.backgroundColor && typeof style.backgroundColor === "string") {
    inline.backgroundColor = style.backgroundColor
  }
  if (style.textColor && typeof style.textColor === "string") {
    inline.color = style.textColor
  }

  return { className: classes.filter(Boolean).join(" "), style: inline }
}

const PADDING_CLASS: Record<PaddingSize, string> = {
  none: "py-0",
  sm: "py-4 @md:py-6",
  md: "py-8 @md:py-10",
  lg: "py-12 @md:py-16",
  xl: "py-16 @md:py-24",
}

const ALIGNMENT_CLASS: Record<Alignment, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

// Container width controls the max-width of an inner content wrapper.
// The renderer uses these to decide whether to add `max-w-*` on its inner
// content container (not on the block outer).
const CONTAINER_WIDTH_CLASS: Record<ContainerWidth, string> = {
  narrow: "[--landing-container:48rem]",  // ~768px
  normal: "[--landing-container:72rem]",  // ~1152px (default)
  full: "[--landing-container:100%]",
}

const CORNER_RADIUS_CLASS: Record<CornerRadius, string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-2xl",
}

const BORDER_CLASS: Record<BorderStyle, string> = {
  none: "border-0",
  subtle: "border border-black/5 dark:border-white/10",
  strong: "border-2 border-black/10 dark:border-white/20",
}

const SHADOW_CLASS: Record<ShadowStyle, string> = {
  none: "shadow-none",
  subtle: "shadow-sm",
  strong: "shadow-xl",
}
```

- [ ] **Step 2: Create the verification script**

Create `scripts/verify-apply-style.ts`:

```typescript
import { applyBlockStyle } from "../lib/blocks/apply-style"
import type { BlockStyle } from "../lib/blocks/types"

let failures = 0
function expect(actual: unknown, expected: unknown, label: string) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  if (pass) console.log(`  ✓ ${label}`)
  else {
    failures++
    console.error(`  ✗ ${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`)
  }
}

console.log("applyBlockStyle:")

expect(applyBlockStyle(undefined), { className: "", style: {} }, "undefined style → empty output")
expect(applyBlockStyle({} as BlockStyle), { className: "", style: {} }, "empty style → empty output")

const result1 = applyBlockStyle({
  paddingY: "md",
  alignment: "center",
  backgroundColor: "#ff0000",
  textColor: "#ffffff",
})
expect(result1.className.includes("py-8"), true, "paddingY md → py-8")
expect(result1.className.includes("text-center"), true, "alignment center → text-center")
expect(result1.style.backgroundColor, "#ff0000", "backgroundColor → inline style")
expect(result1.style.color, "#ffffff", "textColor → inline style.color")

const result2 = applyBlockStyle({
  cornerRadius: "lg",
  border: "strong",
  shadow: "subtle",
})
expect(result2.className.includes("rounded-2xl"), true, "cornerRadius lg → rounded-2xl")
expect(result2.className.includes("border-2"), true, "border strong → border-2")
expect(result2.className.includes("shadow-sm"), true, "shadow subtle → shadow-sm")

if (failures > 0) {
  console.error(`\n❌ ${failures} assertion(s) failed`)
  process.exit(1)
}
console.log("\n✅ All assertions passed")
```

- [ ] **Step 3: Run the verification script**

```bash
npx tsx scripts/verify-apply-style.ts
```

Expected: ends with "✅ All assertions passed".

- [ ] **Step 4: Commit**

```bash
git add lib/blocks/apply-style.ts scripts/verify-apply-style.ts
git commit -m "feat(blocks): add applyBlockStyle helper converting BlockStyle to { className, style }"
```

---

## Task 4: Wire `applyBlockStyle` into the 7 existing renderers

**Why:** Style values in `content.style` are currently ignored by the renderers. This task routes them through so changes in the Style tab (coming in Task 11) become visible immediately.

**Files:**
- Modify: `components/shop/templates/blocks/HeroBlock.tsx`
- Modify: `components/shop/templates/blocks/BenefitsBlock.tsx`
- Modify: `components/shop/templates/blocks/GalleryBlock.tsx`
- Modify: `components/shop/templates/blocks/TestimonialsBlock.tsx`
- Modify: `components/shop/templates/blocks/VideoBlock.tsx`
- Modify: `components/shop/templates/blocks/ColorsBlock.tsx`
- Modify: `components/shop/templates/blocks/TickerBlock.tsx`
- Modify: `components/shop/templates/blocks/_normalizeContent.ts`

The `_normalizeContent.ts` helper currently returns only the flat data. We extend it to also return `{ style, media }` from v2 content, so renderers get everything they need without extra plumbing.

- [ ] **Step 1: Extend the normalizer**

Replace the content of `components/shop/templates/blocks/_normalizeContent.ts` with:

```typescript
import type { BlockContentV2, BlockStyle, BlockMedia } from "@/lib/blocks/types"

export function isV2Content(content: unknown): content is BlockContentV2 {
  return (
    typeof content === "object" &&
    content !== null &&
    "data" in content &&
    "style" in content &&
    "media" in content
  )
}

function flattenV2Content(content: BlockContentV2, blockType: string): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...(content.data as Record<string, unknown>) }

  if (blockType === "HERO") {
    const bgImage = content.media.bgImage?.desktop ?? content.media.bgImage?.mobile
    if (bgImage) flat.bgImage = bgImage
    const bgOverlay = content.media.bgOverlay?.desktop ?? content.media.bgOverlay?.mobile
    if (bgOverlay) flat.overlayColor = bgOverlay
  }

  return flat
}

export function readContent<T = Record<string, unknown>>(content: unknown, blockType: string): T {
  if (isV2Content(content)) return flattenV2Content(content, blockType) as T
  return (content ?? {}) as T
}

/**
 * Returns the Level 2 style and media zones from v2 content. For legacy
 * v1 blocks, returns empty shapes so renderers can still call applyBlockStyle
 * without null checks.
 */
export function readStyleAndMedia(content: unknown): { style: BlockStyle; media: BlockMedia } {
  if (isV2Content(content)) {
    return { style: content.style, media: content.media }
  }
  return { style: {}, media: {} }
}
```

- [ ] **Step 2: Update `HeroBlock.tsx`**

Read the file and apply this pattern. The block wraps its root element with the style output:

```tsx
"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { HeroBlockContent } from "@/lib/types/landing-blocks";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface HeroBlockProps {
  content: HeroBlockContent | unknown;
  onCtaClick?: () => void;
}

export default function HeroBlock({ content: rawContent, onCtaClick }: HeroBlockProps) {
  const content = readContent<HeroBlockContent>(rawContent, "HERO");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);
  const { title, subtitle, bgImage, overlayColor, ctaText } = content;

  return (
    <section
      className={cn(
        "relative min-h-[40vh] @md:min-h-[60vh] flex items-center justify-center overflow-hidden @container",
        styleClass,
      )}
      style={inlineStyle}
    >
      {bgImage ? (
        <Image src={bgImage} alt={title} fill className="object-cover" priority unoptimized />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
      )}

      <div className="absolute inset-0" style={{ backgroundColor: overlayColor ?? "rgba(0,0,0,0.4)" }} />

      <div className="relative z-10 container mx-auto px-4 py-10 @md:py-20 text-center text-white">
        <h1 className="text-3xl @md:text-4xl @lg:text-5xl @xl:text-6xl font-bold mb-4 drop-shadow-lg">{title}</h1>
        {subtitle && (
          <p className="text-base @md:text-lg @lg:text-xl max-w-2xl mx-auto mb-6 @md:mb-8 text-white/90 drop-shadow">
            {subtitle}
          </p>
        )}
        {ctaText && (
          <button
            onClick={onCtaClick}
            className="landing-cta-btn inline-flex items-center justify-center rounded-full px-6 @md:px-8 py-3 @md:py-4 text-base @md:text-lg font-semibold shadow-xl transition-transform hover:scale-105 active:scale-95"
          >
            {ctaText}
          </button>
        )}
      </div>
    </section>
  );
}
```

Note: HeroBlock's background and overlay are special-case (it already handles media overlay/bgImage via its own props). The `applyBlockStyle` contributes `backgroundColor` (if set) to the inline style — this would conflict with the overlay's own backgroundColor. For HeroBlock specifically, if `inlineStyle.backgroundColor` is set, it wins (user explicitly chose it). If the user wants the bgImage fallback, they leave backgroundColor unset.

- [ ] **Step 3: Update the other 6 renderers**

For each of: `BenefitsBlock.tsx`, `GalleryBlock.tsx`, `TestimonialsBlock.tsx`, `VideoBlock.tsx`, `ColorsBlock.tsx`, `TickerBlock.tsx`:

1. Add imports:
   ```tsx
   import { cn } from "@/lib/utils";
   import { readStyleAndMedia } from "./_normalizeContent";
   import { applyBlockStyle } from "@/lib/blocks/apply-style";
   ```
2. At the top of the component function, after the existing `readContent` call, add:
   ```tsx
   const { style: blockStyle } = readStyleAndMedia(rawContent);
   const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);
   ```
3. On the outermost JSX element of the block (the `<section>` or `<div>`), add `styleClass` to the `className` (via `cn(...)`) and `style={inlineStyle}` (merge with any existing inline styles using spread).

For **TickerBlock** specifically, the sticky class is on the outermost div — keep it and merge: `cn("z-40 w-full overflow-hidden ... sticky top-0", styleClass)`. The block's own inline `backgroundColor` (from `bgColor` prop) should NOT be overwritten by `inlineStyle.backgroundColor` — the ticker has its own color system independent of Level 2 background. To prevent conflicts, TickerBlock skips `inlineStyle.backgroundColor` and only applies Level 2 spacing/borders:

```tsx
<div
  className={cn("z-40 w-full overflow-hidden text-sm font-medium select-none", isSticky && "sticky top-0", styleClass)}
  style={{ backgroundColor: bgColor ?? "#dc2626", color: textColor ?? "#ffffff" }}
>
```

Note: the above intentionally does NOT spread `inlineStyle`. The ticker's color scheme is its own feature.

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/shop/templates/blocks/
git commit -m "feat(renderers): wire applyBlockStyle into 7 existing block renderers"
```

---

## Task 5: Create the Advanced tab (anchor ID + notes)

**Why:** The right panel's "Avanzado" tab was disabled in Plan 1. This task enables it with a minimal useful feature set: anchor ID (for deep-linking via `#anchor`), internal notes (visible only in admin), and a read-only display of the block ID.

Custom CSS class (permission-gated to super-admin) is explicitly deferred to Plan 3 because it requires permission wiring that isn't present yet.

**Files:**
- Create: `components/admin/page-builder/RightSidebar/tabs/AdvancedTab.tsx`
- Modify: `components/admin/page-builder/RightSidebar/RightSidebar.tsx`
- Modify: `lib/blocks/types.ts` (add `anchorId` and `internalNotes` to BlockContentV2)

- [ ] **Step 1: Extend BlockContentV2 with optional advanced fields**

Open `lib/blocks/types.ts` and update the `BlockContentV2` interface:

```typescript
export interface BlockContentV2 {
  data: Record<string, unknown>
  style: BlockStyle
  media: BlockMedia
  /** Optional anchor id for deep-linking: /productos/<slug>#<anchorId> */
  anchorId?: string
  /** Internal admin-only notes, never rendered on storefront. */
  internalNotes?: string
}
```

Backward-compatible: both fields are optional, legacy content that doesn't have them continues to work.

- [ ] **Step 2: Create `AdvancedTab.tsx`**

Create `components/admin/page-builder/RightSidebar/tabs/AdvancedTab.tsx`:

```typescript
"use client"

import { useBuilderStore } from "../../store"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { BlockContentV2 } from "@/lib/blocks/types"

export function AdvancedTab() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)

  const block = blocks.find((b) => b.id === selectedBlockId)
  if (!block) return null

  const patch = (delta: Partial<BlockContentV2>) => {
    updateBlockContent(block.id, { ...block.content, ...delta })
  }

  // Normalize the anchor id: keep only URL-safe chars, lowercase
  const sanitizeAnchor = (raw: string) =>
    raw.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-")

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          ID del bloque
        </Label>
        <Input
          readOnly
          value={block.id}
          className="mt-1 font-mono text-xs bg-muted/40"
          aria-label="ID del bloque (solo lectura)"
        />
      </div>

      <div>
        <Label htmlFor="anchor-id" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Anclaje
        </Label>
        <Input
          id="anchor-id"
          value={block.content.anchorId ?? ""}
          onChange={(e) => patch({ anchorId: sanitizeAnchor(e.target.value) })}
          placeholder="caracteristicas"
          className="mt-1 font-mono text-sm"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Permite enlazar al bloque con <code className="font-mono">/productos/…#{block.content.anchorId || "anclaje"}</code>.
          Solo letras, números, guion y guion bajo.
        </p>
      </div>

      <div>
        <Label htmlFor="internal-notes" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notas internas
        </Label>
        <Textarea
          id="internal-notes"
          value={block.content.internalNotes ?? ""}
          onChange={(e) => patch({ internalNotes: e.target.value })}
          placeholder="Notas solo visibles en el editor"
          className="mt-1 text-sm"
          rows={3}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          No se muestran en la tienda. Útil para recordatorios o referencias.
        </p>
      </div>

      <div className="text-[11px] text-muted-foreground pt-4 border-t">
        Clase CSS custom: disponible en Plan 3 (permiso super-admin).
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Enable the Advanced tab in `RightSidebar.tsx`**

Open `components/admin/page-builder/RightSidebar/RightSidebar.tsx`. Find the `<TabsTrigger value="advanced" disabled>` and the `<TabsContent value="advanced">`. Replace them with:

```tsx
import { AdvancedTab } from "./tabs/AdvancedTab"
// ... (place this import with the other tab imports at the top)

// Inside the <Tabs> render:
<TabsTrigger value="advanced" className="flex-1">Avanzado</TabsTrigger>
// ...
<TabsContent value="advanced" className="flex-1 overflow-auto p-3 mt-0">
  <AdvancedTab />
</TabsContent>
```

Leave the `<TabsTrigger value="style" disabled>` alone — that's enabled in Task 11.

- [ ] **Step 4: Make renderers respect the anchor ID**

Open `components/shop/templates/blocks/LandingBlockRenderer.tsx`. Currently it wraps each block in a `<div key={block.id}>`. Add the `id` attribute when `anchorId` is set:

```tsx
return (
  <div key={block.id} id={anchorIdOf(block) || undefined} className={className || undefined}>
    {inner}
  </div>
);
```

Add this helper at the top of the file (near `getVisibility`):

```typescript
function anchorIdOf(b: LandingBlock): string | undefined {
  const c = b.content as Record<string, unknown>;
  return (c?.anchorId as string | undefined) || undefined;
}
```

Also update the sticky-ticker render loop to respect anchors:

```tsx
{stickyTickers.map((block) => {
  const className = getVisibilityClass(getVisibility(block));
  return (
    <div key={block.id} id={anchorIdOf(block) || undefined} className={className || undefined}>
      <TickerBlock content={block.content as TickerBlockContent} sticky />
    </div>
  );
})}
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add lib/blocks/types.ts components/admin/page-builder/RightSidebar/ components/shop/templates/blocks/LandingBlockRenderer.tsx
git commit -m "feat(page-builder): enable Advanced tab with anchor ID and internal notes"
```

---

## Task 6: Create `DeviceOverrideWrapper` and base primitives

**Why:** The spec's opt-in per-device override pattern is central to the Style tab. Every field that supports override needs the same UX: a single value by default, and a "+ Override 📱" button that expands into two rows (🖥️ Desktop / 📱 Mobile). Centralizing this in a wrapper component avoids duplicating the toggle logic in every control.

**Files:**
- Create: `components/admin/page-builder/RightSidebar/controls/DeviceOverrideWrapper.tsx`

- [ ] **Step 1: Create the wrapper**

Create `components/admin/page-builder/RightSidebar/controls/DeviceOverrideWrapper.tsx`:

```typescript
"use client"

import { Monitor, Plus, Smartphone, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"
import type { DeviceValue } from "@/lib/blocks/types"

interface DeviceOverrideWrapperProps<T> {
  label: string
  value: DeviceValue<T> | undefined
  onChange: (next: DeviceValue<T> | undefined) => void
  /**
   * Render function that produces the concrete input for a single value.
   * Receives the current T value and a setter. Receives `deviceHint` so the
   * control can emphasize the row visually when the canvas toggle is on that
   * device (see Task 7 for how the PaddingControl uses this).
   */
  render: (value: T | undefined, onValueChange: (v: T | undefined) => void, deviceHint?: "desktop" | "mobile") => ReactNode
}

/**
 * Opt-in per-device override wrapper. Behavior:
 *
 *  - If the value is a primitive (or absent): render ONE row with the
 *    `render()` prop, plus a small "+ Override 📱" button that splits the
 *    value into { desktop, mobile }.
 *
 *  - If the value is already split into { desktop, mobile }: render TWO rows
 *    (🖥️ Desktop and 📱 Mobile), each with the same `render()` prop.
 *    Includes a "✕ Quitar override" button that collapses back to a single
 *    value (picks desktop's value as the new shared value).
 */
export function DeviceOverrideWrapper<T>({
  label,
  value,
  onChange,
  render,
}: DeviceOverrideWrapperProps<T>) {
  const isSplit = isDeviceValue(value)

  if (!isSplit) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1 px-1.5"
            onClick={() => {
              // Promote the current flat value to a device-split value
              const current = value as T | undefined
              onChange({ desktop: current, mobile: current })
            }}
            aria-label="Agregar override mobile"
            title="Override por dispositivo"
          >
            <Plus className="h-3 w-3" />
            Override 📱
          </Button>
        </div>
        {render(value as T | undefined, (v) => onChange(v))}
      </div>
    )
  }

  const split = value as { desktop?: T; mobile?: T }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 px-1.5 text-destructive hover:text-destructive"
          onClick={() => {
            // Collapse back to a flat value — keep the desktop side
            onChange(split.desktop)
          }}
          aria-label="Quitar override"
          title="Quitar override"
        >
          <X className="h-3 w-3" />
          Quitar
        </Button>
      </div>
      <div className="space-y-2">
        <DeviceRow icon="desktop">
          {render(split.desktop, (v) => onChange({ ...split, desktop: v }), "desktop")}
        </DeviceRow>
        <DeviceRow icon="mobile">
          {render(split.mobile, (v) => onChange({ ...split, mobile: v }), "mobile")}
        </DeviceRow>
      </div>
    </div>
  )
}

function DeviceRow({ icon, children }: { icon: "desktop" | "mobile"; children: ReactNode }) {
  const Icon = icon === "desktop" ? Monitor : Smartphone
  const label = icon === "desktop" ? "Desktop" : "Mobile"
  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center gap-1 pt-2 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] font-medium w-10">{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function isDeviceValue(v: unknown): v is { desktop?: unknown; mobile?: unknown } {
  if (v === null || v === undefined) return false
  if (typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return "desktop" in o || "mobile" in o
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors. (The wrapper uses the exact `DeviceValue<T>` type from `lib/blocks/types.ts`.)

- [ ] **Step 3: Commit**

```bash
git add components/admin/page-builder/RightSidebar/controls/DeviceOverrideWrapper.tsx
git commit -m "feat(page-builder): add DeviceOverrideWrapper primitive for opt-in device overrides"
```

---

## Task 7: Create `ColorControl`, `PaddingControl`, `AlignmentControl`, `ContainerWidthControl`

**Why:** These are the four most-used style controls. All of them support per-device override via the `DeviceOverrideWrapper`. Grouping them reduces the number of tasks without sacrificing clarity — each control is ~30 lines.

**Files:**
- Create: `components/admin/page-builder/RightSidebar/controls/ColorControl.tsx`
- Create: `components/admin/page-builder/RightSidebar/controls/PaddingControl.tsx`
- Create: `components/admin/page-builder/RightSidebar/controls/AlignmentControl.tsx`
- Create: `components/admin/page-builder/RightSidebar/controls/ContainerWidthControl.tsx`

- [ ] **Step 1: Create `ColorControl.tsx`**

```typescript
"use client"

import { Input } from "@/components/ui/input"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue } from "@/lib/blocks/types"

interface ColorControlProps {
  label: string
  value: DeviceValue<string> | undefined
  onChange: (next: DeviceValue<string> | undefined) => void
}

export function ColorControl({ label, value, onChange }: ColorControlProps) {
  return (
    <DeviceOverrideWrapper
      label={label}
      value={value}
      onChange={onChange}
      render={(v, setV) => (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={v ?? "#ffffff"}
            onChange={(e) => setV(e.target.value)}
            className="h-8 w-10 rounded border cursor-pointer p-0.5"
            aria-label={`${label} color picker`}
          />
          <Input
            value={v ?? ""}
            onChange={(e) => setV(e.target.value || undefined)}
            placeholder="#000000"
            className="text-xs h-8 font-mono flex-1"
          />
        </div>
      )}
    />
  )
}
```

- [ ] **Step 2: Create `PaddingControl.tsx`**

```typescript
"use client"

import { cn } from "@/lib/utils"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue, PaddingSize } from "@/lib/blocks/types"

const OPTIONS: PaddingSize[] = ["none", "sm", "md", "lg", "xl"]
const LABELS: Record<PaddingSize, string> = {
  none: "—",
  sm: "S",
  md: "M",
  lg: "L",
  xl: "XL",
}

interface PaddingControlProps {
  value: DeviceValue<PaddingSize> | undefined
  onChange: (next: DeviceValue<PaddingSize> | undefined) => void
}

export function PaddingControl({ value, onChange }: PaddingControlProps) {
  return (
    <DeviceOverrideWrapper
      label="Padding vertical"
      value={value}
      onChange={onChange}
      render={(v, setV) => (
        <div className="inline-flex rounded-md border bg-background p-0.5">
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setV(opt)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded transition-colors",
                v === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={v === opt}
              title={`Padding ${opt}`}
            >
              {LABELS[opt]}
            </button>
          ))}
        </div>
      )}
    />
  )
}
```

- [ ] **Step 3: Create `AlignmentControl.tsx`**

```typescript
"use client"

import { AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue, Alignment } from "@/lib/blocks/types"

const OPTIONS: { value: Alignment; Icon: typeof AlignLeft; label: string }[] = [
  { value: "left", Icon: AlignLeft, label: "Izquierda" },
  { value: "center", Icon: AlignCenter, label: "Centro" },
  { value: "right", Icon: AlignRight, label: "Derecha" },
]

interface AlignmentControlProps {
  value: DeviceValue<Alignment> | undefined
  onChange: (next: DeviceValue<Alignment> | undefined) => void
}

export function AlignmentControl({ value, onChange }: AlignmentControlProps) {
  return (
    <DeviceOverrideWrapper
      label="Alineación"
      value={value}
      onChange={onChange}
      render={(v, setV) => (
        <div className="inline-flex rounded-md border bg-background p-0.5">
          {OPTIONS.map(({ value: opt, Icon, label }) => (
            <button
              key={opt}
              type="button"
              onClick={() => setV(opt)}
              className={cn(
                "p-1.5 rounded transition-colors",
                v === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={v === opt}
              aria-label={label}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
    />
  )
}
```

- [ ] **Step 4: Create `ContainerWidthControl.tsx`**

```typescript
"use client"

import { cn } from "@/lib/utils"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue, ContainerWidth } from "@/lib/blocks/types"

const OPTIONS: { value: ContainerWidth; label: string }[] = [
  { value: "narrow", label: "Angosto" },
  { value: "normal", label: "Normal" },
  { value: "full", label: "Full" },
]

interface ContainerWidthControlProps {
  value: DeviceValue<ContainerWidth> | undefined
  onChange: (next: DeviceValue<ContainerWidth> | undefined) => void
}

export function ContainerWidthControl({ value, onChange }: ContainerWidthControlProps) {
  return (
    <DeviceOverrideWrapper
      label="Ancho del contenedor"
      value={value}
      onChange={onChange}
      render={(v, setV) => (
        <div className="inline-flex rounded-md border bg-background p-0.5">
          {OPTIONS.map(({ value: opt, label }) => (
            <button
              key={opt}
              type="button"
              onClick={() => setV(opt)}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded transition-colors",
                v === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={v === opt}
              title={label}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    />
  )
}
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/page-builder/RightSidebar/controls/ColorControl.tsx components/admin/page-builder/RightSidebar/controls/PaddingControl.tsx components/admin/page-builder/RightSidebar/controls/AlignmentControl.tsx components/admin/page-builder/RightSidebar/controls/ContainerWidthControl.tsx
git commit -m "feat(page-builder): add Color, Padding, Alignment, ContainerWidth controls with device override"
```

---

## Task 8: Create `CornerRadiusControl`, `BorderControl`, `ShadowControl`, `VisibilityControl`

**Why:** These four controls do NOT support per-device override (per the spec — they don't vary between mobile/desktop in real use). So they bypass `DeviceOverrideWrapper` and render a single pill group directly.

**Files:**
- Create: `components/admin/page-builder/RightSidebar/controls/CornerRadiusControl.tsx`
- Create: `components/admin/page-builder/RightSidebar/controls/BorderControl.tsx`
- Create: `components/admin/page-builder/RightSidebar/controls/ShadowControl.tsx`
- Create: `components/admin/page-builder/RightSidebar/controls/VisibilityControl.tsx`

- [ ] **Step 1: Create a shared pill group primitive**

Since these four controls share the same pattern, add a shared utility inside the first file. Create `components/admin/page-builder/RightSidebar/controls/CornerRadiusControl.tsx`:

```typescript
"use client"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import type { CornerRadius } from "@/lib/blocks/types"

const OPTIONS: { value: CornerRadius; label: string }[] = [
  { value: "none", label: "Ninguno" },
  { value: "sm", label: "Sm" },
  { value: "md", label: "Md" },
  { value: "lg", label: "Lg" },
]

interface Props {
  value: CornerRadius | undefined
  onChange: (next: CornerRadius) => void
}

export function CornerRadiusControl({ value, onChange }: Props) {
  return (
    <PillGroup label="Radio de esquinas">
      {OPTIONS.map(({ value: opt, label }) => (
        <PillButton key={opt} active={value === opt} onClick={() => onChange(opt)} label={label} />
      ))}
    </PillGroup>
  )
}

// ───── shared primitives (used by all 4 controls in Task 8) ─────

export function PillGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 block">
        {label}
      </Label>
      <div className="inline-flex rounded-md border bg-background p-0.5">{children}</div>
    </div>
  )
}

export function PillButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 text-xs font-medium rounded transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      aria-pressed={active}
      title={label}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 2: Create `BorderControl.tsx`**

```typescript
"use client"

import { PillGroup, PillButton } from "./CornerRadiusControl"
import type { BorderStyle } from "@/lib/blocks/types"

const OPTIONS: { value: BorderStyle; label: string }[] = [
  { value: "none", label: "Ninguno" },
  { value: "subtle", label: "Sutil" },
  { value: "strong", label: "Fuerte" },
]

interface Props {
  value: BorderStyle | undefined
  onChange: (next: BorderStyle) => void
}

export function BorderControl({ value, onChange }: Props) {
  return (
    <PillGroup label="Borde">
      {OPTIONS.map(({ value: opt, label }) => (
        <PillButton key={opt} active={value === opt} onClick={() => onChange(opt)} label={label} />
      ))}
    </PillGroup>
  )
}
```

- [ ] **Step 3: Create `ShadowControl.tsx`**

```typescript
"use client"

import { PillGroup, PillButton } from "./CornerRadiusControl"
import type { ShadowStyle } from "@/lib/blocks/types"

const OPTIONS: { value: ShadowStyle; label: string }[] = [
  { value: "none", label: "Ninguno" },
  { value: "subtle", label: "Sutil" },
  { value: "strong", label: "Fuerte" },
]

interface Props {
  value: ShadowStyle | undefined
  onChange: (next: ShadowStyle) => void
}

export function ShadowControl({ value, onChange }: Props) {
  return (
    <PillGroup label="Sombra">
      {OPTIONS.map(({ value: opt, label }) => (
        <PillButton key={opt} active={value === opt} onClick={() => onChange(opt)} label={label} />
      ))}
    </PillGroup>
  )
}
```

- [ ] **Step 4: Create `VisibilityControl.tsx`**

```typescript
"use client"

import { PillGroup, PillButton } from "./CornerRadiusControl"
import type { Visibility } from "@/lib/blocks/types"

const OPTIONS: { value: Visibility; label: string }[] = [
  { value: "always", label: "Siempre" },
  { value: "mobile-only", label: "Solo mobile" },
  { value: "desktop-only", label: "Solo desktop" },
  { value: "hidden", label: "Oculto" },
]

interface Props {
  value: Visibility | undefined
  onChange: (next: Visibility) => void
}

export function VisibilityControl({ value, onChange }: Props) {
  const v = value ?? "always"
  return (
    <PillGroup label="Visibilidad">
      {OPTIONS.map(({ value: opt, label }) => (
        <PillButton key={opt} active={v === opt} onClick={() => onChange(opt)} label={label} />
      ))}
    </PillGroup>
  )
}
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/page-builder/RightSidebar/controls/CornerRadiusControl.tsx components/admin/page-builder/RightSidebar/controls/BorderControl.tsx components/admin/page-builder/RightSidebar/controls/ShadowControl.tsx components/admin/page-builder/RightSidebar/controls/VisibilityControl.tsx
git commit -m "feat(page-builder): add CornerRadius, Border, Shadow, Visibility pill-group controls"
```

---

## Task 9: Create `ImageControl` with always-on device tabs

**Why:** Images are the single place where per-device difference is the default (a landscape hero on desktop vs. a portrait crop on mobile is the norm). Unlike style controls, the `ImageControl` shows 🖥️ and 📱 upload slots permanently — not behind an opt-in button.

**Files:**
- Create: `components/admin/page-builder/RightSidebar/controls/ImageControl.tsx`

- [ ] **Step 1: Create the control**

```typescript
"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Monitor, Smartphone, Upload, X } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"

interface DeviceImage {
  desktop?: string
  mobile?: string
}

interface ImageControlProps {
  label: string
  value: DeviceImage | undefined
  onChange: (next: DeviceImage | undefined) => void
}

/**
 * Image control with ALWAYS-on Desktop/Mobile tabs. Unlike opt-in device
 * overrides on style fields, images are the place where per-device choice
 * is a default expectation — landscape hero on desktop, vertical crop on
 * mobile.
 *
 * Uploads go through the same /api/upload endpoint used elsewhere in the
 * admin (Vercel Blob). On success we store the returned URL in either the
 * desktop or mobile slot.
 */
export function ImageControl({ label, value, onChange }: ImageControlProps) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
        {label}
      </Label>
      <div className="space-y-2">
        <DeviceRow icon="desktop">
          <ImageSlot
            url={value?.desktop}
            onUpload={(url) => onChange({ ...value, desktop: url })}
            onRemove={() => {
              const next = { ...value, desktop: undefined }
              const isEmpty = !next.desktop && !next.mobile
              onChange(isEmpty ? undefined : next)
            }}
          />
        </DeviceRow>
        <DeviceRow icon="mobile">
          <ImageSlot
            url={value?.mobile}
            onUpload={(url) => onChange({ ...value, mobile: url })}
            onRemove={() => {
              const next = { ...value, mobile: undefined }
              const isEmpty = !next.desktop && !next.mobile
              onChange(isEmpty ? undefined : next)
            }}
          />
        </DeviceRow>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        Si dejas mobile vacío, se usa la imagen desktop también en mobile.
      </p>
    </div>
  )
}

function DeviceRow({ icon, children }: { icon: "desktop" | "mobile"; children: React.ReactNode }) {
  const Icon = icon === "desktop" ? Monitor : Smartphone
  const label = icon === "desktop" ? "Desktop" : "Mobile"
  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center gap-1 pt-2 text-muted-foreground shrink-0">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] font-medium w-10">{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function ImageSlot({
  url,
  onUpload,
  onRemove,
}: {
  url?: string
  onUpload: (url: string) => void
  onRemove: () => void
}) {
  const [loading, setLoading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const data = (await res.json()) as { url: string }
      if (!data.url) throw new Error("No URL returned from upload")
      onUpload(data.url)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al subir la imagen"
      toast.error(message)
    } finally {
      setLoading(false)
      e.target.value = ""
    }
  }

  if (url) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
        <Image src={url} alt="" fill className="object-cover" unoptimized />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 shadow"
          onClick={onRemove}
          aria-label="Quitar imagen"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <label className="flex items-center justify-center gap-2 p-3 rounded-md border-2 border-dashed text-xs text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors">
      <Upload className="h-3.5 w-3.5" />
      {loading ? "Subiendo..." : "Subir imagen"}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={loading}
        className="hidden"
      />
    </label>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/page-builder/RightSidebar/controls/ImageControl.tsx
git commit -m "feat(page-builder): add ImageControl with always-on Desktop/Mobile upload slots"
```

---

## Task 10: Create the `StyleTab` composition

**Why:** With all ten controls in place, StyleTab simply lays them out into sections and wires them to the store. The tab reads the selected block's `content.style` / `content.media.bgImage` / `content.media.bgOverlay` and writes changes through `updateBlockContent`.

**Files:**
- Create: `components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx`

- [ ] **Step 1: Create the tab**

```typescript
"use client"

import { useBuilderStore } from "../../store"
import type { BlockContentV2, BlockStyle, DeviceValue } from "@/lib/blocks/types"
import { ColorControl } from "../controls/ColorControl"
import { PaddingControl } from "../controls/PaddingControl"
import { AlignmentControl } from "../controls/AlignmentControl"
import { ContainerWidthControl } from "../controls/ContainerWidthControl"
import { CornerRadiusControl } from "../controls/CornerRadiusControl"
import { BorderControl } from "../controls/BorderControl"
import { ShadowControl } from "../controls/ShadowControl"
import { VisibilityControl } from "../controls/VisibilityControl"
import { ImageControl } from "../controls/ImageControl"

export function StyleTab() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)

  const block = blocks.find((b) => b.id === selectedBlockId)
  if (!block) return null

  const content = block.content
  const style = content.style ?? {}

  function patchStyle<K extends keyof BlockStyle>(key: K, value: BlockStyle[K] | undefined) {
    updateBlockContent(block!.id, {
      ...content,
      style: { ...style, [key]: value } as BlockStyle,
    })
  }

  function patchMedia(key: "bgImage", value: { desktop?: string; mobile?: string } | undefined) {
    updateBlockContent(block!.id, {
      ...content,
      media: { ...content.media, [key]: value },
    })
  }

  return (
    <div className="space-y-6">
      <Section title="Colores">
        <ColorControl
          label="Fondo"
          value={style.backgroundColor as DeviceValue<string> | undefined}
          onChange={(v) => patchStyle("backgroundColor", v)}
        />
        <ColorControl
          label="Texto"
          value={style.textColor as DeviceValue<string> | undefined}
          onChange={(v) => patchStyle("textColor", v)}
        />
      </Section>

      <Section title="Espaciado">
        <PaddingControl
          value={style.paddingY}
          onChange={(v) => patchStyle("paddingY", v)}
        />
      </Section>

      <Section title="Layout">
        <AlignmentControl
          value={style.alignment}
          onChange={(v) => patchStyle("alignment", v)}
        />
        <ContainerWidthControl
          value={style.containerWidth}
          onChange={(v) => patchStyle("containerWidth", v)}
        />
      </Section>

      <Section title="Bordes y sombras">
        <CornerRadiusControl
          value={style.cornerRadius}
          onChange={(v) => patchStyle("cornerRadius", v)}
        />
        <BorderControl
          value={style.border}
          onChange={(v) => patchStyle("border", v)}
        />
        <ShadowControl
          value={style.shadow}
          onChange={(v) => patchStyle("shadow", v)}
        />
      </Section>

      <Section title="Visibilidad">
        <VisibilityControl
          value={style.visibility}
          onChange={(v) => patchStyle("visibility", v)}
        />
      </Section>

      <Section title="Imagen de fondo">
        <ImageControl
          label="Background"
          value={content.media?.bgImage}
          onChange={(v) => patchMedia("bgImage", v)}
        />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx
git commit -m "feat(page-builder): compose StyleTab with all Level 2 controls"
```

---

## Task 11: Enable the Estilo tab in RightSidebar

**Files:**
- Modify: `components/admin/page-builder/RightSidebar/RightSidebar.tsx`

- [ ] **Step 1: Enable the tab**

Open the file. Add the import near the existing tab imports:

```tsx
import { StyleTab } from "./tabs/StyleTab"
```

Find the `<TabsTrigger value="style" ... disabled>Estilo</TabsTrigger>` and remove the `disabled` prop:

```tsx
<TabsTrigger value="style" className="flex-1">Estilo</TabsTrigger>
```

Find the `<TabsContent value="style">` with its placeholder, and replace with:

```tsx
<TabsContent value="style" className="flex-1 overflow-auto p-3 mt-0">
  <StyleTab />
</TabsContent>
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Smoke test manually**

Start the dev server and open `/admin/productos/<id>?tab=landing`. For each block:
- Select a block
- Click the "Estilo" tab
- Try each control; confirm the canvas updates in real time
- Toggle Desktop/Mobile and verify device overrides apply
- Use the ⋯ menu on controls that have opt-in override: click "+ Override 📱", edit the mobile value, verify the canvas respects it when switching device

- [ ] **Step 4: Commit**

```bash
git add components/admin/page-builder/RightSidebar/RightSidebar.tsx
git commit -m "feat(page-builder): enable Estilo tab in right sidebar"
```

---

# PHASE 3 — 5 NEW BLOCK TYPES (Tasks 12-17, ~2 weeks)

---

## Task 12: Replace placeholder defaults with real v2 content for 5 new blocks

**Why:** In Plan 1, the 5 new block types were added to the enum and the defaults file has empty-object placeholders. This task replaces them with real defaults so adding any of the 5 new blocks produces usable starter content.

**Files:**
- Modify: `lib/blocks/defaults.ts`

- [ ] **Step 1: Replace the placeholder entries at the bottom of the file**

Open `lib/blocks/defaults.ts`. Find the comment block that says "Block types added in Plan 2 — placeholder defaults ..." and the 5 entries below it. Replace them with:

```typescript
  RICH_TEXT: {
    data: {
      html: "<p>Escribe aquí tu contenido con formato libre.</p>",
      maxWidth: "prose",
    },
    style: { ...DEFAULT_STYLE, alignment: "left" },
    media: {},
  },

  FAQ: {
    data: {
      title: "Preguntas frecuentes",
      items: [
        { id: crypto.randomUUID(), question: "¿Cuánto demora el envío?", answer: "<p>Entre 24 y 72 horas en Lima Metropolitana.</p>" },
        { id: crypto.randomUUID(), question: "¿Puedo devolver el producto?", answer: "<p>Sí, tienes 30 días calendario para devoluciones.</p>" },
      ],
      allowMultipleOpen: false,
      defaultOpenFirst: false,
    },
    style: { ...DEFAULT_STYLE, alignment: "left" },
    media: {},
  },

  IMAGE_TEXT: {
    data: {
      title: "Característica destacada",
      description: "<p>Describe la característica en un par de oraciones.</p>",
      imagePosition: "left",
      imageAlt: "Característica del producto",
      ctaText: "",
      ctaUrl: "",
      ratioImageToText: "50-50",
    },
    style: { ...DEFAULT_STYLE, alignment: "left" },
    media: {
      image: { desktop: "", mobile: "" },
    },
  },

  RELATED_PRODUCTS: {
    data: {
      title: "También te puede gustar",
      mode: "auto",
      autoFilters: {
        source: "same-category",
        limit: 4,
        excludeCurrentProduct: true,
      },
      displayType: "carousel",
      columnsDesktop: 4,
      columnsMobile: 2,
      showPrice: true,
      showRating: false,
      showAddToCart: false,
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },

  TRUST_BADGES: {
    data: {
      badges: [
        { id: crypto.randomUUID(), icon: "ShieldCheck", title: "Pago seguro", subtitle: "SSL y tarjeta cifrada" },
        { id: crypto.randomUUID(), icon: "Truck", title: "Envío gratis", subtitle: "En compras mayores a S/150" },
        { id: crypto.randomUUID(), icon: "RefreshCw", title: "Devoluciones", subtitle: "30 días" },
        { id: crypto.randomUUID(), icon: "BadgeCheck", title: "Garantía", subtitle: "Productos originales" },
      ],
      layout: "horizontal",
      columns: 4,
      iconSize: "md",
      iconStyle: "outline",
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },
}
```

Remove the closing brace from the old placeholder block — make sure the file still ends with a single `}` closing `DEFAULT_CONTENT_V2`.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/blocks/defaults.ts
git commit -m "feat(blocks): replace placeholder defaults with real starter content for 5 new blocks"
```

---

## Task 13: Build `TRUST_BADGES` block (renderer + form + registration)

**Why:** Start with the simplest new block to validate the block-creation pipeline end-to-end before tackling more complex ones.

**Files:**
- Create: `components/shop/templates/blocks/TrustBadgesBlock.tsx`
- Create: `components/admin/page-builder/forms/adapters/TrustBadgesContentForm.tsx`
- Modify: `lib/blocks/register-existing-blocks.tsx` (rename to `register-blocks.tsx` at Task 17)
- Modify: `components/shop/templates/blocks/LandingBlockRenderer.tsx`

- [ ] **Step 1: Create the renderer**

Create `components/shop/templates/blocks/TrustBadgesBlock.tsx`:

```typescript
"use client";

import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface TrustBadge {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
}

interface TrustBadgesContent {
  badges: TrustBadge[];
  layout: "horizontal" | "vertical";
  columns: 2 | 3 | 4 | 5;
  iconSize: "sm" | "md" | "lg";
  iconStyle: "outline" | "solid";
}

interface TrustBadgesBlockProps {
  content: TrustBadgesContent | unknown;
}

const ICON_SIZE_CLASS = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9" } as const;

const HORIZONTAL_COLS = {
  2: "grid-cols-2",
  3: "grid-cols-2 @md:grid-cols-3",
  4: "grid-cols-2 @md:grid-cols-4",
  5: "grid-cols-2 @md:grid-cols-3 @lg:grid-cols-5",
} as const;

export default function TrustBadgesBlock({ content: rawContent }: TrustBadgesBlockProps) {
  const content = readContent<TrustBadgesContent>(rawContent, "TRUST_BADGES");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const badges = content.badges ?? [];
  const layout = content.layout ?? "horizontal";
  const columns = content.columns ?? 4;
  const iconSize = content.iconSize ?? "md";

  if (badges.length === 0) return null;

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        {layout === "horizontal" ? (
          <div className={cn("grid gap-4 @md:gap-6", HORIZONTAL_COLS[columns])}>
            {badges.map((b) => (
              <HorizontalBadge key={b.id} badge={b} iconSize={iconSize} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {badges.map((b) => (
              <VerticalBadge key={b.id} badge={b} iconSize={iconSize} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ResolveIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  const Fallback = LucideIcons.HelpCircle;
  const Comp = Icon ?? Fallback;
  return <Comp className={className} />;
}

function HorizontalBadge({ badge, iconSize }: { badge: TrustBadge; iconSize: "sm" | "md" | "lg" }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg">
      <ResolveIcon name={badge.icon} className={cn(ICON_SIZE_CLASS[iconSize], "text-primary")} />
      <div>
        <div className="font-semibold text-sm @md:text-base">{badge.title}</div>
        {badge.subtitle && <div className="text-xs text-muted-foreground">{badge.subtitle}</div>}
      </div>
    </div>
  );
}

function VerticalBadge({ badge, iconSize }: { badge: TrustBadge; iconSize: "sm" | "md" | "lg" }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-white">
      <ResolveIcon name={badge.icon} className={cn(ICON_SIZE_CLASS[iconSize], "text-primary shrink-0")} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{badge.title}</div>
        {badge.subtitle && <div className="text-xs text-muted-foreground">{badge.subtitle}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the content form adapter**

Create `components/admin/page-builder/forms/adapters/TrustBadgesContentForm.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BlockContentV2 } from "@/lib/blocks/types"

interface Badge {
  id: string
  icon: string
  title: string
  subtitle?: string
}

interface Data {
  badges: Badge[]
  layout: "horizontal" | "vertical"
  columns: 2 | 3 | 4 | 5
  iconSize: "sm" | "md" | "lg"
  iconStyle: "outline" | "solid"
}

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

const CURATED_ICONS = [
  "Shield", "ShieldCheck", "Lock", "Truck", "Package", "RefreshCw",
  "Award", "Star", "Heart", "Gift", "Clock", "BadgeCheck",
  "CreditCard", "Headphones", "Phone", "Globe",
]

export function TrustBadgesContentForm({ content, onChange }: Props) {
  const data = content.data as unknown as Data
  const patch = (delta: Partial<Data>) => {
    onChange({ ...content, data: { ...data, ...delta } as unknown as Record<string, unknown> })
  }

  const updateBadge = (id: string, delta: Partial<Badge>) => {
    patch({ badges: data.badges.map((b) => (b.id === id ? { ...b, ...delta } : b)) })
  }

  const addBadge = () => {
    patch({
      badges: [
        ...data.badges,
        { id: crypto.randomUUID(), icon: "Shield", title: "Nuevo badge", subtitle: "" },
      ],
    })
  }

  const removeBadge = (id: string) => {
    patch({ badges: data.badges.filter((b) => b.id !== id) })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Layout</Label>
        <Select value={data.layout ?? "horizontal"} onValueChange={(v) => patch({ layout: v as Data["layout"] })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="horizontal">Horizontal (grid)</SelectItem>
            <SelectItem value="vertical">Vertical (lista)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.layout === "horizontal" && (
        <div>
          <Label className="text-xs">Columnas (horizontal)</Label>
          <Select value={String(data.columns ?? 4)} onValueChange={(v) => patch({ columns: Number(v) as Data["columns"] })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-xs">Tamaño de íconos</Label>
        <Select value={data.iconSize ?? "md"} onValueChange={(v) => patch({ iconSize: v as Data["iconSize"] })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Pequeño</SelectItem>
            <SelectItem value="md">Mediano</SelectItem>
            <SelectItem value="lg">Grande</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-2 border-t">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">Badges ({data.badges?.length ?? 0})</Label>
          <Button type="button" size="sm" variant="outline" onClick={addBadge}>
            <Plus className="h-3 w-3 mr-1" />Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {data.badges?.map((badge) => (
            <BadgeEditor
              key={badge.id}
              badge={badge}
              onUpdate={(delta) => updateBadge(badge.id, delta)}
              onRemove={() => removeBadge(badge.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function BadgeEditor({
  badge,
  onUpdate,
  onRemove,
}: {
  badge: Badge
  onUpdate: (delta: Partial<Badge>) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-md p-2 space-y-2">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={badge.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título"
          className="h-7 text-sm flex-1"
        />
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen((p) => !p)} aria-label="Ajustar">
          ⚙
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove} aria-label="Eliminar">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {open && (
        <div className="space-y-2 pt-2 border-t">
          <div>
            <Label className="text-[10px]">Ícono (lucide)</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {CURATED_ICONS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onUpdate({ icon: name })}
                  className={`p-1.5 rounded text-xs ${badge.icon === name ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  title={name}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Subtítulo</Label>
            <Input
              value={badge.subtitle ?? ""}
              onChange={(e) => onUpdate({ subtitle: e.target.value })}
              placeholder="Subtítulo opcional"
              className="h-7 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Register the block in the registry**

Open `lib/blocks/register-existing-blocks.tsx`. Add:

```typescript
import TrustBadgesBlock from "@/components/shop/templates/blocks/TrustBadgesBlock"
import { TrustBadgesContentForm } from "@/components/admin/page-builder/forms/adapters/TrustBadgesContentForm"
```

(Not dynamic-imported — the block is tiny so no reason to code-split.)

Add to the `existing` array:

```typescript
  {
    type: "TRUST_BADGES",
    label: "Badges de confianza",
    icon: "ShieldCheck",
    emoji: "🛡️",
    description: "Íconos con señales de confianza (pago seguro, envío gratis, etc.)",
    scope: "universal",
    category: "social-proof",
    defaultContent: DEFAULT_CONTENT_V2.TRUST_BADGES,
    renderer: TrustBadgesBlock as any,
    contentForm: TrustBadgesContentForm as any,
  },
```

- [ ] **Step 4: Update the storefront renderer to handle TRUST_BADGES**

Open `components/shop/templates/blocks/LandingBlockRenderer.tsx`. Add the import:

```typescript
import TrustBadgesBlock from "./TrustBadgesBlock";
```

Find the `switch (block.type)` inside `rest.map(...)` and add:

```tsx
case "TRUST_BADGES":
  inner = <TrustBadgesBlock content={c} />;
  break;
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Smoke test manually**

Start dev server, open the editor, click "+ Agregar" → "Social proof" → "Badges de confianza". A 4-badge grid appears. Edit a badge's title, switch icon, try horizontal/vertical. Confirm canvas updates.

- [ ] **Step 7: Commit**

```bash
git add components/shop/templates/blocks/TrustBadgesBlock.tsx components/admin/page-builder/forms/adapters/TrustBadgesContentForm.tsx lib/blocks/register-existing-blocks.tsx components/shop/templates/blocks/LandingBlockRenderer.tsx
git commit -m "feat(blocks): add TRUST_BADGES block (renderer + form + registration)"
```

---

## Task 14: Build `RICH_TEXT` block

**Files:**
- Create: `components/shop/templates/blocks/RichTextBlock.tsx`
- Create: `components/admin/page-builder/forms/adapters/RichTextContentForm.tsx`
- Modify: `lib/blocks/register-existing-blocks.tsx`
- Modify: `components/shop/templates/blocks/LandingBlockRenderer.tsx`

- [ ] **Step 1: Create the renderer**

Create `components/shop/templates/blocks/RichTextBlock.tsx`:

```typescript
"use client";

import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface RichTextContent {
  html: string;
  maxWidth?: "prose";
}

interface RichTextBlockProps {
  content: RichTextContent | unknown;
}

export default function RichTextBlock({ content: rawContent }: RichTextBlockProps) {
  const content = readContent<RichTextContent>(rawContent, "RICH_TEXT");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const html = content.html ?? "";
  if (!html.trim()) return null;

  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "a", "h2", "h3", "h4", "ul", "ol", "li", "blockquote"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            "prose prose-sm @md:prose-base max-w-[65ch] mx-auto",
            "prose-headings:font-semibold prose-a:text-primary",
          )}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>
    </section>
  );
}
```

Note: this uses `isomorphic-dompurify`. If the package isn't installed, install it:

```bash
npm install isomorphic-dompurify
```

- [ ] **Step 2: Install DOMPurify if not present**

Check `package.json` for `"isomorphic-dompurify"`. If missing, run:

```bash
npm install isomorphic-dompurify
```

- [ ] **Step 3: Create the content form adapter**

Create `components/admin/page-builder/forms/adapters/RichTextContentForm.tsx`:

```typescript
"use client"

import dynamic from "next/dynamic"
import type { BlockContentV2 } from "@/lib/blocks/types"

const RichTextEditor = dynamic(
  () => import("@/components/admin/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-muted rounded" /> }
)

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

export function RichTextContentForm({ content, onChange }: Props) {
  const html = (content.data.html as string) ?? ""

  return (
    <div>
      <RichTextEditor
        value={html}
        onChange={(newHtml: string) =>
          onChange({
            ...content,
            data: { ...content.data, html: newHtml },
          })
        }
      />
    </div>
  )
}
```

- [ ] **Step 4: Verify RichTextEditor's API matches**

Open `components/admin/RichTextEditor.tsx` and confirm it accepts `{ value, onChange }`. If it uses different prop names (e.g., `content`/`onUpdate`), adapt the usage above accordingly.

- [ ] **Step 5: Register the block**

In `lib/blocks/register-existing-blocks.tsx`:

```typescript
import RichTextBlock from "@/components/shop/templates/blocks/RichTextBlock"
import { RichTextContentForm } from "@/components/admin/page-builder/forms/adapters/RichTextContentForm"

// In the `existing` array:
  {
    type: "RICH_TEXT",
    label: "Texto con formato",
    icon: "Type",
    emoji: "📝",
    description: "Texto libre con formato (títulos, negritas, listas, enlaces)",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.RICH_TEXT,
    renderer: RichTextBlock as any,
    contentForm: RichTextContentForm as any,
  },
```

- [ ] **Step 6: Update `LandingBlockRenderer.tsx` switch**

```tsx
import RichTextBlock from "./RichTextBlock";

// In the switch:
case "RICH_TEXT":
  inner = <RichTextBlock content={c} />;
  break;
```

- [ ] **Step 7: Smoke test manually**

Add a RICH_TEXT block. Edit text, format with bold/italic/heading, add a link. Save and verify storefront renders formatted HTML.

- [ ] **Step 8: Commit**

```bash
git add components/shop/templates/blocks/RichTextBlock.tsx components/admin/page-builder/forms/adapters/RichTextContentForm.tsx lib/blocks/register-existing-blocks.tsx components/shop/templates/blocks/LandingBlockRenderer.tsx package.json package-lock.json
git commit -m "feat(blocks): add RICH_TEXT block with DOMPurify sanitization"
```

---

## Task 15: Build `FAQ` block (with JSON-LD SEO schema)

**Files:**
- Create: `components/shop/templates/blocks/FaqBlock.tsx`
- Create: `components/admin/page-builder/forms/adapters/FaqContentForm.tsx`
- Modify: `lib/blocks/register-existing-blocks.tsx`
- Modify: `components/shop/templates/blocks/LandingBlockRenderer.tsx`

- [ ] **Step 1: Create the renderer**

Create `components/shop/templates/blocks/FaqBlock.tsx`:

```typescript
"use client";

import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqContent {
  title?: string;
  items: FaqItem[];
  allowMultipleOpen?: boolean;
  defaultOpenFirst?: boolean;
}

interface FaqBlockProps {
  content: FaqContent | unknown;
}

export default function FaqBlock({ content: rawContent }: FaqBlockProps) {
  const content = readContent<FaqContent>(rawContent, "FAQ");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const items = content.items ?? [];
  if (items.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: stripHtml(item.answer),
      },
    })),
  };

  const defaultValue = content.defaultOpenFirst && items[0] ? [items[0].id] : [];

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 max-w-3xl">
        {content.title && (
          <h2 className="text-2xl @md:text-3xl font-bold mb-6 text-center">{content.title}</h2>
        )}
        <Accordion
          type={content.allowMultipleOpen ? "multiple" : "single"}
          collapsible={!content.allowMultipleOpen}
          defaultValue={content.allowMultipleOpen ? defaultValue : (defaultValue[0] ?? undefined) as any}
        >
          {items.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
              <AccordionContent>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(item.answer ?? "", {
                      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "a", "ul", "ol", "li"],
                      ALLOWED_ATTR: ["href", "target", "rel"],
                    }),
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
```

- [ ] **Step 2: Create the content form adapter**

Create `components/admin/page-builder/forms/adapters/FaqContentForm.tsx`:

```typescript
"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { BlockContentV2 } from "@/lib/blocks/types"

const RichTextEditor = dynamic(
  () => import("@/components/admin/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-20 animate-pulse bg-muted rounded" /> }
)

interface FaqItem {
  id: string
  question: string
  answer: string
}

interface Data {
  title?: string
  items: FaqItem[]
  allowMultipleOpen?: boolean
  defaultOpenFirst?: boolean
}

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

export function FaqContentForm({ content, onChange }: Props) {
  const data = content.data as unknown as Data
  const patch = (delta: Partial<Data>) => {
    onChange({ ...content, data: { ...data, ...delta } as unknown as Record<string, unknown> })
  }

  const updateItem = (id: string, delta: Partial<FaqItem>) => {
    patch({ items: data.items.map((i) => (i.id === id ? { ...i, ...delta } : i)) })
  }

  const addItem = () => {
    patch({
      items: [
        ...(data.items ?? []),
        { id: crypto.randomUUID(), question: "Nueva pregunta", answer: "<p>Respuesta</p>" },
      ],
    })
  }

  const removeItem = (id: string) => {
    patch({ items: data.items.filter((i) => i.id !== id) })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Título (opcional)</Label>
        <Input
          value={data.title ?? ""}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Preguntas frecuentes"
          className="mt-1 text-sm"
        />
      </div>

      <div className="flex items-center gap-2 py-2">
        <Switch
          checked={Boolean(data.allowMultipleOpen)}
          onCheckedChange={(v) => patch({ allowMultipleOpen: v })}
        />
        <Label className="text-xs">Permitir varias preguntas abiertas a la vez</Label>
      </div>

      <div className="flex items-center gap-2 py-2">
        <Switch
          checked={Boolean(data.defaultOpenFirst)}
          onCheckedChange={(v) => patch({ defaultOpenFirst: v })}
        />
        <Label className="text-xs">Abrir la primera pregunta por defecto</Label>
      </div>

      <div className="pt-2 border-t">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">Preguntas ({data.items?.length ?? 0})</Label>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-3 w-3 mr-1" />Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {data.items?.map((item) => (
            <FaqItemEditor
              key={item.id}
              item={item}
              onUpdate={(delta) => updateItem(item.id, delta)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function FaqItemEditor({
  item,
  onUpdate,
  onRemove,
}: {
  item: FaqItem
  onUpdate: (delta: Partial<FaqItem>) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-md p-2 space-y-2">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={item.question}
          onChange={(e) => onUpdate({ question: e.target.value })}
          placeholder="¿Pregunta...?"
          className="h-7 text-sm flex-1"
        />
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen((p) => !p)}>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {open && (
        <div className="pt-2 border-t">
          <Label className="text-[10px]">Respuesta</Label>
          <RichTextEditor value={item.answer} onChange={(html: string) => onUpdate({ answer: html })} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Register and wire**

In `lib/blocks/register-existing-blocks.tsx`:

```typescript
import FaqBlock from "@/components/shop/templates/blocks/FaqBlock"
import { FaqContentForm } from "@/components/admin/page-builder/forms/adapters/FaqContentForm"

// In `existing` array:
  {
    type: "FAQ",
    label: "Preguntas frecuentes",
    icon: "HelpCircle",
    emoji: "❓",
    description: "Acordeón de preguntas y respuestas con SEO structured data",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.FAQ,
    renderer: FaqBlock as any,
    contentForm: FaqContentForm as any,
  },
```

In `LandingBlockRenderer.tsx`:

```tsx
import FaqBlock from "./FaqBlock";

// in switch:
case "FAQ":
  inner = <FaqBlock content={c} />;
  break;
```

- [ ] **Step 4: Smoke test**

Add FAQ block. Edit a question's answer. Confirm accordion opens/closes in canvas. In the real storefront, open browser DevTools → Elements → look for `<script type="application/ld+json">` containing `FAQPage` schema.

- [ ] **Step 5: Commit**

```bash
git add components/shop/templates/blocks/FaqBlock.tsx components/admin/page-builder/forms/adapters/FaqContentForm.tsx lib/blocks/register-existing-blocks.tsx components/shop/templates/blocks/LandingBlockRenderer.tsx
git commit -m "feat(blocks): add FAQ block with accordion + JSON-LD FAQPage schema"
```

---

## Task 16: Build `IMAGE_TEXT` block

**Files:**
- Create: `components/shop/templates/blocks/ImageTextBlock.tsx`
- Create: `components/admin/page-builder/forms/adapters/ImageTextContentForm.tsx`
- Modify: `lib/blocks/register-existing-blocks.tsx`
- Modify: `components/shop/templates/blocks/LandingBlockRenderer.tsx`

- [ ] **Step 1: Create the renderer**

Create `components/shop/templates/blocks/ImageTextBlock.tsx`:

```typescript
"use client";

import Image from "next/image";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";
import type { BlockContentV2 } from "@/lib/blocks/types";

interface ImageTextData {
  title?: string;
  description: string;
  imagePosition: "left" | "right";
  imageAlt: string;
  ctaText?: string;
  ctaUrl?: string;
  ratioImageToText?: "40-60" | "50-50" | "60-40";
}

interface ImageTextBlockProps {
  content: ImageTextData | unknown;
  onCtaClick?: () => void;
}

const RATIO_CLASS = {
  "40-60": "grid-cols-1 @md:grid-cols-[2fr_3fr]",
  "50-50": "grid-cols-1 @md:grid-cols-2",
  "60-40": "grid-cols-1 @md:grid-cols-[3fr_2fr]",
} as const;

export default function ImageTextBlock({ content: rawContent, onCtaClick }: ImageTextBlockProps) {
  const data = readContent<ImageTextData>(rawContent, "IMAGE_TEXT");
  const { style: blockStyle, media } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  // Pick image per device via Next.js responsive image — the component only
  // renders ONE image, so we pick desktop by default. The storefront respects
  // device overrides via the v2 resolver at the block-renderer entry.
  const image = media?.image as { desktop?: string; mobile?: string } | undefined;
  const imageUrl = image?.desktop ?? image?.mobile;

  const ratio = data.ratioImageToText ?? "50-50";
  const position = data.imagePosition ?? "left";

  const sanitized = DOMPurify.sanitize(data.description ?? "", {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "a", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        <div className={cn("grid gap-6 @md:gap-10 items-center", RATIO_CLASS[ratio])}>
          {/* Image column */}
          <div className={cn("relative aspect-video w-full rounded-2xl overflow-hidden", position === "right" && "@md:order-2")}>
            {imageUrl ? (
              <Image src={imageUrl} alt={data.imageAlt ?? ""} fill className="object-cover" unoptimized />
            ) : (
              <div className="absolute inset-0 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                Sin imagen
              </div>
            )}
          </div>

          {/* Text column */}
          <div className={cn(position === "right" && "@md:order-1")}>
            {data.title && <h2 className="text-2xl @md:text-3xl font-bold mb-3">{data.title}</h2>}
            <div
              className="prose prose-sm @md:prose-base max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
            {data.ctaText && (
              <div className="mt-6">
                {data.ctaUrl ? (
                  <Button asChild>
                    <a href={data.ctaUrl} target="_blank" rel="noopener noreferrer">{data.ctaText}</a>
                  </Button>
                ) : (
                  <Button onClick={onCtaClick}>{data.ctaText}</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create the content form adapter**

Create `components/admin/page-builder/forms/adapters/ImageTextContentForm.tsx`:

```typescript
"use client"

import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageControl } from "../../RightSidebar/controls/ImageControl"
import type { BlockContentV2 } from "@/lib/blocks/types"

const RichTextEditor = dynamic(
  () => import("@/components/admin/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-24 animate-pulse bg-muted rounded" /> }
)

interface Data {
  title?: string
  description: string
  imagePosition: "left" | "right"
  imageAlt: string
  ctaText?: string
  ctaUrl?: string
  ratioImageToText?: "40-60" | "50-50" | "60-40"
}

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

export function ImageTextContentForm({ content, onChange }: Props) {
  const data = content.data as unknown as Data
  const patch = (delta: Partial<Data>) =>
    onChange({ ...content, data: { ...data, ...delta } as unknown as Record<string, unknown> })

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Título</Label>
        <Input
          value={data.title ?? ""}
          onChange={(e) => patch({ title: e.target.value })}
          className="mt-1 text-sm"
        />
      </div>

      <div>
        <Label className="text-xs">Descripción</Label>
        <div className="mt-1">
          <RichTextEditor value={data.description ?? ""} onChange={(html: string) => patch({ description: html })} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Posición de la imagen (en desktop)</Label>
        <Select value={data.imagePosition ?? "left"} onValueChange={(v) => patch({ imagePosition: v as "left" | "right" })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Izquierda</SelectItem>
            <SelectItem value="right">Derecha</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground mt-1">En mobile siempre aparece arriba del texto.</p>
      </div>

      <div>
        <Label className="text-xs">Proporción imagen/texto</Label>
        <Select value={data.ratioImageToText ?? "50-50"} onValueChange={(v) => patch({ ratioImageToText: v as Data["ratioImageToText"] })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="40-60">40 / 60</SelectItem>
            <SelectItem value="50-50">50 / 50</SelectItem>
            <SelectItem value="60-40">60 / 40</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Texto alternativo de la imagen (accesibilidad)</Label>
        <Input
          value={data.imageAlt ?? ""}
          onChange={(e) => patch({ imageAlt: e.target.value })}
          placeholder="Descripción breve para lectores de pantalla"
          className="mt-1 text-sm"
        />
      </div>

      <ImageControl
        label="Imagen"
        value={content.media?.image}
        onChange={(v) => onChange({ ...content, media: { ...content.media, image: v } })}
      />

      <div>
        <Label className="text-xs">Texto del botón CTA (opcional)</Label>
        <Input
          value={data.ctaText ?? ""}
          onChange={(e) => patch({ ctaText: e.target.value })}
          className="mt-1 text-sm"
        />
      </div>

      <div>
        <Label className="text-xs">URL del CTA (opcional — si vacío, usa el CTA principal)</Label>
        <Input
          value={data.ctaUrl ?? ""}
          onChange={(e) => patch({ ctaUrl: e.target.value })}
          placeholder="https://…"
          className="mt-1 text-sm"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Register and wire**

In `lib/blocks/register-existing-blocks.tsx`:

```typescript
import ImageTextBlock from "@/components/shop/templates/blocks/ImageTextBlock"
import { ImageTextContentForm } from "@/components/admin/page-builder/forms/adapters/ImageTextContentForm"

// In `existing` array:
  {
    type: "IMAGE_TEXT",
    label: "Imagen + Texto",
    icon: "Image",
    emoji: "🖼️",
    description: "Imagen y texto lado a lado (o apilados en mobile)",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.IMAGE_TEXT,
    renderer: ImageTextBlock as any,
    contentForm: ImageTextContentForm as any,
  },
```

In `LandingBlockRenderer.tsx`:

```tsx
import ImageTextBlock from "./ImageTextBlock";

// in switch:
case "IMAGE_TEXT":
  inner = <ImageTextBlock content={c} onCtaClick={onCtaClick} />;
  break;
```

- [ ] **Step 4: Smoke test**

Add IMAGE_TEXT block. Upload desktop + mobile image, edit text, toggle position left/right, change ratio. Verify canvas matches storefront.

- [ ] **Step 5: Commit**

```bash
git add components/shop/templates/blocks/ImageTextBlock.tsx components/admin/page-builder/forms/adapters/ImageTextContentForm.tsx lib/blocks/register-existing-blocks.tsx components/shop/templates/blocks/LandingBlockRenderer.tsx
git commit -m "feat(blocks): add IMAGE_TEXT block with side-by-side desktop layout"
```

---

## Task 17: Build `RELATED_PRODUCTS` block + rename registry file

**Why last:** This block is the most complex (server actions for product search + auto-filter, integration with the product context). Also, after this task, the registry file is renamed because it now registers all 12 blocks — the old "existing" name is misleading.

**Files:**
- Create: `actions/related-products.ts`
- Create: `components/shop/templates/blocks/RelatedProductsBlock.tsx`
- Create: `components/admin/page-builder/forms/adapters/RelatedProductsContentForm.tsx`
- Rename: `lib/blocks/register-existing-blocks.tsx` → `lib/blocks/register-blocks.tsx`
- Modify: `components/admin/page-builder/PageBuilder.tsx` (import path)
- Modify: `components/shop/templates/blocks/LandingBlockRenderer.tsx`
- Modify: `components/admin/page-builder/types.ts` (expose BuilderContext for renderer)

- [ ] **Step 1: Create the server action**

Create `actions/related-products.ts`:

```typescript
"use server"

import { prisma } from "@/lib/db"

export interface RelatedProductCard {
  id: string
  slug: string
  name: string
  price: number
  compareAtPrice: number | null
  mainImage: string | null
}

interface RelatedProductsQuery {
  mode: "manual" | "auto"
  productIds?: string[]
  source?: "same-category" | "same-tags" | "best-sellers" | "recently-added"
  currentProductId?: string
  excludeCurrentProduct?: boolean
  limit?: number
}

function serialize(p: {
  id: string
  slug: string
  name: string
  basePrice: unknown
  compareAtPrice: unknown
  images: unknown
}): RelatedProductCard {
  const images = (p.images as Array<{ url: string }> | null) ?? []
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: Number(p.basePrice ?? 0),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    mainImage: images[0]?.url ?? null,
  }
}

export async function getRelatedProducts(q: RelatedProductsQuery): Promise<RelatedProductCard[]> {
  const limit = Math.min(Math.max(q.limit ?? 4, 1), 12)

  if (q.mode === "manual") {
    if (!q.productIds || q.productIds.length === 0) return []
    const rows = await prisma.product.findMany({
      where: { id: { in: q.productIds }, active: true },
      select: { id: true, slug: true, name: true, basePrice: true, compareAtPrice: true, images: true },
      take: limit,
    })
    // Preserve the order the admin specified
    const byId = new Map(rows.map((r) => [r.id, r]))
    return q.productIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((r) => serialize(r!))
  }

  // Auto mode
  const source = q.source ?? "same-category"
  const excludeIds = q.excludeCurrentProduct && q.currentProductId ? [q.currentProductId] : []

  switch (source) {
    case "same-category":
    case "same-tags": {
      if (!q.currentProductId) return []
      const current = await prisma.product.findUnique({
        where: { id: q.currentProductId },
        include: { categories: { select: { categoryId: true } } },
      })
      const categoryIds = current?.categories.map((c) => c.categoryId) ?? []
      if (categoryIds.length === 0) return []

      const whereClause =
        source === "same-tags"
          ? {
              // Stricter: share ALL categories
              AND: categoryIds.map((cid) => ({ categories: { some: { categoryId: cid } } })),
              id: { notIn: excludeIds },
              active: true,
            }
          : {
              categories: { some: { categoryId: { in: categoryIds } } },
              id: { notIn: excludeIds },
              active: true,
            }

      const rows = await prisma.product.findMany({
        where: whereClause,
        select: { id: true, slug: true, name: true, basePrice: true, compareAtPrice: true, images: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
      return rows.map(serialize)
    }

    case "best-sellers": {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const grouped = await prisma.orderItem.groupBy({
        by: ["productId"],
        where: { createdAt: { gte: ninetyDaysAgo }, productId: { notIn: excludeIds } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: limit,
      })
      const ids = grouped.map((g) => g.productId).filter(Boolean) as string[]
      if (ids.length === 0) return []
      const rows = await prisma.product.findMany({
        where: { id: { in: ids }, active: true },
        select: { id: true, slug: true, name: true, basePrice: true, compareAtPrice: true, images: true },
      })
      const byId = new Map(rows.map((r) => [r.id, r]))
      return ids.map((id) => byId.get(id)).filter(Boolean).map((r) => serialize(r!))
    }

    case "recently-added": {
      const rows = await prisma.product.findMany({
        where: { id: { notIn: excludeIds }, active: true },
        select: { id: true, slug: true, name: true, basePrice: true, compareAtPrice: true, images: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
      return rows.map(serialize)
    }
  }
}

export async function searchProductsForPicker(query: string, limit = 20): Promise<RelatedProductCard[]> {
  const q = query.trim()
  const rows = await prisma.product.findMany({
    where: q
      ? { active: true, OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
      : { active: true },
    select: { id: true, slug: true, name: true, basePrice: true, compareAtPrice: true, images: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return rows.map(serialize)
}
```

Note: this action reads product fields (`images`, `basePrice`, `compareAtPrice`). Inspect `prisma/schema.prisma` — if the `images` field is a different name or JSON structure, adjust `serialize()` accordingly.

- [ ] **Step 2: Create the renderer**

Create `components/shop/templates/blocks/RelatedProductsBlock.tsx`:

```typescript
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";
import { getRelatedProducts } from "@/actions/related-products";
import type { BuilderContext } from "@/components/admin/page-builder/types";

interface Data {
  title?: string;
  mode: "manual" | "auto";
  manualProductIds?: string[];
  autoFilters?: {
    source: "same-category" | "same-tags" | "best-sellers" | "recently-added";
    limit: number;
    excludeCurrentProduct: boolean;
  };
  displayType: "carousel" | "grid";
  columnsDesktop: 3 | 4 | 5;
  columnsMobile: 1 | 2;
  showPrice: boolean;
  showRating: boolean;
  showAddToCart: boolean;
}

interface RelatedProductsBlockProps {
  content: Data | unknown;
  context?: BuilderContext;
  /** When rendered in the canvas editor, there is no real product context —
   * the server action would return nothing. The editor passes `editorMode` so
   * the block can render sensible placeholders instead of an empty grid. */
  editorMode?: boolean;
}

const DESKTOP_COLS = { 3: "@3xl:grid-cols-3", 4: "@3xl:grid-cols-4", 5: "@3xl:grid-cols-5" } as const;
const MOBILE_COLS = { 1: "grid-cols-1", 2: "grid-cols-2" } as const;

export default async function RelatedProductsBlock({ content: rawContent, context, editorMode }: RelatedProductsBlockProps) {
  const data = readContent<Data>(rawContent, "RELATED_PRODUCTS");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const productId = context?.type === "product" ? context.product.id : undefined;

  let products = editorMode
    ? []
    : await getRelatedProducts({
        mode: data.mode ?? "auto",
        productIds: data.manualProductIds,
        source: data.autoFilters?.source,
        currentProductId: productId,
        excludeCurrentProduct: data.autoFilters?.excludeCurrentProduct ?? true,
        limit: data.autoFilters?.limit ?? 4,
      });

  if (editorMode) {
    // Render 4 placeholder cards so the editor preview shows layout
    products = Array.from({ length: Math.min(data.autoFilters?.limit ?? 4, 8) }, (_, i) => ({
      id: `placeholder-${i}`,
      slug: "#",
      name: `Producto relacionado ${i + 1}`,
      price: 0,
      compareAtPrice: null,
      mainImage: null,
    }));
  }

  if (products.length === 0) return null;

  const gridClass = cn(
    "grid gap-4 @md:gap-6",
    MOBILE_COLS[data.columnsMobile ?? 2],
    DESKTOP_COLS[data.columnsDesktop ?? 4],
  );

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        {(data.title ?? "También te puede gustar") && (
          <h2 className="text-2xl @md:text-3xl font-bold mb-6 text-center">
            {data.title ?? "También te puede gustar"}
          </h2>
        )}
        <div className={gridClass}>
          {products.map((p) => (
            <Link key={p.id} href={`/productos/${p.slug}`} className="group block">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                {p.mainImage ? (
                  <Image src={p.mainImage} alt={p.name} width={400} height={400} className="object-cover w-full h-full group-hover:scale-105 transition-transform" unoptimized />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-[11px] text-muted-foreground">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium line-clamp-2">{p.name}</div>
                {data.showPrice !== false && (
                  <div className="mt-1 text-sm">
                    <span className="font-semibold">S/ {p.price.toFixed(2)}</span>
                    {p.compareAtPrice && p.compareAtPrice > p.price && (
                      <span className="ml-2 text-xs line-through text-muted-foreground">S/ {p.compareAtPrice.toFixed(2)}</span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Note: this is an async server component. It works on the storefront (which is server-rendered). The editor canvas is client-side, so we add a prop `editorMode` that returns placeholders; in the canvas path the renderer is passed `editorMode={true}` and skips the `await`.

Client components can't render async components. The canvas's `BlockRenderer` is a client component, so we must gate this: if the block is rendered via the canvas, wrap in a client-mode version. The registry entry passes `editorMode` at render time.

To keep the registry's renderer signature uniform, we adapt: the registry's renderer is a thin client wrapper that calls a dedicated client-only version. Add a client wrapper:

```typescript
// components/shop/templates/blocks/RelatedProductsBlockEditorWrapper.tsx
"use client"

import type { BlockContentV2 } from "@/lib/blocks/types"

interface Props {
  content: BlockContentV2
}

// Lightweight client-side placeholder used in the editor canvas where the
// storefront's server component cannot run. The real server component is
// imported directly in LandingBlockRenderer for the storefront path.
export default function RelatedProductsBlockEditorWrapper({ content }: Props) {
  const data = content.data as Record<string, unknown>
  const limit = (data?.autoFilters as { limit?: number } | undefined)?.limit ?? 4
  const cols = (data?.columnsDesktop as number | undefined) ?? 4
  const mobileCols = (data?.columnsMobile as number | undefined) ?? 2

  return (
    <section className="landing-section py-8 @md:py-14 @container">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl @md:text-3xl font-bold mb-6 text-center">
          {(data?.title as string) ?? "También te puede gustar"}
        </h2>
        <div className={`grid gap-4 @md:gap-6 grid-cols-${mobileCols} @3xl:grid-cols-${cols}`}>
          {Array.from({ length: Math.min(limit, 8) }, (_, i) => (
            <div key={i} className="aspect-square w-full rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
              Producto {i + 1}
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-4">
          Los productos reales se cargan en la tienda.
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create the content form adapter**

Create `components/admin/page-builder/forms/adapters/RelatedProductsContentForm.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { searchProductsForPicker, type RelatedProductCard } from "@/actions/related-products"
import type { BlockContentV2 } from "@/lib/blocks/types"
import { toast } from "sonner"

interface Data {
  title?: string
  mode: "manual" | "auto"
  manualProductIds?: string[]
  autoFilters?: {
    source: "same-category" | "same-tags" | "best-sellers" | "recently-added"
    limit: number
    excludeCurrentProduct: boolean
  }
  displayType: "carousel" | "grid"
  columnsDesktop: 3 | 4 | 5
  columnsMobile: 1 | 2
  showPrice: boolean
  showRating: boolean
  showAddToCart: boolean
}

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

export function RelatedProductsContentForm({ content, onChange }: Props) {
  const data = content.data as unknown as Data
  const patch = (delta: Partial<Data>) =>
    onChange({ ...content, data: { ...data, ...delta } as unknown as Record<string, unknown> })

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Título</Label>
        <Input
          value={data.title ?? ""}
          onChange={(e) => patch({ title: e.target.value })}
          className="mt-1 text-sm"
        />
      </div>

      <div>
        <Label className="text-xs">Modo</Label>
        <Select value={data.mode ?? "auto"} onValueChange={(v) => patch({ mode: v as Data["mode"] })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automático (filtros)</SelectItem>
            <SelectItem value="manual">Manual (elegir productos)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.mode === "auto" ? (
        <>
          <div>
            <Label className="text-xs">Fuente</Label>
            <Select
              value={data.autoFilters?.source ?? "same-category"}
              onValueChange={(v) =>
                patch({ autoFilters: { ...(data.autoFilters ?? { limit: 4, excludeCurrentProduct: true }), source: v as any } })
              }
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="same-category">Misma categoría</SelectItem>
                <SelectItem value="same-tags">Comparten todas las categorías</SelectItem>
                <SelectItem value="best-sellers">Más vendidos (90 días)</SelectItem>
                <SelectItem value="recently-added">Más recientes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Cantidad (1-12)</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={data.autoFilters?.limit ?? 4}
              onChange={(e) =>
                patch({
                  autoFilters: {
                    ...(data.autoFilters ?? { source: "same-category", excludeCurrentProduct: true }),
                    limit: Math.min(12, Math.max(1, Number(e.target.value) || 4)),
                  },
                })
              }
              className="mt-1 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 py-2">
            <Switch
              checked={data.autoFilters?.excludeCurrentProduct ?? true}
              onCheckedChange={(v) =>
                patch({
                  autoFilters: {
                    ...(data.autoFilters ?? { source: "same-category", limit: 4 }),
                    excludeCurrentProduct: v,
                  },
                })
              }
            />
            <Label className="text-xs">Excluir el producto actual</Label>
          </div>
        </>
      ) : (
        <ManualProductPicker
          selectedIds={data.manualProductIds ?? []}
          onChange={(ids) => patch({ manualProductIds: ids })}
        />
      )}

      <div className="pt-2 border-t">
        <Label className="text-xs font-semibold">Display</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label className="text-[10px]">Columnas desktop</Label>
            <Select value={String(data.columnsDesktop ?? 4)} onValueChange={(v) => patch({ columnsDesktop: Number(v) as 3 | 4 | 5 })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Columnas mobile</Label>
            <Select value={String(data.columnsMobile ?? 2)} onValueChange={(v) => patch({ columnsMobile: Number(v) as 1 | 2 })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 py-1">
        <Switch checked={data.showPrice ?? true} onCheckedChange={(v) => patch({ showPrice: v })} />
        <Label className="text-xs">Mostrar precio</Label>
      </div>
    </div>
  )
}

function ManualProductPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<RelatedProductCard[]>([])
  const [selected, setSelected] = useState<RelatedProductCard[]>([])
  const [loading, setLoading] = useState(false)

  // Load selected products details on mount and when selectedIds change externally
  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelected([])
      return
    }
    searchProductsForPicker("", 100)
      .then((rows) => setSelected(rows.filter((r) => selectedIds.includes(r.id))))
      .catch(() => {})
  }, [selectedIds])

  const runSearch = async (q: string) => {
    setLoading(true)
    try {
      const rows = await searchProductsForPicker(q, 20)
      setResults(rows)
    } catch {
      toast.error("Error al buscar productos")
    } finally {
      setLoading(false)
    }
  }

  const add = (p: RelatedProductCard) => {
    if (selectedIds.includes(p.id)) return
    onChange([...selectedIds, p.id])
  }

  const remove = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id))
  }

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">Buscar productos</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
            placeholder="Nombre o slug"
            className="text-sm h-8"
          />
          <Button type="button" size="sm" onClick={() => runSearch(query)} disabled={loading}>
            <Search className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="max-h-40 overflow-auto border rounded-md p-1">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => add(r)}
              className="w-full text-left px-2 py-1 text-xs hover:bg-muted rounded flex items-center gap-2"
              disabled={selectedIds.includes(r.id)}
            >
              <span className="flex-1 truncate">{r.name}</span>
              <span className="text-muted-foreground">{selectedIds.includes(r.id) ? "Agregado" : "+"}</span>
            </button>
          ))}
        </div>
      )}

      <div>
        <Label className="text-[10px] text-muted-foreground">
          Seleccionados ({selected.length})
        </Label>
        <div className="space-y-1 mt-1">
          {selected.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs border rounded-md p-1.5">
              <span className="flex-1 truncate">{p.name}</span>
              <button type="button" onClick={() => remove(p.id)} className="text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rename the registry file and add RELATED_PRODUCTS**

Rename `lib/blocks/register-existing-blocks.tsx` to `lib/blocks/register-blocks.tsx`:

```bash
git mv lib/blocks/register-existing-blocks.tsx lib/blocks/register-blocks.tsx
```

In the renamed file, update the exported function name from `registerExistingBlocks` to `registerBlocks` AND add the RELATED_PRODUCTS entry:

```typescript
import RelatedProductsBlockEditorWrapper from "@/components/shop/templates/blocks/RelatedProductsBlockEditorWrapper"
import { RelatedProductsContentForm } from "@/components/admin/page-builder/forms/adapters/RelatedProductsContentForm"

// In `existing` array:
  {
    type: "RELATED_PRODUCTS",
    label: "Productos relacionados",
    icon: "Package",
    emoji: "🛒",
    description: "Cross-sell y up-sell basado en categorías o manual",
    scope: "product",  // ← only available with product context
    category: "commerce",
    defaultContent: DEFAULT_CONTENT_V2.RELATED_PRODUCTS,
    renderer: RelatedProductsBlockEditorWrapper as any,  // editor placeholder
    contentForm: RelatedProductsContentForm as any,
  },

// At the bottom, rename exported function:
export function registerBlocks(): void {
  if (registered) return
  existing.forEach(registerBlock)
  registered = true
}
```

Update the import in `components/admin/page-builder/PageBuilder.tsx`:

```typescript
// Change this line:
import { registerExistingBlocks } from "@/lib/blocks/register-existing-blocks"
// To:
import { registerBlocks } from "@/lib/blocks/register-blocks"

// And the call inside useEffect:
registerBlocks()
```

- [ ] **Step 5: Update `LandingBlockRenderer.tsx` to handle RELATED_PRODUCTS**

Note: because `RelatedProductsBlock` is an async server component, `LandingBlockRenderer` must also be a server component (no `"use client"` pragma). Check the current file — it likely doesn't have `"use client"` because it's pure rendering. Good.

Add the import:

```tsx
import RelatedProductsBlock from "./RelatedProductsBlock";
```

Add a prop for the product context since `RELATED_PRODUCTS` needs it:

```tsx
interface LandingBlockRendererProps {
  blocks: LandingBlock[];
  onCtaClick?: () => void;
  productContext?: { id: string; slug: string; name: string };  // NEW
}
```

In the switch:

```tsx
case "RELATED_PRODUCTS":
  inner = (
    <RelatedProductsBlock
      content={c}
      context={productContext ? { type: "product", product: productContext } : undefined}
    />
  );
  break;
```

Then update `components/shop/templates/ProductLandingView.tsx` to pass the product:

```tsx
<LandingBlockRenderer
  blocks={...}
  onCtaClick={...}
  productContext={{ id: product.id, slug: product.slug, name: product.name }}
/>
```

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expect some errors about `BuilderContext` import in `RelatedProductsBlock.tsx` from a client component — move the type to a shared types file if needed, OR inline the type in the server component so it doesn't import from `@/components/admin/...`.

If errors appear, refactor: define the `{ type: "product", product }` shape inline in `RelatedProductsBlock.tsx` rather than importing `BuilderContext`:

```typescript
interface RelatedProductsBlockProps {
  content: Data | unknown;
  context?: { type: "product"; product: { id: string; slug: string; name: string } };
  editorMode?: boolean;
}
```

- [ ] **Step 7: Smoke test**

Add a RELATED_PRODUCTS block. In Manual mode, search for a product and pick it. In Auto mode, try each source (same-category, best-sellers, recently-added). Verify:
- Canvas: shows placeholder grid matching columns config
- Real storefront: `/productos/<slug>` shows actual related products

- [ ] **Step 8: Commit**

```bash
git add actions/related-products.ts components/shop/templates/blocks/RelatedProductsBlock.tsx components/shop/templates/blocks/RelatedProductsBlockEditorWrapper.tsx components/admin/page-builder/forms/adapters/RelatedProductsContentForm.tsx lib/blocks/register-blocks.tsx components/admin/page-builder/PageBuilder.tsx components/shop/templates/blocks/LandingBlockRenderer.tsx components/shop/templates/ProductLandingView.tsx
git commit -m "feat(blocks): add RELATED_PRODUCTS block (server action + editor wrapper + product context)"
```

---

## Task 18: Final smoke test and verification

**Files:** none — manual verification only.

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds. Warnings from unrelated code are acceptable.

- [ ] **Step 3: Exercise every block + every style control**

Run `npm run dev` and open the editor:

**For each of the 12 block types** (7 existing + 5 new), perform this checklist:
- Add the block via "+ Agregar"
- Select it and edit at least one content field
- Switch to Estilo tab, try each control (color, padding, alignment, border, shadow, visibility)
- Enable a device override on one field and confirm canvas shows the right value per device toggle
- Switch to Avanzado tab, set an anchor ID, verify the URL contains the anchor at `/productos/<slug>#<anchor>`
- Delete the block

**For RELATED_PRODUCTS specifically:**
- Auto mode: each of the 4 sources works (or returns empty gracefully if DB has no matching data)
- Manual mode: search + pick products → they appear in the storefront

**For FAQ specifically:**
- View DevTools Network on `/productos/<slug>` — response HTML must contain `<script type="application/ld+json">...FAQPage...</script>`

**For IMAGE_TEXT and HERO specifically:**
- Upload a desktop-only image and confirm the canvas mobile view falls back to desktop image correctly
- Upload distinct desktop + mobile images and confirm each device sees its own

- [ ] **Step 4: Verify storefront rendering**

Open `/productos/<slug>` on desktop. Resize browser to narrow width (simulate mobile). Confirm:
- Every block adapts its layout to the container width
- Sticky tickers still stick at top
- Device-visibility rules (mobile-only / desktop-only / hidden) apply correctly

- [ ] **Step 5: No commit for this task**

If any step fails, return to the related task and fix. Only declare Plan 2 complete when all smoke-test steps pass.

---

## What's next (Plan 3 preview)

Plan 3 covers:
- Template library at `/admin/landing-plantillas`
- Sync model with block-level overrides (`sourceTemplateBlockId`, `detached`)
- UI for inherited vs local blocks
- "Guardar y propagar" flow with draft protection
- "Aplicar plantilla" replace behavior (Shopify-style)
- "Desvincular" and "Restaurar al template" actions
- Thumbnail generation

Do not start Plan 3 until Plan 2 smoke-test passes and is merged to master.

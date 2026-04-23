# Page Builder v1 — Plan 1: Foundation + Generic Editor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the foundation (schema migration + bilingual renderers + feature flag) and a fully working generic `PageBuilder` editor with the 7 existing block types ported, behind a `LANDING_BUILDER_V2` flag so production is unaffected until flip.

**Architecture:** Phase 0 extends Prisma schema additively, introduces a new `{ data, style, media }` content shape with backward-compatible readers, and a data migration. Phase 1 introduces a generic `PageBuilder` React component (3-panel layout: left block list / center live canvas / right properties) driven by a Zustand store, wrapping the existing storefront block renderers unchanged. A product-specific wrapper `ProductLandingBuilder` handles Server Action persistence with debounced autosave.

**Tech Stack:** Next.js 15 App Router, Prisma + PostgreSQL, Zustand, `@dnd-kit`, `lucide-react`, shadcn/ui, Tailwind. All already in the project.

**Source spec:** [docs/superpowers/specs/2026-04-23-page-builder-visual-design.md](../specs/2026-04-23-page-builder-visual-design.md)

**Scope covered by this plan:** Phase 0 + Phase 1 from the spec. The 5 new block types, Level 2 styling, per-device overrides, templates, E2E tests, and cleanup are covered in Plans 2, 3, and 4.

**Pre-flight:**

```bash
# Recommended: create a feature branch for this plan
git checkout -b feature/page-builder-v2-plan-1

# Verify tree is clean
git status
```

---

## File Structure (new/modified across all tasks)

**New files:**
```
lib/blocks/
├── types.ts                         # BlockContent, DeviceValue, shared types
├── schemas.ts                       # Zod schemas per block type (content validation)
├── resolve.ts                       # resolveForDevice, resolveContentForDevice helpers
├── defaults.ts                      # Level 2 style defaults + default content per block
├── registry.ts                      # Block registry with metadata, renderer, form, icon, label
└── feature-flag.ts                  # Helper to read LANDING_BUILDER_V2 from Setting

components/admin/page-builder/
├── PageBuilder.tsx                  # Generic root component (context-agnostic)
├── TopBar.tsx                       # Title, device toggle, save indicator, ⋯ menu
├── DeviceToggle.tsx                 # Desktop / Mobile switcher
├── store.ts                         # Zustand builder store
├── types.ts                         # PageBuilderProps, BuilderContext, etc.
├── hooks/
│   ├── useKeyboardShortcuts.ts
│   ├── useUrlSelection.ts
│   └── useBeforeUnload.ts
├── LeftSidebar/
│   ├── LeftSidebar.tsx
│   ├── BlockList.tsx                # Sortable list (dnd-kit)
│   ├── BlockListItem.tsx
│   └── AddBlockPanel.tsx            # Categorized block picker
├── Canvas/
│   ├── Canvas.tsx                   # Scrollable container
│   ├── CanvasFrame.tsx              # Viewport simulator (desktop/mobile frame)
│   ├── BlockRenderer.tsx            # Resolves content for device, uses registry
│   ├── BlockWrapper.tsx             # Outline, hover, select, drag handle integration
│   ├── BlockFloatingToolbar.tsx     # Grip, ↑, ↓, ⋯ overflow menu
│   └── EmptySlot.tsx                # "+ Add block here" between blocks
└── RightSidebar/
    ├── RightSidebar.tsx             # Tabs container (Content/Style/Advanced)
    ├── EmptyState.tsx               # Shown when no block selected
    └── tabs/
        └── ContentTab.tsx           # Delegates to block-specific form via registry

components/admin/
└── ProductLandingBuilder.tsx        # Product-specific wrapper with Server Action persistence

scripts/
└── migrate-landing-blocks-to-v2.ts  # Data migration script (dry-run + --apply)
```

**Modified files:**
```
prisma/schema.prisma                  # Additive: enum values, fields, 2 new models
actions/landing-blocks.ts             # Extend with new Server Actions for bulk autosave
components/shop/templates/blocks/HeroBlock.tsx          # Bilingual reader
components/shop/templates/blocks/BenefitsBlock.tsx      # Bilingual reader
components/shop/templates/blocks/GalleryBlock.tsx       # Bilingual reader
components/shop/templates/blocks/TestimonialsBlock.tsx  # Bilingual reader
components/shop/templates/blocks/VideoBlock.tsx         # Bilingual reader
components/shop/templates/blocks/ColorsBlock.tsx        # Bilingual reader
components/shop/templates/blocks/TickerBlock.tsx        # Bilingual reader
components/shop/templates/blocks/LandingBlockRenderer.tsx  # Route to registry, handle both shapes
components/admin/EditProductForm.tsx  # Conditional render based on flag
lib/types/landing-blocks.ts           # Keep legacy types, add new BlockContent v2
```

---

# PHASE 0 — FOUNDATION (Tasks 1-7, ~2-3 days)

---

## Task 1: Extend Prisma schema with new enum values, fields, and models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new enum values to `LandingBlockType`**

Open `prisma/schema.prisma` and locate the `LandingBlockType` enum (around line 146). Replace it with:

```prisma
enum LandingBlockType {
  HERO
  BENEFITS
  GALLERY
  TESTIMONIALS
  VIDEO
  COLORS
  TICKER
  // v2 additions (Plan 2 will implement renderers/forms; Plan 1 only adds enum values)
  RICH_TEXT
  FAQ
  IMAGE_TEXT
  RELATED_PRODUCTS
  TRUST_BADGES
}
```

- [ ] **Step 2: Add sync fields to `LandingBlock`**

Locate the `LandingBlock` model (around line 126). Add `sourceTemplateBlockId` and `detached` fields and an index:

```prisma
model LandingBlock {
  id                    String           @id @default(cuid())
  productId             String
  product               Product          @relation(fields: [productId], references: [id], onDelete: Cascade)
  type                  LandingBlockType
  position              Int
  content               Json             @default("{}")
  sourceTemplateBlockId String?
  detached              Boolean          @default(false)
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  @@index([productId, position])
  @@index([sourceTemplateBlockId])
}
```

- [ ] **Step 3: Add `landingTemplateId` to `Product`**

In the `Product` model (around line 110), add these two fields (after `landingBlocks`):

```prisma
  landingBlocks    LandingBlock[]
  landingTemplateId String?
  landingTemplate   LandingTemplate? @relation(fields: [landingTemplateId], references: [id], onDelete: SetNull)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
```

- [ ] **Step 4: Add `LandingTemplate` and `TemplateBlock` models**

At the end of the schema file (after the last existing model), append:

```prisma
model LandingTemplate {
  id             String          @id @default(cuid())
  name           String
  description    String?
  category       String?
  thumbnail      String?
  active         Boolean         @default(true)
  createdBy      String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
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
  content    Json             @default("{}")
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  @@index([templateId, position])
}
```

- [ ] **Step 5: Format and validate the schema**

Run:
```bash
npx prisma format
npx prisma validate
```

Expected: both commands succeed with no output errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): extend LandingBlock with sync fields, add LandingTemplate and TemplateBlock models"
```

---

## Task 2: Generate and apply the Prisma migration

**Files:**
- Create: `prisma/migrations/<timestamp>_page_builder_v2/migration.sql` (auto-generated by Prisma)

- [ ] **Step 1: Generate migration**

Run:
```bash
npx prisma migrate dev --name page_builder_v2
```

Expected: Prisma generates `prisma/migrations/<timestamp>_page_builder_v2/migration.sql`, applies it to the dev DB, and regenerates the client. Output ends with `✔ Generated Prisma Client`.

- [ ] **Step 2: Verify the migration file matches expectations**

Open the generated `migration.sql` and confirm it contains:
- `ALTER TYPE "LandingBlockType" ADD VALUE 'RICH_TEXT'` (and the other 4)
- `ALTER TABLE "LandingBlock" ADD COLUMN "sourceTemplateBlockId"` and `"detached"`
- `ALTER TABLE "Product" ADD COLUMN "landingTemplateId"`
- `CREATE TABLE "LandingTemplate"` and `CREATE TABLE "TemplateBlock"`
- `CREATE INDEX` statements for the new indices
- `ALTER TABLE "Product" ADD CONSTRAINT "Product_landingTemplateId_fkey"` with `ON DELETE SET NULL`
- `ALTER TABLE "TemplateBlock" ADD CONSTRAINT "TemplateBlock_templateId_fkey"` with `ON DELETE CASCADE`

If any of these are missing, do NOT proceed — revisit Task 1 step-by-step.

- [ ] **Step 3: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(db): add migration for page builder v2 schema"
```

---

## Task 3: Create v2 content types

**Files:**
- Create: `lib/blocks/types.ts`

- [ ] **Step 1: Create the types file**

Create `lib/blocks/types.ts` with this content:

```typescript
import type { LandingBlockType } from "@prisma/client"

/**
 * A value that may be either a single shared value, or a split value with
 * distinct desktop and mobile overrides. Used for style and media fields.
 */
export type DeviceValue<T> = T | { desktop?: T; mobile?: T }

export type Device = "desktop" | "mobile"

/**
 * The v2 content shape for every block type. Lives inside
 * `LandingBlock.content` and `TemplateBlock.content` as JSON.
 *
 * Three zones:
 *  - data:  shared text/content (never per-device)
 *  - style: visual configuration (some fields may use DeviceValue)
 *  - media: images/videos (always DeviceValue even when single value)
 */
export interface BlockContentV2 {
  data: Record<string, unknown>
  style: BlockStyle
  media: BlockMedia
}

export interface BlockStyle {
  backgroundColor?: DeviceValue<string>
  textColor?: DeviceValue<string>
  paddingY?: DeviceValue<PaddingSize>
  alignment?: DeviceValue<Alignment>
  containerWidth?: DeviceValue<ContainerWidth>
  cornerRadius?: CornerRadius
  border?: BorderStyle
  shadow?: ShadowStyle
  visibility?: Visibility
}

export interface BlockMedia {
  image?: { desktop?: string; mobile?: string }
  bgImage?: { desktop?: string; mobile?: string }
  bgOverlay?: { desktop?: string; mobile?: string }
  // Block-specific media fields can be added here via module augmentation
}

export type PaddingSize = "none" | "sm" | "md" | "lg" | "xl"
export type Alignment = "left" | "center" | "right"
export type ContainerWidth = "narrow" | "normal" | "full"
export type CornerRadius = "none" | "sm" | "md" | "lg"
export type BorderStyle = "none" | "subtle" | "strong"
export type ShadowStyle = "none" | "subtle" | "strong"
export type Visibility = "always" | "mobile-only" | "desktop-only"

/**
 * Block scope — used by the registry to filter which blocks can be added
 * in a given builder context.
 *
 *  - universal: can be added in any context (product, page, template)
 *  - product:   can only be added when BuilderContext is a product
 */
export type BlockScope = "universal" | "product"

export type BlockCategory =
  | "content"
  | "media"
  | "social-proof"
  | "visual"
  | "commerce"

export { type LandingBlockType }

/**
 * Shape of a block instance as held in the Zustand store and passed
 * around the editor. Matches Prisma's LandingBlock row.
 */
export interface BlockInstance {
  id: string
  type: LandingBlockType
  position: number
  content: BlockContentV2
  // Sync metadata (populated in Plan 3; harmless here)
  sourceTemplateBlockId?: string | null
  detached?: boolean
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: no new errors from `lib/blocks/types.ts`. If there are pre-existing errors in the codebase, ensure they are unrelated to this file.

- [ ] **Step 3: Commit**

```bash
git add lib/blocks/types.ts
git commit -m "feat(blocks): add v2 content types and DeviceValue abstraction"
```

---

## Task 4: Create device resolver helpers

**Files:**
- Create: `lib/blocks/resolve.ts`
- Create: `scripts/verify-resolve-for-device.ts`

- [ ] **Step 1: Create `resolve.ts`**

Create `lib/blocks/resolve.ts`:

```typescript
import type { BlockContentV2, BlockStyle, BlockMedia, DeviceValue, Device } from "./types"

/**
 * Resolve a DeviceValue<T> to a concrete T for the given device.
 *
 * Rules:
 *  - If value is null/undefined: return undefined
 *  - If value is a primitive (string, number, boolean): return as-is (shared)
 *  - If value is an object with "desktop" or "mobile" keys: return the
 *    matching device value, falling back to the other if not set.
 *  - Any other object is returned as-is (shared complex value).
 */
export function resolveForDevice<T>(
  value: DeviceValue<T> | undefined,
  device: Device
): T | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value !== "object") return value as T

  const obj = value as { desktop?: T; mobile?: T }
  if ("desktop" in obj || "mobile" in obj) {
    return device === "mobile"
      ? (obj.mobile ?? obj.desktop)
      : (obj.desktop ?? obj.mobile)
  }
  return value as T
}

/**
 * Resolve every DeviceValue field in a full block content to concrete values
 * for the given device. Returns a new BlockContentV2 with the same shape but
 * all fields flattened.
 *
 * `data` is returned as-is (text is always shared).
 */
export function resolveContentForDevice(
  content: BlockContentV2,
  device: Device
): BlockContentV2 {
  return {
    data: content.data,
    style: resolveStyle(content.style, device),
    media: resolveMedia(content.media, device),
  }
}

function resolveStyle(style: BlockStyle, device: Device): BlockStyle {
  return {
    backgroundColor: resolveForDevice(style.backgroundColor, device),
    textColor: resolveForDevice(style.textColor, device),
    paddingY: resolveForDevice(style.paddingY, device),
    alignment: resolveForDevice(style.alignment, device),
    containerWidth: resolveForDevice(style.containerWidth, device),
    cornerRadius: style.cornerRadius,
    border: style.border,
    shadow: style.shadow,
    visibility: style.visibility,
  }
}

function resolveMedia(media: BlockMedia, device: Device): BlockMedia {
  const resolveImagePair = (pair: { desktop?: string; mobile?: string } | undefined) => {
    if (!pair) return undefined
    const v = device === "mobile" ? (pair.mobile ?? pair.desktop) : (pair.desktop ?? pair.mobile)
    return v ? { desktop: v, mobile: v } : undefined
  }
  return {
    image: resolveImagePair(media.image),
    bgImage: resolveImagePair(media.bgImage),
    bgOverlay: resolveImagePair(media.bgOverlay),
  }
}
```

- [ ] **Step 2: Create the verification script**

Create `scripts/verify-resolve-for-device.ts`:

```typescript
import { resolveForDevice, resolveContentForDevice } from "../lib/blocks/resolve"
import type { BlockContentV2 } from "../lib/blocks/types"

let failures = 0
function expect(actual: unknown, expected: unknown, label: string) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  if (pass) {
    console.log(`  ✓ ${label}`)
  } else {
    failures++
    console.error(`  ✗ ${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`)
  }
}

console.log("resolveForDevice:")
expect(resolveForDevice("red", "desktop"), "red", "primitive shared → returns primitive")
expect(resolveForDevice(undefined, "desktop"), undefined, "undefined → undefined")
expect(resolveForDevice({ desktop: "red", mobile: "blue" }, "desktop"), "red", "override desktop")
expect(resolveForDevice({ desktop: "red", mobile: "blue" }, "mobile"), "blue", "override mobile")
expect(resolveForDevice({ desktop: "red" }, "mobile"), "red", "mobile missing → falls back to desktop")
expect(resolveForDevice({ mobile: "blue" }, "desktop"), "blue", "desktop missing → falls back to mobile")

console.log("\nresolveContentForDevice:")
const content: BlockContentV2 = {
  data: { title: "Hello" },
  style: {
    backgroundColor: { desktop: "#fff", mobile: "#eee" },
    paddingY: "md",
    cornerRadius: "sm",
  },
  media: {
    image: { desktop: "a.jpg", mobile: "b.jpg" },
  },
}
const desktopResolved = resolveContentForDevice(content, "desktop")
expect(desktopResolved.data, { title: "Hello" }, "data passes through unchanged")
expect(desktopResolved.style.backgroundColor, "#fff", "style override resolved to desktop")
expect(desktopResolved.style.paddingY, "md", "shared style passes through")
expect(desktopResolved.style.cornerRadius, "sm", "non-device style passes through")
expect(desktopResolved.media.image, { desktop: "a.jpg", mobile: "a.jpg" }, "image resolved to desktop (both slots filled with same)")

const mobileResolved = resolveContentForDevice(content, "mobile")
expect(mobileResolved.style.backgroundColor, "#eee", "style override resolved to mobile")
expect(mobileResolved.media.image, { desktop: "b.jpg", mobile: "b.jpg" }, "image resolved to mobile")

if (failures > 0) {
  console.error(`\n❌ ${failures} assertion(s) failed`)
  process.exit(1)
}
console.log("\n✅ All assertions passed")
```

- [ ] **Step 3: Run the verification script**

Run:
```bash
npx tsx scripts/verify-resolve-for-device.ts
```

Expected output ends with `✅ All assertions passed` and exit code 0.

- [ ] **Step 4: Commit**

```bash
git add lib/blocks/resolve.ts scripts/verify-resolve-for-device.ts
git commit -m "feat(blocks): add resolveForDevice and resolveContentForDevice helpers with verification"
```

---

## Task 5: Define Level 2 style defaults and block default content

**Files:**
- Create: `lib/blocks/defaults.ts`

- [ ] **Step 1: Create the defaults file**

Create `lib/blocks/defaults.ts`:

```typescript
import type { BlockContentV2, BlockStyle, LandingBlockType } from "./types"

/**
 * Default Level 2 style values applied to every new block.
 * Admins can override any of these in the Style tab of the right panel.
 */
export const DEFAULT_STYLE: BlockStyle = {
  backgroundColor: undefined,          // transparent / theme default
  textColor: undefined,
  paddingY: "md",
  alignment: "center",
  containerWidth: "normal",
  cornerRadius: "none",
  border: "none",
  shadow: "none",
  visibility: "always",
}

/**
 * Default content shape for each block type. Used when the admin clicks
 * "Add block" to create a new instance. Content is v2 shape with
 * `data`, `style`, and `media` zones.
 *
 * Note: block types added in Plan 2 (RICH_TEXT, FAQ, IMAGE_TEXT,
 * RELATED_PRODUCTS, TRUST_BADGES) are defined there. Plan 1 only covers
 * the 7 existing types.
 */
export const DEFAULT_CONTENT_V2: Record<LandingBlockType, BlockContentV2> = {
  HERO: {
    data: {
      title: "Título del hero",
      subtitle: "",
      ctaText: "Comprar ahora",
    },
    style: { ...DEFAULT_STYLE, paddingY: "xl" },
    media: {
      bgImage: { desktop: "", mobile: "" },
      bgOverlay: { desktop: "rgba(0,0,0,0.3)", mobile: "rgba(0,0,0,0.3)" },
    },
  },
  BENEFITS: {
    data: {
      cards: [{ icon: "✅", title: "Beneficio", description: "Descripción del beneficio" }],
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },
  GALLERY: {
    data: {
      displayType: "slider",
      images: [] as string[],
      showBuyButton: false,
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },
  TESTIMONIALS: {
    data: {
      items: [{ name: "Cliente", text: "Excelente producto", rating: 5 }],
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },
  VIDEO: {
    data: {
      displayType: "slider",
      videos: [] as unknown[],
      showBuyButton: false,
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },
  COLORS: {
    data: {
      primary: "#3b82f6",
      background: "#ffffff",
      cta: "#dc2626",
      text: "#111827",
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },
  TICKER: {
    data: {
      mode: "scrolling",
      sticky: false,
      scrollingText: "🔥 Oferta especial • Envío gratis •",
      speed: 30,
      bgColor: "#dc2626",
      textColor: "#ffffff",
    },
    style: { ...DEFAULT_STYLE, paddingY: "sm" },
    media: {},
  },
  // Block types added in Plan 2 — placeholder defaults so the enum is exhaustive.
  // These will NOT be registered as addable in the AddBlockPanel (registry filter).
  RICH_TEXT: { data: {}, style: { ...DEFAULT_STYLE }, media: {} },
  FAQ: { data: {}, style: { ...DEFAULT_STYLE }, media: {} },
  IMAGE_TEXT: { data: {}, style: { ...DEFAULT_STYLE }, media: {} },
  RELATED_PRODUCTS: { data: {}, style: { ...DEFAULT_STYLE }, media: {} },
  TRUST_BADGES: { data: {}, style: { ...DEFAULT_STYLE }, media: {} },
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/blocks/defaults.ts
git commit -m "feat(blocks): add Level 2 style defaults and v2 default content per block type"
```

---

## Task 6: Create data migration script (v1 → v2 content shape)

**Files:**
- Create: `scripts/migrate-landing-blocks-to-v2.ts`

- [ ] **Step 1: Create the migration script**

Create `scripts/migrate-landing-blocks-to-v2.ts`:

```typescript
/**
 * Migrate existing LandingBlock.content from v1 flat shape to v2
 * `{ data, style, media }` shape.
 *
 * Usage:
 *   npx tsx scripts/migrate-landing-blocks-to-v2.ts            # dry-run (default)
 *   npx tsx scripts/migrate-landing-blocks-to-v2.ts --apply    # write changes to DB
 *
 * Properties:
 *   - Idempotent: if a block already has v2 shape (has "data" key at top level),
 *     it is skipped.
 *   - Transactional: processes blocks in batches of 100 within a transaction.
 *   - Safe: dry-run prints a summary without touching the DB.
 */
import { PrismaClient, type LandingBlockType } from "@prisma/client"
import { DEFAULT_STYLE } from "../lib/blocks/defaults"
import type { BlockContentV2 } from "../lib/blocks/types"

const prisma = new PrismaClient()

const APPLY = process.argv.includes("--apply")
const BATCH_SIZE = 100

type V1Content = Record<string, unknown>

function isAlreadyV2(content: unknown): boolean {
  return (
    typeof content === "object" &&
    content !== null &&
    "data" in content &&
    "style" in content &&
    "media" in content
  )
}

/**
 * Transform a v1 flat content object to v2 based on its block type.
 * Text fields go to `data`. Visual/color fields go to `style` or `media`
 * as appropriate. Images are duplicated as { desktop, mobile }.
 */
function transformV1toV2(type: LandingBlockType, v1: V1Content): BlockContentV2 {
  switch (type) {
    case "HERO": {
      const title = (v1.title as string) ?? ""
      const subtitle = (v1.subtitle as string) ?? ""
      const ctaText = (v1.ctaText as string) ?? ""
      const bgImageUrl = (v1.bgImage as string) ?? ""
      const overlayColor = (v1.overlayColor as string) ?? "rgba(0,0,0,0.3)"
      return {
        data: { title, subtitle, ctaText },
        style: { ...DEFAULT_STYLE, paddingY: "xl" },
        media: {
          bgImage: bgImageUrl ? { desktop: bgImageUrl, mobile: bgImageUrl } : undefined,
          bgOverlay: { desktop: overlayColor, mobile: overlayColor },
        },
      }
    }
    case "BENEFITS": {
      const cards = (v1.cards as unknown[]) ?? []
      return {
        data: { cards },
        style: { ...DEFAULT_STYLE },
        media: {},
      }
    }
    case "GALLERY": {
      const displayType = (v1.displayType as string) ?? "slider"
      const images = (v1.images as string[]) ?? []
      const showBuyButton = Boolean(v1.showBuyButton)
      return {
        data: { displayType, images, showBuyButton },
        style: { ...DEFAULT_STYLE },
        media: {},
      }
    }
    case "TESTIMONIALS": {
      const items = (v1.items as unknown[]) ?? []
      return {
        data: { items },
        style: { ...DEFAULT_STYLE },
        media: {},
      }
    }
    case "VIDEO": {
      const displayType = (v1.displayType as string) ?? "slider"
      const videos = (v1.videos as unknown[]) ?? []
      const showBuyButton = Boolean(v1.showBuyButton)
      return {
        data: { displayType, videos, showBuyButton },
        style: { ...DEFAULT_STYLE },
        media: {},
      }
    }
    case "COLORS": {
      return {
        data: {
          primary: (v1.primary as string) ?? "#3b82f6",
          background: (v1.background as string) ?? "#ffffff",
          cta: (v1.cta as string) ?? "#dc2626",
          text: (v1.text as string) ?? "#111827",
        },
        style: { ...DEFAULT_STYLE },
        media: {},
      }
    }
    case "TICKER": {
      return {
        data: {
          mode: v1.mode ?? "scrolling",
          sticky: Boolean(v1.sticky),
          scrollingText: v1.scrollingText ?? "",
          speed: v1.speed ?? 30,
          endsAt: v1.endsAt,
          countdownLabel: v1.countdownLabel,
          bgColor: v1.bgColor ?? "#dc2626",
          textColor: v1.textColor ?? "#ffffff",
        },
        style: { ...DEFAULT_STYLE, paddingY: "sm" },
        media: {},
      }
    }
    // New types are not expected to exist in v1 data
    default:
      return { data: v1, style: { ...DEFAULT_STYLE }, media: {} }
  }
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY (writing changes)" : "DRY-RUN (no changes)"}`)

  const total = await prisma.landingBlock.count()
  console.log(`Total LandingBlock rows in DB: ${total}`)

  let skippedAlreadyV2 = 0
  let migrated = 0
  const perType: Record<string, number> = {}

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const batch = await prisma.landingBlock.findMany({
      skip: offset,
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
    })

    const updates: { id: string; content: BlockContentV2 }[] = []

    for (const row of batch) {
      if (isAlreadyV2(row.content)) {
        skippedAlreadyV2++
        continue
      }
      const v2 = transformV1toV2(row.type, row.content as V1Content)
      updates.push({ id: row.id, content: v2 })
      perType[row.type] = (perType[row.type] ?? 0) + 1
      migrated++
    }

    if (APPLY && updates.length > 0) {
      await prisma.$transaction(
        updates.map(({ id, content }) =>
          prisma.landingBlock.update({
            where: { id },
            data: { content: content as object },
          })
        )
      )
    }

    console.log(`  Batch ${offset}-${offset + batch.length}: ${updates.length} to migrate, ${batch.length - updates.length} already v2`)
  }

  console.log(`\nSummary:`)
  console.log(`  Already v2 (skipped): ${skippedAlreadyV2}`)
  console.log(`  Migrated: ${migrated}`)
  console.log(`  By type:`)
  for (const [t, n] of Object.entries(perType)) {
    console.log(`    ${t}: ${n}`)
  }
  console.log(`\n${APPLY ? "✅ Changes written to DB" : "ℹ️  Dry-run complete. Re-run with --apply to write."}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run the dry-run against your local DB**

Run:
```bash
npx tsx scripts/migrate-landing-blocks-to-v2.ts
```

Expected: prints a count of blocks to migrate by type, ends with "Dry-run complete". No DB writes happen.

- [ ] **Step 3: Run the --apply variant**

Run:
```bash
npx tsx scripts/migrate-landing-blocks-to-v2.ts --apply
```

Expected: prints the same summary but ends with "✅ Changes written to DB".

- [ ] **Step 4: Verify idempotency by running dry-run again**

Run:
```bash
npx tsx scripts/migrate-landing-blocks-to-v2.ts
```

Expected: "Already v2 (skipped)" count matches the previously migrated count, "Migrated: 0".

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-landing-blocks-to-v2.ts
git commit -m "feat(migration): add idempotent data migration script for v1→v2 block content shape"
```

---

## Task 7: Make existing block renderers bilingual (read v1 and v2 shapes)

**Files:**
- Modify: `components/shop/templates/blocks/HeroBlock.tsx`
- Modify: `components/shop/templates/blocks/BenefitsBlock.tsx`
- Modify: `components/shop/templates/blocks/GalleryBlock.tsx`
- Modify: `components/shop/templates/blocks/TestimonialsBlock.tsx`
- Modify: `components/shop/templates/blocks/VideoBlock.tsx`
- Modify: `components/shop/templates/blocks/ColorsBlock.tsx`
- Modify: `components/shop/templates/blocks/TickerBlock.tsx`

**Strategy:** Each renderer gets a small helper at the top that detects the content shape. If v2, extract the flat fields it expects from `content.data` and `content.media`. If v1 (flat), use as-is. This keeps the render logic unchanged and avoids duplicating component code.

- [ ] **Step 1: Create a shared normalizer for block renderers**

Create `components/shop/templates/blocks/_normalizeContent.ts`:

```typescript
import type { BlockContentV2 } from "@/lib/blocks/types"

/**
 * Detect if a content object is in v2 shape (has { data, style, media } keys).
 * v1 content has flat fields (title, bgImage, cards, etc.) at the top level.
 */
export function isV2Content(content: unknown): content is BlockContentV2 {
  return (
    typeof content === "object" &&
    content !== null &&
    "data" in content &&
    "style" in content &&
    "media" in content
  )
}

/**
 * Normalize content to a flat shape the legacy renderers expect.
 *
 * - v1 (already flat): return as-is
 * - v2: flatten by merging data + select media fields. The caller
 *   decides which media fields are relevant (depends on block type).
 *
 * For the bilingual reader pattern used in Plan 1, we flatten v2 to the v1
 * field names so the existing render logic does not need to change.
 *
 * Plan 2 replaces this with direct v2-aware renderers.
 */
export function flattenV2Content(content: BlockContentV2, blockType: string): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...(content.data as Record<string, unknown>) }

  // Block-specific media flattening
  if (blockType === "HERO") {
    // Pick desktop image as the default single value for v1 compatibility
    const bgImage = content.media.bgImage?.desktop ?? content.media.bgImage?.mobile
    if (bgImage) flat.bgImage = bgImage
    const bgOverlay = content.media.bgOverlay?.desktop ?? content.media.bgOverlay?.mobile
    if (bgOverlay) flat.overlayColor = bgOverlay
  }

  return flat
}

/**
 * Convenience: given any content (v1 or v2) and a block type, return a flat
 * object the legacy renderer can destructure.
 */
export function readContent<T = Record<string, unknown>>(content: unknown, blockType: string): T {
  if (isV2Content(content)) return flattenV2Content(content, blockType) as T
  return (content ?? {}) as T
}
```

- [ ] **Step 2: Update `HeroBlock.tsx`**

Modify `components/shop/templates/blocks/HeroBlock.tsx`:

```typescript
"use client";

import Image from "next/image";
import type { HeroBlockContent } from "@/lib/types/landing-blocks";
import { readContent } from "./_normalizeContent";

interface HeroBlockProps {
  content: HeroBlockContent | unknown;
  onCtaClick?: () => void;
}

export default function HeroBlock({ content: rawContent, onCtaClick }: HeroBlockProps) {
  const content = readContent<HeroBlockContent>(rawContent, "HERO");
  const { title, subtitle, bgImage, overlayColor, ctaText } = content;

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {bgImage ? (
        <Image
          src={bgImage}
          alt={title}
          fill
          className="object-cover"
          priority
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
      )}

      <div
        className="absolute inset-0"
        style={{ backgroundColor: overlayColor ?? "rgba(0,0,0,0.4)" }}
      />

      <div className="relative z-10 container mx-auto px-4 py-20 text-center text-white">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-8 text-white/90 drop-shadow">
            {subtitle}
          </p>
        )}
        {ctaText && (
          <button
            onClick={onCtaClick}
            className="landing-cta-btn inline-flex items-center justify-center rounded-full px-8 py-4 text-lg font-semibold shadow-xl transition-transform hover:scale-105 active:scale-95"
          >
            {ctaText}
          </button>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Update `BenefitsBlock.tsx` same way**

Read the existing file first:

```bash
cat "components/shop/templates/blocks/BenefitsBlock.tsx"
```

Apply the same pattern: at the top, destructure `rawContent` from props, call `readContent<BenefitsBlockContent>(rawContent, "BENEFITS")`, and use the result downstream. Change the prop type to `BenefitsBlockContent | unknown`.

- [ ] **Step 4: Apply same pattern to remaining 5 blocks**

For each of: `GalleryBlock.tsx`, `TestimonialsBlock.tsx`, `VideoBlock.tsx`, `ColorsBlock.tsx`, `TickerBlock.tsx`:

1. Import `readContent` from `./_normalizeContent`
2. Accept `content: <TypeName> | unknown` as prop
3. Call `const content = readContent<TypeName>(rawContent, "<TYPE>")` at the top
4. Leave the rest of the render logic unchanged

Types for the `blockType` string: `"BENEFITS"`, `"GALLERY"`, `"TESTIMONIALS"`, `"VIDEO"`, `"COLORS"`, `"TICKER"`.

Note: only `HERO` has media (bgImage/bgOverlay) that needs explicit flattening in this plan. The other blocks' data in v2 is fully inside `content.data`, so `readContent` without block-specific branches still produces the right flat shape for them.

- [ ] **Step 5: Run dev server and manually smoke-test a migrated product**

Run:
```bash
npm run dev
```

Visit `/productos/<slug>` for a product that has LandingBlocks migrated to v2. Verify:
- The page renders visually identical to before
- No console errors in the browser
- The HERO background image still loads

- [ ] **Step 6: Commit**

```bash
git add components/shop/templates/blocks/
git commit -m "feat(renderers): make block renderers bilingual (read v1 and v2 content shapes)"
```

---

# PHASE 1 — GENERIC EDITOR (Tasks 8-28, ~2 weeks)

---

## Task 8: Add feature flag helper

**Files:**
- Create: `lib/blocks/feature-flag.ts`

- [ ] **Step 1: Create the helper**

Create `lib/blocks/feature-flag.ts`:

```typescript
import { getSetting } from "@/lib/site-settings"

/**
 * Returns true if the new visual builder is enabled for admins.
 *
 * The flag is stored as a Setting row with key "LANDING_BUILDER_V2".
 * Default is OFF (legacy form-based editor remains active).
 *
 * Flip the flag globally by running:
 *   UPDATE "Setting" SET value = 'true' WHERE key = 'LANDING_BUILDER_V2';
 * or via /admin/configuracion/ if a UI control is added later.
 */
export async function isPageBuilderV2Enabled(): Promise<boolean> {
  const value = await getSetting("LANDING_BUILDER_V2", false)
  return value === true || value === "true"
}
```

- [ ] **Step 2: Verify by toggling the setting in Prisma Studio**

Run:
```bash
npx prisma studio
```

In the Setting table, create a row: `key = LANDING_BUILDER_V2`, `value = false`. Close Prisma Studio.

- [ ] **Step 3: Commit**

```bash
git add lib/blocks/feature-flag.ts
git commit -m "feat(blocks): add isPageBuilderV2Enabled feature flag helper"
```

---

## Task 9: Create the block registry scaffold

**Files:**
- Create: `lib/blocks/registry.ts`

- [ ] **Step 1: Create the registry**

Create `lib/blocks/registry.ts`:

```typescript
import type { ComponentType } from "react"
import type { BlockCategory, BlockContentV2, BlockScope, LandingBlockType } from "./types"

/**
 * Metadata and implementations for one block type.
 */
export interface BlockDefinition {
  type: LandingBlockType
  label: string                      // User-facing label (Spanish)
  icon: string                        // lucide-react icon name
  emoji?: string                      // Optional emoji fallback
  description: string                 // Short description for the Add panel
  scope: BlockScope                   // "universal" | "product"
  category: BlockCategory
  defaultContent: BlockContentV2
  /** Renderer component used in both the canvas preview and the storefront.
   * Receives resolved (device-flattened) content. */
  renderer: ComponentType<{ content: BlockContentV2 }>
  /** Form component used in the right panel "Contenido" tab. */
  contentForm: ComponentType<{
    content: BlockContentV2
    onChange: (content: BlockContentV2) => void
  }>
}

/**
 * Global registry. Populated in Task 10 when we register the 7 existing blocks.
 * Plan 2 adds the 5 new blocks.
 */
const registry = new Map<LandingBlockType, BlockDefinition>()

export function registerBlock(def: BlockDefinition): void {
  registry.set(def.type, def)
}

export function getBlockDefinition(type: LandingBlockType): BlockDefinition | undefined {
  return registry.get(type)
}

export function getAllBlockDefinitions(): BlockDefinition[] {
  return Array.from(registry.values())
}

/**
 * Returns block definitions filterable by scope. Use this in the
 * AddBlockPanel: in a product context, scope="product" blocks are shown;
 * in a template context (Plan 3), only universal blocks are shown.
 */
export function getBlockDefinitionsForScope(scope: "product" | "page"): BlockDefinition[] {
  return getAllBlockDefinitions().filter((def) => {
    if (scope === "page") return def.scope === "universal"
    return true
  })
}

/**
 * Group block definitions by category for display in the Add panel.
 */
export function getBlockDefinitionsByCategory(
  scope: "product" | "page"
): Record<BlockCategory, BlockDefinition[]> {
  const result: Record<string, BlockDefinition[]> = {
    content: [],
    media: [],
    "social-proof": [],
    visual: [],
    commerce: [],
  }
  for (const def of getBlockDefinitionsForScope(scope)) {
    result[def.category].push(def)
  }
  return result as Record<BlockCategory, BlockDefinition[]>
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/blocks/registry.ts
git commit -m "feat(blocks): add block registry scaffold with scope and category filtering"
```

---

## Task 10: Register the 7 existing block types in the registry

**Files:**
- Create: `lib/blocks/register-existing-blocks.ts`
- Modify: `lib/blocks/registry.ts` (export a `initializeRegistry` or similar)

Note: the content forms for existing blocks already exist at `components/admin/landing-builder/block-forms/*`. We will adapt them in Task 20. For now, register minimal stubs so the registry is populated and the build compiles. Task 20 replaces the form stubs with real adapters.

- [ ] **Step 1: Create stubs for the content forms**

Create `components/admin/page-builder/forms/StubContentForm.tsx`:

```typescript
"use client"

import type { BlockContentV2 } from "@/lib/blocks/types"

interface StubContentFormProps {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
  blockType: string
}

/**
 * Temporary placeholder content form used while the block registry is being
 * wired up. Replaced in Task 20 with adapters over the existing legacy forms
 * in components/admin/landing-builder/block-forms/.
 */
export function StubContentForm({ blockType }: StubContentFormProps) {
  return (
    <div className="p-4 text-sm text-muted-foreground bg-muted rounded-md">
      <p className="font-medium mb-1">Content form for {blockType}</p>
      <p>Placeholder — real form wired up in Task 20.</p>
    </div>
  )
}
```

- [ ] **Step 2: Create the registration file**

Create `lib/blocks/register-existing-blocks.ts`:

```typescript
import dynamic from "next/dynamic"
import { registerBlock } from "./registry"
import { DEFAULT_CONTENT_V2 } from "./defaults"
import type { BlockDefinition } from "./registry"

// Storefront renderers are the same components used in ProductLandingView.
// We reuse them unchanged in the editor canvas — they already accept
// v1 or v2 content via the bilingual reader added in Task 7.

const HeroBlock = dynamic(() => import("@/components/shop/templates/blocks/HeroBlock"))
const BenefitsBlock = dynamic(() => import("@/components/shop/templates/blocks/BenefitsBlock"))
const GalleryBlock = dynamic(() => import("@/components/shop/templates/blocks/GalleryBlock"))
const TestimonialsBlock = dynamic(() => import("@/components/shop/templates/blocks/TestimonialsBlock"))
const VideoBlock = dynamic(() => import("@/components/shop/templates/blocks/VideoBlock"))
const ColorsBlock = dynamic(() => import("@/components/shop/templates/blocks/ColorsBlock"))
const TickerBlock = dynamic(() => import("@/components/shop/templates/blocks/TickerBlock"))

import { StubContentForm } from "@/components/admin/page-builder/forms/StubContentForm"

function stubForm(blockType: string) {
  return function Stub(props: { content: any; onChange: (c: any) => void }) {
    return <StubContentForm blockType={blockType} content={props.content} onChange={props.onChange} />
  }
}

const existing: BlockDefinition[] = [
  {
    type: "HERO",
    label: "Hero / Cabecera",
    icon: "Megaphone",
    emoji: "🖼",
    description: "Imagen grande con título y CTA para abrir la landing",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.HERO,
    renderer: HeroBlock as any,
    contentForm: stubForm("HERO") as any,
  },
  {
    type: "BENEFITS",
    label: "Beneficios",
    icon: "CheckCircle",
    emoji: "✅",
    description: "Grid de tarjetas con íconos y descripciones",
    scope: "universal",
    category: "visual",
    defaultContent: DEFAULT_CONTENT_V2.BENEFITS,
    renderer: BenefitsBlock as any,
    contentForm: stubForm("BENEFITS") as any,
  },
  {
    type: "GALLERY",
    label: "Galería",
    icon: "Image",
    emoji: "🖼️",
    description: "Slider o stack de imágenes del producto",
    scope: "universal",
    category: "media",
    defaultContent: DEFAULT_CONTENT_V2.GALLERY,
    renderer: GalleryBlock as any,
    contentForm: stubForm("GALLERY") as any,
  },
  {
    type: "TESTIMONIALS",
    label: "Testimonios",
    icon: "MessageSquare",
    emoji: "💬",
    description: "Reseñas con nombre, foto y calificación",
    scope: "universal",
    category: "social-proof",
    defaultContent: DEFAULT_CONTENT_V2.TESTIMONIALS,
    renderer: TestimonialsBlock as any,
    contentForm: stubForm("TESTIMONIALS") as any,
  },
  {
    type: "VIDEO",
    label: "Video",
    icon: "PlayCircle",
    emoji: "▶️",
    description: "Video de YouTube, Vimeo o subido",
    scope: "universal",
    category: "media",
    defaultContent: DEFAULT_CONTENT_V2.VIDEO,
    renderer: VideoBlock as any,
    contentForm: stubForm("VIDEO") as any,
  },
  {
    type: "COLORS",
    label: "Paleta de colores",
    icon: "Palette",
    emoji: "🎨",
    description: "Define colores de marca aplicables a la landing",
    scope: "universal",
    category: "visual",
    defaultContent: DEFAULT_CONTENT_V2.COLORS,
    renderer: ColorsBlock as any,
    contentForm: stubForm("COLORS") as any,
  },
  {
    type: "TICKER",
    label: "Ticker / Contador",
    icon: "Megaphone",
    emoji: "📢",
    description: "Mensaje animado o countdown para ofertas",
    scope: "universal",
    category: "visual",
    defaultContent: DEFAULT_CONTENT_V2.TICKER,
    renderer: TickerBlock as any,
    contentForm: stubForm("TICKER") as any,
  },
]

let registered = false
export function registerExistingBlocks(): void {
  if (registered) return
  existing.forEach(registerBlock)
  registered = true
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/blocks/register-existing-blocks.ts components/admin/page-builder/forms/
git commit -m "feat(blocks): register 7 existing block types with stub content forms"
```

---

## Task 11: Create the Zustand builder store

**Files:**
- Create: `components/admin/page-builder/store.ts`
- Create: `components/admin/page-builder/types.ts`

- [ ] **Step 1: Create shared types file**

Create `components/admin/page-builder/types.ts`:

```typescript
import type { BlockInstance, LandingBlockType, BlockContentV2, Device } from "@/lib/blocks/types"

export type BuilderScope = "product" | "page"

export interface ProductContext {
  type: "product"
  product: {
    id: string
    slug: string
    name: string
  }
}

// Plan 3 adds: PageContext, TemplateContext
export type BuilderContext = ProductContext

export interface PageBuilderActions {
  onApplyTemplate?: () => void
  onSaveAsTemplate?: () => void
  onUnlinkTemplate?: () => void
}

export interface PageBuilderProps {
  blocks: BlockInstance[]
  onBlocksChange: (blocks: BlockInstance[]) => void
  scope: BuilderScope
  context?: BuilderContext
  actions?: PageBuilderActions
  title?: string
  backHref?: string
}

export type SaveStatus =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; at: number }
  | { status: "error"; message: string }

export type { BlockInstance, LandingBlockType, BlockContentV2, Device }
```

- [ ] **Step 2: Create the Zustand store**

Create `components/admin/page-builder/store.ts`:

```typescript
"use client"

import { create } from "zustand"
import type { BlockInstance, LandingBlockType, BlockContentV2, Device, SaveStatus } from "./types"
import { getBlockDefinition } from "@/lib/blocks/registry"

interface BuilderState {
  blocks: BlockInstance[]
  selectedBlockId: string | null
  device: Device
  saveStatus: SaveStatus
  isDirty: boolean

  // Setters
  setBlocks: (blocks: BlockInstance[]) => void
  selectBlock: (id: string | null) => void
  setDevice: (device: Device) => void
  setSaveStatus: (status: SaveStatus) => void

  // Mutations (return the new blocks so the wrapper can persist via Server Action)
  updateBlockContent: (id: string, content: BlockContentV2) => BlockInstance[]
  reorderBlocks: (fromIndex: number, toIndex: number) => BlockInstance[]
  moveBlockRelative: (id: string, direction: "up" | "down") => BlockInstance[]
  addBlock: (type: LandingBlockType, position?: number) => BlockInstance[]
  duplicateBlock: (id: string) => BlockInstance[]
  removeBlock: (id: string) => BlockInstance[]
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  blocks: [],
  selectedBlockId: null,
  device: "desktop",
  saveStatus: { status: "idle" },
  isDirty: false,

  setBlocks: (blocks) => set({ blocks, isDirty: false }),
  selectBlock: (id) => set({ selectedBlockId: id }),
  setDevice: (device) => set({ device }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),

  updateBlockContent: (id, content) => {
    const blocks = get().blocks.map((b) => (b.id === id ? { ...b, content } : b))
    set({ blocks, isDirty: true })
    return blocks
  },

  reorderBlocks: (fromIndex, toIndex) => {
    const current = [...get().blocks]
    const [moved] = current.splice(fromIndex, 1)
    current.splice(toIndex, 0, moved)
    const blocks = current.map((b, i) => ({ ...b, position: i }))
    set({ blocks, isDirty: true })
    return blocks
  },

  moveBlockRelative: (id, direction) => {
    const blocks = get().blocks
    const idx = blocks.findIndex((b) => b.id === id)
    if (idx < 0) return blocks
    const newIdx = direction === "up" ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= blocks.length) return blocks
    return get().reorderBlocks(idx, newIdx)
  },

  addBlock: (type, position) => {
    const def = getBlockDefinition(type)
    if (!def) return get().blocks
    const current = get().blocks
    const insertAt = position ?? current.length
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newBlock: BlockInstance = {
      id: tempId,
      type,
      position: insertAt,
      content: def.defaultContent,
    }
    const next = [
      ...current.slice(0, insertAt),
      newBlock,
      ...current.slice(insertAt),
    ].map((b, i) => ({ ...b, position: i }))
    set({ blocks: next, selectedBlockId: tempId, isDirty: true })
    return next
  },

  duplicateBlock: (id) => {
    const current = get().blocks
    const idx = current.findIndex((b) => b.id === id)
    if (idx < 0) return current
    const original = current[idx]
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const clone: BlockInstance = {
      ...original,
      id: tempId,
      sourceTemplateBlockId: null,  // a duplicate is always local
      detached: false,
    }
    const next = [
      ...current.slice(0, idx + 1),
      clone,
      ...current.slice(idx + 1),
    ].map((b, i) => ({ ...b, position: i }))
    set({ blocks: next, selectedBlockId: tempId, isDirty: true })
    return next
  },

  removeBlock: (id) => {
    const next = get()
      .blocks.filter((b) => b.id !== id)
      .map((b, i) => ({ ...b, position: i }))
    const selected = get().selectedBlockId === id ? null : get().selectedBlockId
    set({ blocks: next, selectedBlockId: selected, isDirty: true })
    return next
  },
}))
```

- [ ] **Step 3: Verify TypeScript compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/admin/page-builder/store.ts components/admin/page-builder/types.ts
git commit -m "feat(page-builder): add Zustand store and shared types for the builder"
```

---

## Task 12: Create PageBuilder root component (3-panel shell)

**Files:**
- Create: `components/admin/page-builder/PageBuilder.tsx`

- [ ] **Step 1: Create the root component**

Create `components/admin/page-builder/PageBuilder.tsx`:

```typescript
"use client"

import { useEffect } from "react"
import { useBuilderStore } from "./store"
import { TopBar } from "./TopBar"
import { LeftSidebar } from "./LeftSidebar/LeftSidebar"
import { Canvas } from "./Canvas/Canvas"
import { RightSidebar } from "./RightSidebar/RightSidebar"
import { registerExistingBlocks } from "@/lib/blocks/register-existing-blocks"
import type { PageBuilderProps } from "./types"

export function PageBuilder({
  blocks: initialBlocks,
  onBlocksChange,
  scope,
  context,
  actions,
  title,
  backHref,
}: PageBuilderProps) {
  // Ensure registry is populated (idempotent)
  useEffect(() => {
    registerExistingBlocks()
  }, [])

  const setBlocks = useBuilderStore((s) => s.setBlocks)
  const blocks = useBuilderStore((s) => s.blocks)

  // Hydrate store from props on mount and when initialBlocks changes
  useEffect(() => {
    setBlocks(initialBlocks)
  }, [initialBlocks, setBlocks])

  // Bubble changes up to parent so it can persist via Server Actions
  useEffect(() => {
    if (blocks !== initialBlocks) {
      onBlocksChange(blocks)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks])

  return (
    <div className="h-screen flex flex-col bg-muted/20">
      <TopBar title={title} backHref={backHref} actions={actions} />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar scope={scope} />
        <Canvas context={context} />
        <RightSidebar context={context} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/page-builder/PageBuilder.tsx
git commit -m "feat(page-builder): add PageBuilder root 3-panel shell component"
```

---

## Task 13: Create TopBar and DeviceToggle

**Files:**
- Create: `components/admin/page-builder/TopBar.tsx`
- Create: `components/admin/page-builder/DeviceToggle.tsx`

- [ ] **Step 1: Create `DeviceToggle.tsx`**

Create `components/admin/page-builder/DeviceToggle.tsx`:

```typescript
"use client"

import { Monitor, Smartphone } from "lucide-react"
import { useBuilderStore } from "./store"
import { cn } from "@/lib/utils"

export function DeviceToggle() {
  const device = useBuilderStore((s) => s.device)
  const setDevice = useBuilderStore((s) => s.setDevice)

  return (
    <div className="inline-flex items-center rounded-md border bg-background p-0.5">
      <button
        type="button"
        onClick={() => setDevice("desktop")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
          device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={device === "desktop"}
        aria-label="Vista desktop"
      >
        <Monitor className="h-4 w-4" />
        Desktop
      </button>
      <button
        type="button"
        onClick={() => setDevice("mobile")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
          device === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={device === "mobile"}
        aria-label="Vista mobile"
      >
        <Smartphone className="h-4 w-4" />
        Mobile
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create `TopBar.tsx`**

Create `components/admin/page-builder/TopBar.tsx`:

```typescript
"use client"

import Link from "next/link"
import { ArrowLeft, Check, Loader2, AlertCircle, MoreVertical } from "lucide-react"
import { useBuilderStore } from "./store"
import { DeviceToggle } from "./DeviceToggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PageBuilderActions } from "./types"

interface TopBarProps {
  title?: string
  backHref?: string
  actions?: PageBuilderActions
}

export function TopBar({ title, backHref, actions }: TopBarProps) {
  const saveStatus = useBuilderStore((s) => s.saveStatus)

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b bg-background shrink-0">
      {backHref && (
        <Button asChild variant="ghost" size="icon">
          <Link href={backHref} aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      )}
      {title && <h1 className="font-medium text-sm truncate max-w-xs">{title}</h1>}

      <div className="flex-1 flex items-center justify-center">
        <DeviceToggle />
      </div>

      <div className="flex items-center gap-2">
        <SaveStatusIndicator />
        {(actions?.onApplyTemplate ||
          actions?.onSaveAsTemplate ||
          actions?.onUnlinkTemplate) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Más acciones">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions?.onApplyTemplate && (
                <DropdownMenuItem onClick={actions.onApplyTemplate}>
                  Aplicar plantilla...
                </DropdownMenuItem>
              )}
              {actions?.onSaveAsTemplate && (
                <DropdownMenuItem onClick={actions.onSaveAsTemplate}>
                  Guardar como plantilla...
                </DropdownMenuItem>
              )}
              {actions?.onUnlinkTemplate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={actions.onUnlinkTemplate} className="text-destructive">
                    Desvincular plantilla
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}

function SaveStatusIndicator() {
  const status = useBuilderStore((s) => s.saveStatus)

  switch (status.status) {
    case "saving":
      return (
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Guardando...
        </span>
      )
    case "saved":
      return (
        <span className="text-xs text-green-600 inline-flex items-center gap-1.5">
          <Check className="h-3 w-3" />
          Guardado
        </span>
      )
    case "error":
      return (
        <span className="text-xs text-destructive inline-flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          {status.message}
        </span>
      )
    default:
      return null
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/page-builder/TopBar.tsx components/admin/page-builder/DeviceToggle.tsx
git commit -m "feat(page-builder): add TopBar with save indicator and DeviceToggle"
```

---

## Task 14: Create Canvas container and CanvasFrame

**Files:**
- Create: `components/admin/page-builder/Canvas/Canvas.tsx`
- Create: `components/admin/page-builder/Canvas/CanvasFrame.tsx`

- [ ] **Step 1: Create `CanvasFrame.tsx`**

Create `components/admin/page-builder/Canvas/CanvasFrame.tsx`:

```typescript
"use client"

import type { ReactNode } from "react"
import { useBuilderStore } from "../store"
import { cn } from "@/lib/utils"

interface CanvasFrameProps {
  children: ReactNode
}

/**
 * Simulates a viewport frame around the preview. Desktop gets a subtle
 * browser-chrome look; mobile gets a phone-frame look. The width transitions
 * smoothly when the DeviceToggle flips.
 */
export function CanvasFrame({ children }: CanvasFrameProps) {
  const device = useBuilderStore((s) => s.device)
  return (
    <div className="flex-1 flex items-start justify-center overflow-auto py-6 px-4">
      <div
        className={cn(
          "bg-background shadow-xl border rounded-lg overflow-hidden transition-all duration-200",
          device === "desktop"
            ? "w-full max-w-[1280px]"
            : "w-[375px] rounded-2xl border-2"
        )}
      >
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `Canvas.tsx`**

Create `components/admin/page-builder/Canvas/Canvas.tsx`:

```typescript
"use client"

import { useBuilderStore } from "../store"
import { CanvasFrame } from "./CanvasFrame"
import { BlockRenderer } from "./BlockRenderer"
import { EmptySlot } from "./EmptySlot"
import type { BuilderContext } from "../types"

interface CanvasProps {
  context?: BuilderContext
}

export function Canvas({ context }: CanvasProps) {
  const blocks = useBuilderStore((s) => s.blocks)
  const selectBlock = useBuilderStore((s) => s.selectBlock)

  return (
    <main
      className="flex-1 flex flex-col bg-muted/40 overflow-hidden"
      onClick={(e) => {
        // Clicks on empty canvas area deselect
        if (e.target === e.currentTarget) selectBlock(null)
      }}
    >
      <CanvasFrame>
        {blocks.length === 0 ? (
          <EmptyCanvas />
        ) : (
          <>
            <EmptySlot position={0} />
            {blocks.map((block, index) => (
              <div key={block.id}>
                <BlockRenderer block={block} context={context} />
                <EmptySlot position={index + 1} />
              </div>
            ))}
          </>
        )}
      </CanvasFrame>
    </main>
  )
}

function EmptyCanvas() {
  return (
    <div className="p-16 text-center">
      <p className="text-sm text-muted-foreground mb-2">Aún no hay bloques en esta página.</p>
      <p className="text-xs text-muted-foreground">
        Agrega uno desde el panel de la izquierda para empezar.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/page-builder/Canvas/
git commit -m "feat(page-builder): add Canvas container with responsive device frame"
```

---

## Task 15: Create BlockRenderer (resolves content for device, uses registry)

**Files:**
- Create: `components/admin/page-builder/Canvas/BlockRenderer.tsx`

- [ ] **Step 1: Create the renderer**

Create `components/admin/page-builder/Canvas/BlockRenderer.tsx`:

```typescript
"use client"

import { useBuilderStore } from "../store"
import { BlockWrapper } from "./BlockWrapper"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { resolveContentForDevice } from "@/lib/blocks/resolve"
import type { BlockInstance } from "@/lib/blocks/types"
import type { BuilderContext } from "../types"

interface BlockRendererProps {
  block: BlockInstance
  context?: BuilderContext
}

export function BlockRenderer({ block, context }: BlockRendererProps) {
  const device = useBuilderStore((s) => s.device)
  const def = getBlockDefinition(block.type)

  if (!def) {
    return (
      <div className="p-4 border border-dashed border-destructive/50 text-xs text-destructive">
        Bloque desconocido: {block.type}
      </div>
    )
  }

  const resolved = resolveContentForDevice(block.content, device)
  const Renderer = def.renderer
  const isHidden =
    (resolved.style.visibility === "mobile-only" && device === "desktop") ||
    (resolved.style.visibility === "desktop-only" && device === "mobile")

  if (isHidden) {
    return (
      <BlockWrapper block={block}>
        <div className="p-6 bg-muted/60 text-center text-xs text-muted-foreground border-dashed border-2 border-muted">
          Oculto en {device === "desktop" ? "desktop" : "mobile"} (visibilidad: {resolved.style.visibility})
        </div>
      </BlockWrapper>
    )
  }

  return (
    <BlockWrapper block={block}>
      <Renderer content={resolved} />
    </BlockWrapper>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/page-builder/Canvas/BlockRenderer.tsx
git commit -m "feat(page-builder): add BlockRenderer using registry and device resolver"
```

---

## Task 16: Create BlockWrapper (outline, hover, selection, drag integration)

**Files:**
- Create: `components/admin/page-builder/Canvas/BlockWrapper.tsx`
- Create: `components/admin/page-builder/Canvas/BlockFloatingToolbar.tsx`

- [ ] **Step 1: Create `BlockFloatingToolbar.tsx`**

Create `components/admin/page-builder/Canvas/BlockFloatingToolbar.tsx`:

```typescript
"use client"

import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Copy,
  Eye,
  Link as LinkIcon,
  Settings,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useBuilderStore } from "../store"
import { toast } from "sonner"
import type { BlockInstance, Visibility } from "@/lib/blocks/types"
import type { SyntheticEvent } from "react"

interface BlockFloatingToolbarProps {
  block: BlockInstance
  dragHandleProps?: Record<string, unknown>
}

export function BlockFloatingToolbar({ block, dragHandleProps }: BlockFloatingToolbarProps) {
  const moveBlockRelative = useBuilderStore((s) => s.moveBlockRelative)
  const duplicateBlock = useBuilderStore((s) => s.duplicateBlock)
  const removeBlock = useBuilderStore((s) => s.removeBlock)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)

  const stopProp = (e: SyntheticEvent) => e.stopPropagation()

  const currentVisibility = (block.content.style.visibility ?? "always") as Visibility

  const setVisibility = (v: Visibility) => {
    updateBlockContent(block.id, {
      ...block.content,
      style: { ...block.content.style, visibility: v },
    })
  }

  const copyLink = async () => {
    const url = `${window.location.pathname}#block=${block.id}`
    await navigator.clipboard.writeText(`${window.location.origin}${url}`)
    toast.success("Enlace al bloque copiado")
  }

  const handleDelete = () => {
    if (confirm("¿Eliminar este bloque?")) removeBlock(block.id)
  }

  return (
    <div
      className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-background border rounded-md shadow-lg px-1 py-0.5 z-20"
      onClick={stopProp}
      onMouseDown={stopProp}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 cursor-grab active:cursor-grabbing"
        aria-label="Arrastrar para reordenar"
        {...dragHandleProps}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label="Mover arriba"
        onClick={() => moveBlockRelative(block.id, "up")}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label="Mover abajo"
        onClick={() => moveBlockRelative(block.id, "down")}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Más opciones">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={stopProp}>
          <DropdownMenuItem onClick={() => duplicateBlock(block.id)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+D</span>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Eye className="h-4 w-4 mr-2" />
              Visibilidad
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel>Mostrar en</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={currentVisibility}
                onValueChange={(v) => setVisibility(v as Visibility)}
              >
                <DropdownMenuRadioItem value="always">Siempre</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="mobile-only">Solo mobile</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="desktop-only">Solo desktop</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={copyLink}>
            <LinkIcon className="h-4 w-4 mr-2" />
            Copiar enlace al bloque
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings className="h-4 w-4 mr-2" />
            Ver propiedades avanzadas
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
            <span className="ml-auto text-xs text-muted-foreground">Del</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

- [ ] **Step 2: Create `BlockWrapper.tsx`**

Create `components/admin/page-builder/Canvas/BlockWrapper.tsx`:

```typescript
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { ReactNode, SyntheticEvent } from "react"
import { useBuilderStore } from "../store"
import { BlockFloatingToolbar } from "./BlockFloatingToolbar"
import { cn } from "@/lib/utils"
import type { BlockInstance } from "@/lib/blocks/types"

interface BlockWrapperProps {
  block: BlockInstance
  children: ReactNode
}

export function BlockWrapper({ block, children }: BlockWrapperProps) {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const selectBlock = useBuilderStore((s) => s.selectBlock)

  const isSelected = selectedBlockId === block.id

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const handleClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    selectBlock(block.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        !isSelected && "hover:outline hover:outline-2 hover:outline-blue-400/60 hover:outline-offset-[-2px]",
        isSelected && "outline outline-2 outline-blue-500 outline-offset-[-2px]"
      )}
      onClick={handleClick}
    >
      {(isSelected || /* toolbar also shows on hover via CSS */ false) ? (
        <BlockFloatingToolbar block={block} dragHandleProps={{ ...attributes, ...listeners }} />
      ) : (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <BlockFloatingToolbar block={block} dragHandleProps={{ ...attributes, ...listeners }} />
        </div>
      )}

      {children}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/page-builder/Canvas/BlockWrapper.tsx components/admin/page-builder/Canvas/BlockFloatingToolbar.tsx
git commit -m "feat(page-builder): add BlockWrapper with outline/select and floating toolbar with overflow menu"
```

---

## Task 17: Create EmptySlot (between-blocks insertion point)

**Files:**
- Create: `components/admin/page-builder/Canvas/EmptySlot.tsx`

- [ ] **Step 1: Create the component**

Create `components/admin/page-builder/Canvas/EmptySlot.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { AddBlockPanel } from "../LeftSidebar/AddBlockPanel"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useBuilderStore } from "../store"
import type { LandingBlockType } from "@/lib/blocks/types"

interface EmptySlotProps {
  position: number
}

export function EmptySlot({ position }: EmptySlotProps) {
  const [open, setOpen] = useState(false)
  const addBlock = useBuilderStore((s) => s.addBlock)

  const handleAdd = (type: LandingBlockType) => {
    addBlock(type, position)
    setOpen(false)
  }

  return (
    <div className="h-3 relative group/slot">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Agregar bloque aquí"
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity"
          >
            <span className="absolute inset-x-2 h-px bg-blue-400" />
            <span className="relative z-10 inline-flex items-center gap-1 bg-blue-500 text-white text-xs font-medium rounded-full px-2 py-0.5 shadow">
              <Plus className="h-3 w-3" />
              Agregar
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="center" side="bottom">
          <AddBlockPanel scope="product" onAdd={handleAdd} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/page-builder/Canvas/EmptySlot.tsx
git commit -m "feat(page-builder): add EmptySlot between-blocks insertion control"
```

---

## Task 18: Create LeftSidebar with BlockList and BlockListItem

**Files:**
- Create: `components/admin/page-builder/LeftSidebar/LeftSidebar.tsx`
- Create: `components/admin/page-builder/LeftSidebar/BlockList.tsx`
- Create: `components/admin/page-builder/LeftSidebar/BlockListItem.tsx`

- [ ] **Step 1: Create `BlockListItem.tsx`**

Create `components/admin/page-builder/LeftSidebar/BlockListItem.tsx`:

```typescript
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBuilderStore } from "../store"
import { getBlockDefinition } from "@/lib/blocks/registry"
import type { BlockInstance } from "@/lib/blocks/types"

interface BlockListItemProps {
  block: BlockInstance
}

export function BlockListItem({ block }: BlockListItemProps) {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const selectBlock = useBuilderStore((s) => s.selectBlock)
  const def = getBlockDefinition(block.type)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `list-${block.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isSelected = selectedBlockId === block.id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer",
        isSelected ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted border-transparent"
      )}
      onClick={() => selectBlock(block.id)}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-base">{def?.emoji ?? "◻"}</span>
      <span className="flex-1 min-w-0 truncate">{def?.label ?? block.type}</span>
    </div>
  )
}
```

- [ ] **Step 2: Create `BlockList.tsx`**

Create `components/admin/page-builder/LeftSidebar/BlockList.tsx`:

```typescript
"use client"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useBuilderStore } from "../store"
import { BlockListItem } from "./BlockListItem"

export function BlockList() {
  const blocks = useBuilderStore((s) => s.blocks)
  const reorderBlocks = useBuilderStore((s) => s.reorderBlocks)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = blocks.findIndex((b) => `list-${b.id}` === active.id)
    const toIndex = blocks.findIndex((b) => `list-${b.id}` === over.id)
    if (fromIndex < 0 || toIndex < 0) return
    reorderBlocks(fromIndex, toIndex)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={blocks.map((b) => `list-${b.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-1.5">
          {blocks.map((block) => (
            <BlockListItem key={block.id} block={block} />
          ))}
        </div>
      </SortableContext>
      {blocks.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-6 border-2 border-dashed rounded-md">
          Sin bloques. Usa el botón de arriba para agregar.
        </div>
      )}
    </DndContext>
  )
}
```

- [ ] **Step 3: Create `LeftSidebar.tsx`**

Create `components/admin/page-builder/LeftSidebar/LeftSidebar.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { BlockList } from "./BlockList"
import { AddBlockPanel } from "./AddBlockPanel"
import { useBuilderStore } from "../store"
import type { BuilderScope, LandingBlockType } from "../types"

interface LeftSidebarProps {
  scope: BuilderScope
}

export function LeftSidebar({ scope }: LeftSidebarProps) {
  const [addOpen, setAddOpen] = useState(false)
  const addBlock = useBuilderStore((s) => s.addBlock)

  const handleAdd = (type: LandingBlockType) => {
    addBlock(type)
    setAddOpen(false)
  }

  return (
    <aside className="w-[280px] shrink-0 border-r bg-background flex flex-col overflow-hidden">
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <h2 className="text-sm font-medium">Secciones</h2>
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <AddBlockPanel scope={scope} onAdd={handleAdd} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <BlockList />
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/page-builder/LeftSidebar/LeftSidebar.tsx components/admin/page-builder/LeftSidebar/BlockList.tsx components/admin/page-builder/LeftSidebar/BlockListItem.tsx
git commit -m "feat(page-builder): add left sidebar with sortable block list"
```

---

## Task 19: Create AddBlockPanel (categorized block picker)

**Files:**
- Create: `components/admin/page-builder/LeftSidebar/AddBlockPanel.tsx`

- [ ] **Step 1: Create the panel**

Create `components/admin/page-builder/LeftSidebar/AddBlockPanel.tsx`:

```typescript
"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { getBlockDefinitionsByCategory } from "@/lib/blocks/registry"
import type { BlockCategory, BuilderScope, LandingBlockType } from "../types"

interface AddBlockPanelProps {
  scope: BuilderScope
  onAdd: (type: LandingBlockType) => void
}

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  content: "📝 Contenido",
  media: "🖼 Media",
  "social-proof": "💬 Prueba social",
  visual: "🎨 Visuales",
  commerce: "🛒 Comercio",
}

export function AddBlockPanel({ scope, onAdd }: AddBlockPanelProps) {
  const [query, setQuery] = useState("")
  const grouped = useMemo(() => getBlockDefinitionsByCategory(scope), [scope])

  const q = query.trim().toLowerCase()

  return (
    <div className="flex flex-col max-h-96">
      <div className="p-2 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar bloque..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-7 h-8 text-sm"
            autoFocus
          />
        </div>
      </div>

      <div className="overflow-auto py-1">
        {(Object.keys(grouped) as BlockCategory[]).map((cat) => {
          const items = grouped[cat].filter(
            (def) =>
              !q ||
              def.label.toLowerCase().includes(q) ||
              def.description.toLowerCase().includes(q)
          )
          if (items.length === 0) return null

          return (
            <div key={cat} className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </div>
              {items.map((def) => (
                <button
                  key={def.type}
                  type="button"
                  onClick={() => onAdd(def.type)}
                  className="w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-muted"
                >
                  <span className="text-base leading-none mt-0.5">{def.emoji ?? "◻"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{def.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{def.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/page-builder/LeftSidebar/AddBlockPanel.tsx
git commit -m "feat(page-builder): add categorized AddBlockPanel with search"
```

---

## Task 20: Port existing block forms to the registry

**Files:**
- Create: `components/admin/page-builder/forms/adapters/HeroContentForm.tsx`
- Create: `components/admin/page-builder/forms/adapters/BenefitsContentForm.tsx`
- Create: `components/admin/page-builder/forms/adapters/GalleryContentForm.tsx`
- Create: `components/admin/page-builder/forms/adapters/TestimonialsContentForm.tsx`
- Create: `components/admin/page-builder/forms/adapters/VideoContentForm.tsx`
- Create: `components/admin/page-builder/forms/adapters/ColorsContentForm.tsx`
- Create: `components/admin/page-builder/forms/adapters/TickerContentForm.tsx`
- Modify: `lib/blocks/register-existing-blocks.ts`

**Strategy:** Existing forms (`components/admin/landing-builder/block-forms/*BlockForm.tsx`) operate on v1 flat content. The adapters bridge them to v2 content by exposing the v1 view of `content.data` + select media, and writing changes back into the v2 shape on updates.

- [ ] **Step 1: Create the HERO adapter**

Create `components/admin/page-builder/forms/adapters/HeroContentForm.tsx`:

```typescript
"use client"

import dynamic from "next/dynamic"
import type { BlockContentV2 } from "@/lib/blocks/types"

const HeroBlockForm = dynamic(
  () => import("@/components/admin/landing-builder/block-forms/HeroBlockForm"),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-muted rounded" /> }
)

interface HeroContentFormProps {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

/**
 * Adapter: bridge v1 legacy HeroBlockForm to v2 content shape.
 *
 * Legacy form expects flat { title, subtitle, bgImage, overlayColor, ctaText }.
 * v2 stores text in `data` and images in `media.bgImage.{desktop,mobile}`.
 *
 * When the admin changes the legacy form, we update v2 by writing:
 *   - text fields into content.data
 *   - bgImage into both desktop AND mobile slots (per-device override is
 *     handled separately in the right panel's Media section in Plan 2)
 */
export function HeroContentForm({ content, onChange }: HeroContentFormProps) {
  const flatV1 = {
    title: (content.data.title as string) ?? "",
    subtitle: (content.data.subtitle as string) ?? "",
    ctaText: (content.data.ctaText as string) ?? "",
    bgImage: content.media.bgImage?.desktop ?? "",
    overlayColor: content.media.bgOverlay?.desktop ?? "rgba(0,0,0,0.3)",
  }

  const handleFlatChange = (updated: typeof flatV1) => {
    onChange({
      data: {
        ...content.data,
        title: updated.title,
        subtitle: updated.subtitle,
        ctaText: updated.ctaText,
      },
      style: content.style,
      media: {
        ...content.media,
        bgImage: updated.bgImage
          ? { desktop: updated.bgImage, mobile: updated.bgImage }
          : undefined,
        bgOverlay: { desktop: updated.overlayColor, mobile: updated.overlayColor },
      },
    })
  }

  return <HeroBlockForm content={flatV1 as any} onChange={handleFlatChange as any} />
}
```

- [ ] **Step 2: Create adapters for the other 6 blocks**

For BENEFITS, GALLERY, TESTIMONIALS, VIDEO, COLORS, TICKER — create similar adapters. These have no media overrides in Plan 1, so the adapter is simpler: flat = `content.data`, and on change just wrap back.

Example for BENEFITS. Create `components/admin/page-builder/forms/adapters/BenefitsContentForm.tsx`:

```typescript
"use client"

import dynamic from "next/dynamic"
import type { BlockContentV2 } from "@/lib/blocks/types"

const BenefitsBlockForm = dynamic(
  () => import("@/components/admin/landing-builder/block-forms/BenefitsBlockForm"),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-muted rounded" /> }
)

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

export function BenefitsContentForm({ content, onChange }: Props) {
  return (
    <BenefitsBlockForm
      content={content.data as any}
      onChange={(newData: any) =>
        onChange({
          data: newData,
          style: content.style,
          media: content.media,
        })
      }
    />
  )
}
```

Repeat for:
- `GalleryContentForm.tsx` → imports `GalleryBlockForm`
- `TestimonialsContentForm.tsx` → imports `TestimonialsBlockForm`
- `VideoContentForm.tsx` → imports `VideoBlockForm`
- `ColorsContentForm.tsx` → imports `ColorsBlockForm`
- `TickerContentForm.tsx` → imports `TickerBlockForm`

Each has the same structure as BenefitsContentForm — only the import path and component name differ.

- [ ] **Step 3: Wire adapters into the registry**

Modify `lib/blocks/register-existing-blocks.ts` — replace the stub form assignments with real adapters.

Locate the imports section and add:
```typescript
import { HeroContentForm } from "@/components/admin/page-builder/forms/adapters/HeroContentForm"
import { BenefitsContentForm } from "@/components/admin/page-builder/forms/adapters/BenefitsContentForm"
import { GalleryContentForm } from "@/components/admin/page-builder/forms/adapters/GalleryContentForm"
import { TestimonialsContentForm } from "@/components/admin/page-builder/forms/adapters/TestimonialsContentForm"
import { VideoContentForm } from "@/components/admin/page-builder/forms/adapters/VideoContentForm"
import { ColorsContentForm } from "@/components/admin/page-builder/forms/adapters/ColorsContentForm"
import { TickerContentForm } from "@/components/admin/page-builder/forms/adapters/TickerContentForm"
```

Remove the `stubForm` helper and `StubContentForm` imports, and replace each definition's `contentForm` field to reference the real adapter:

```typescript
{
  type: "HERO",
  // ...
  contentForm: HeroContentForm as any,
},
{
  type: "BENEFITS",
  // ...
  contentForm: BenefitsContentForm as any,
},
// ... etc for the 7 blocks
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/page-builder/forms/adapters/ lib/blocks/register-existing-blocks.ts
git commit -m "feat(page-builder): port 7 existing block forms as v2 adapters in the registry"
```

---

## Task 21: Create RightSidebar with tabs

**Files:**
- Create: `components/admin/page-builder/RightSidebar/RightSidebar.tsx`
- Create: `components/admin/page-builder/RightSidebar/EmptyState.tsx`
- Create: `components/admin/page-builder/RightSidebar/tabs/ContentTab.tsx`

- [ ] **Step 1: Create `EmptyState.tsx`**

Create `components/admin/page-builder/RightSidebar/EmptyState.tsx`:

```typescript
"use client"

import { MousePointer2 } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <MousePointer2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">Selecciona un bloque</p>
        <p className="text-xs text-muted-foreground mb-6 max-w-[240px]">
          Haz click en cualquier sección del canvas para editarla, o agrega una nueva con el botón de la izquierda.
        </p>
        <div className="text-left text-xs text-muted-foreground space-y-1.5 border rounded-md p-3 bg-muted/40">
          <div className="font-semibold uppercase tracking-wide text-[10px] mb-1">Atajos</div>
          <div className="flex justify-between"><span>Clic en bloque</span><span className="font-mono">Seleccionar</span></div>
          <div className="flex justify-between"><span>Esc</span><span className="font-mono">Deseleccionar</span></div>
          <div className="flex justify-between"><span>Del</span><span className="font-mono">Eliminar</span></div>
          <div className="flex justify-between"><span>Ctrl+D</span><span className="font-mono">Duplicar</span></div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `ContentTab.tsx`**

Create `components/admin/page-builder/RightSidebar/tabs/ContentTab.tsx`:

```typescript
"use client"

import { useBuilderStore } from "../../store"
import { getBlockDefinition } from "@/lib/blocks/registry"
import type { BlockContentV2 } from "@/lib/blocks/types"

export function ContentTab() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)

  const block = blocks.find((b) => b.id === selectedBlockId)
  if (!block) return null

  const def = getBlockDefinition(block.type)
  if (!def) {
    return (
      <div className="p-4 text-xs text-destructive">
        No se encontró el formulario para el tipo {block.type}.
      </div>
    )
  }

  const Form = def.contentForm
  return (
    <Form
      content={block.content}
      onChange={(newContent: BlockContentV2) => updateBlockContent(block.id, newContent)}
    />
  )
}
```

- [ ] **Step 3: Create `RightSidebar.tsx`**

Create `components/admin/page-builder/RightSidebar/RightSidebar.tsx`:

```typescript
"use client"

import { X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useBuilderStore } from "../store"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { EmptyState } from "./EmptyState"
import { ContentTab } from "./tabs/ContentTab"
import type { BuilderContext } from "../types"

interface RightSidebarProps {
  context?: BuilderContext
}

export function RightSidebar({ context: _context }: RightSidebarProps) {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const selectBlock = useBuilderStore((s) => s.selectBlock)

  const block = blocks.find((b) => b.id === selectedBlockId)

  if (!block) {
    return (
      <aside className="w-[340px] shrink-0 border-l bg-background flex flex-col overflow-hidden">
        <EmptyState />
      </aside>
    )
  }

  const def = getBlockDefinition(block.type)

  return (
    <aside className="w-[340px] shrink-0 border-l bg-background flex flex-col overflow-hidden">
      <div className="p-3 border-b flex items-center gap-2 shrink-0">
        <span className="text-base">{def?.emoji ?? "◻"}</span>
        <span className="text-sm font-medium truncate flex-1">{def?.label ?? block.type}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Cerrar panel"
          onClick={() => selectBlock(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2 shrink-0">
          <TabsTrigger value="content" className="flex-1">Contenido</TabsTrigger>
          <TabsTrigger value="style" className="flex-1" disabled>Estilo</TabsTrigger>
          <TabsTrigger value="advanced" className="flex-1" disabled>Avanzado</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="flex-1 overflow-auto p-3 mt-0">
          <ContentTab />
        </TabsContent>
        <TabsContent value="style" className="flex-1 overflow-auto p-3 mt-0">
          <p className="text-xs text-muted-foreground">Controles de estilo en Plan 2.</p>
        </TabsContent>
        <TabsContent value="advanced" className="flex-1 overflow-auto p-3 mt-0">
          <p className="text-xs text-muted-foreground">Panel avanzado en Plan 3.</p>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/page-builder/RightSidebar/
git commit -m "feat(page-builder): add right sidebar with Content/Style/Advanced tabs and empty state"
```

---

## Task 22: Add keyboard shortcuts hook

**Files:**
- Create: `components/admin/page-builder/hooks/useKeyboardShortcuts.ts`
- Modify: `components/admin/page-builder/PageBuilder.tsx`

- [ ] **Step 1: Create the hook**

Create `components/admin/page-builder/hooks/useKeyboardShortcuts.ts`:

```typescript
"use client"

import { useEffect } from "react"
import { useBuilderStore } from "../store"

/**
 * Global keyboard shortcuts for the page builder.
 * Active only when focus is NOT in an input, textarea, or contentEditable element.
 */
export function useKeyboardShortcuts() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const selectBlock = useBuilderStore((s) => s.selectBlock)
  const removeBlock = useBuilderStore((s) => s.removeBlock)
  const duplicateBlock = useBuilderStore((s) => s.duplicateBlock)
  const moveBlockRelative = useBuilderStore((s) => s.moveBlockRelative)
  const blocks = useBuilderStore((s) => s.blocks)

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
      if (target.isContentEditable) return true
      return false
    }

    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return

      if (e.key === "Escape") {
        selectBlock(null)
        return
      }

      if (!selectedBlockId) return

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        if (confirm("¿Eliminar este bloque?")) removeBlock(selectedBlockId)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault()
        duplicateBlock(selectedBlockId)
        return
      }

      const idx = blocks.findIndex((b) => b.id === selectedBlockId)
      if (idx < 0) return

      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowUp") {
        e.preventDefault()
        moveBlockRelative(selectedBlockId, "up")
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowDown") {
        e.preventDefault()
        moveBlockRelative(selectedBlockId, "down")
        return
      }
      if (e.key === "ArrowUp" && idx > 0) {
        e.preventDefault()
        selectBlock(blocks[idx - 1].id)
        return
      }
      if (e.key === "ArrowDown" && idx < blocks.length - 1) {
        e.preventDefault()
        selectBlock(blocks[idx + 1].id)
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectedBlockId, selectBlock, removeBlock, duplicateBlock, moveBlockRelative, blocks])
}
```

- [ ] **Step 2: Activate the hook in `PageBuilder.tsx`**

In `components/admin/page-builder/PageBuilder.tsx`, add the import and call:

```typescript
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"

// Inside PageBuilder component, after the useEffects:
useKeyboardShortcuts()
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/page-builder/hooks/useKeyboardShortcuts.ts components/admin/page-builder/PageBuilder.tsx
git commit -m "feat(page-builder): add keyboard shortcuts hook (Esc, Del, Ctrl+D, arrows)"
```

---

## Task 23: Add URL-persistent selection hook

**Files:**
- Create: `components/admin/page-builder/hooks/useUrlSelection.ts`
- Modify: `components/admin/page-builder/PageBuilder.tsx`

- [ ] **Step 1: Create the hook**

Create `components/admin/page-builder/hooks/useUrlSelection.ts`:

```typescript
"use client"

import { useEffect } from "react"
import { useBuilderStore } from "../store"

/**
 * Sync selected block id with URL hash:
 *   /admin/productos/[id]#block=<blockId>
 *
 * On mount: read hash, select matching block if any.
 * On selection change: replace hash to reflect current selection.
 * On back/forward navigation: re-sync store from hash.
 */
export function useUrlSelection() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const selectBlock = useBuilderStore((s) => s.selectBlock)
  const blocks = useBuilderStore((s) => s.blocks)

  // Read from hash on mount and on popstate
  useEffect(() => {
    const syncFromHash = () => {
      const match = window.location.hash.match(/block=([^&]+)/)
      const id = match?.[1]
      if (id && blocks.some((b) => b.id === id)) {
        selectBlock(id)
      } else if (!id) {
        selectBlock(null)
      }
    }

    syncFromHash()
    window.addEventListener("popstate", syncFromHash)
    return () => window.removeEventListener("popstate", syncFromHash)
  }, [blocks, selectBlock])

  // Write to hash on selection change
  useEffect(() => {
    const hash = selectedBlockId ? `#block=${selectedBlockId}` : ""
    if (window.location.hash !== hash) {
      const newUrl = `${window.location.pathname}${window.location.search}${hash}`
      window.history.replaceState(null, "", newUrl)
    }
  }, [selectedBlockId])
}
```

- [ ] **Step 2: Activate in `PageBuilder.tsx`**

Add:
```typescript
import { useUrlSelection } from "./hooks/useUrlSelection"

// Inside PageBuilder, alongside the other hooks:
useUrlSelection()
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/page-builder/hooks/useUrlSelection.ts components/admin/page-builder/PageBuilder.tsx
git commit -m "feat(page-builder): add URL hash sync for selected block"
```

---

## Task 24: Add beforeUnload warning hook

**Files:**
- Create: `components/admin/page-builder/hooks/useBeforeUnload.ts`
- Modify: `components/admin/page-builder/PageBuilder.tsx`

- [ ] **Step 1: Create the hook**

Create `components/admin/page-builder/hooks/useBeforeUnload.ts`:

```typescript
"use client"

import { useEffect } from "react"
import { useBuilderStore } from "../store"

/**
 * Show a native browser confirmation dialog when the user navigates away
 * with pending save status.
 */
export function useBeforeUnload() {
  const saveStatus = useBuilderStore((s) => s.saveStatus)

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus.status === "saving") {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [saveStatus.status])
}
```

- [ ] **Step 2: Activate in `PageBuilder.tsx`**

Add:
```typescript
import { useBeforeUnload } from "./hooks/useBeforeUnload"

// Inside PageBuilder:
useBeforeUnload()
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/page-builder/hooks/useBeforeUnload.ts components/admin/page-builder/PageBuilder.tsx
git commit -m "feat(page-builder): add beforeunload warning during in-flight saves"
```

---

## Task 25: Extend Server Actions for bulk block mutations

**Files:**
- Modify: `actions/landing-blocks.ts`

- [ ] **Step 1: Extend the actions file**

Open `actions/landing-blocks.ts` and add new functions at the end:

```typescript
/**
 * Accepts a full desired state of a product's landingBlocks and syncs
 * the DB in a single transaction: creates new, updates existing, deletes
 * missing. Used by the autosave path in ProductLandingBuilder to persist
 * changes originating from the Zustand store.
 *
 * Blocks with ids that start with "tmp-" are treated as new (to be created
 * with fresh cuids). All other ids are treated as existing.
 */
export async function syncProductLandingBlocks(
  productId: string,
  desired: Array<{
    id: string
    type: LandingBlockType
    position: number
    content: BlockContent
    sourceTemplateBlockId?: string | null
    detached?: boolean
  }>
) {
  await protectRoute("products:update")

  const existing = await prisma.landingBlock.findMany({
    where: { productId },
    select: { id: true },
  })
  const existingIds = new Set(existing.map((r) => r.id))
  const desiredPersistentIds = new Set(desired.filter((b) => !b.id.startsWith("tmp-")).map((b) => b.id))

  const toDelete = [...existingIds].filter((id) => !desiredPersistentIds.has(id))
  const toCreate = desired.filter((b) => b.id.startsWith("tmp-"))
  const toUpdate = desired.filter((b) => !b.id.startsWith("tmp-") && existingIds.has(b.id))

  const result = await prisma.$transaction(async (tx) => {
    if (toDelete.length > 0) {
      await tx.landingBlock.deleteMany({ where: { id: { in: toDelete } } })
    }

    const created = await Promise.all(
      toCreate.map((b) =>
        tx.landingBlock.create({
          data: {
            productId,
            type: b.type,
            position: b.position,
            content: b.content as object,
            sourceTemplateBlockId: b.sourceTemplateBlockId ?? null,
            detached: b.detached ?? false,
          },
        })
      )
    )

    await Promise.all(
      toUpdate.map((b) =>
        tx.landingBlock.update({
          where: { id: b.id },
          data: {
            type: b.type,
            position: b.position,
            content: b.content as object,
            sourceTemplateBlockId: b.sourceTemplateBlockId ?? null,
            detached: b.detached ?? false,
          },
        })
      )
    )

    return { created, updatedCount: toUpdate.length, deletedCount: toDelete.length }
  })

  revalidatePath(`/admin/productos/${productId}`)
  revalidatePath(`/admin/productos`)

  // Map tmp ids to real cuids for the client to reconcile
  const tmpToReal: Record<string, string> = {}
  toCreate.forEach((b, i) => {
    tmpToReal[b.id] = result.created[i].id
  })

  return { success: true, tmpToReal }
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/landing-blocks.ts
git commit -m "feat(actions): add syncProductLandingBlocks for bulk diff-based persistence"
```

---

## Task 26: Create ProductLandingBuilder wrapper with debounced autosave

**Files:**
- Create: `components/admin/ProductLandingBuilder.tsx`

- [ ] **Step 1: Create the wrapper component**

Create `components/admin/ProductLandingBuilder.tsx`:

```typescript
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { PageBuilder } from "./page-builder/PageBuilder"
import { useBuilderStore } from "./page-builder/store"
import { syncProductLandingBlocks } from "@/actions/landing-blocks"
import type { BlockInstance } from "@/lib/blocks/types"
import { toast } from "sonner"

interface ProductLandingBuilderProps {
  product: {
    id: string
    slug: string
    name: string
  }
  initialBlocks: BlockInstance[]
}

const AUTOSAVE_DEBOUNCE_MS = 600

export function ProductLandingBuilder({ product, initialBlocks }: ProductLandingBuilderProps) {
  const [blocksForBuilder, setBlocksForBuilder] = useState<BlockInstance[]>(initialBlocks)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSerializedRef = useRef<string>(JSON.stringify(initialBlocks))

  const handleBlocksChange = useCallback(
    (next: BlockInstance[]) => {
      const serialized = JSON.stringify(next)
      if (serialized === lastSerializedRef.current) return
      lastSerializedRef.current = serialized

      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(async () => {
        useBuilderStore.getState().setSaveStatus({ status: "saving" })
        try {
          const result = await syncProductLandingBlocks(
            product.id,
            next.map((b) => ({
              id: b.id,
              type: b.type,
              position: b.position,
              content: b.content as any,
              sourceTemplateBlockId: b.sourceTemplateBlockId ?? null,
              detached: b.detached ?? false,
            }))
          )

          if (result.success) {
            // Reconcile temp ids with real cuids in the store
            if (Object.keys(result.tmpToReal).length > 0) {
              const current = useBuilderStore.getState().blocks
              const reconciled = current.map((b) =>
                result.tmpToReal[b.id] ? { ...b, id: result.tmpToReal[b.id] } : b
              )
              useBuilderStore.getState().setBlocks(reconciled)
              lastSerializedRef.current = JSON.stringify(reconciled)
            }
            useBuilderStore.getState().setSaveStatus({ status: "saved", at: Date.now() })
            setTimeout(() => {
              const s = useBuilderStore.getState().saveStatus
              if (s.status === "saved") useBuilderStore.getState().setSaveStatus({ status: "idle" })
            }, 2000)
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error al guardar"
          useBuilderStore.getState().setSaveStatus({ status: "error", message })
          toast.error(`Error al guardar: ${message}`)
        }
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [product.id]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <PageBuilder
      blocks={blocksForBuilder}
      onBlocksChange={(blocks) => {
        setBlocksForBuilder(blocks)
        handleBlocksChange(blocks)
      }}
      scope="product"
      context={{ type: "product", product }}
      title={product.name}
      backHref={`/admin/productos/${product.id}`}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/ProductLandingBuilder.tsx
git commit -m "feat(page-builder): add ProductLandingBuilder wrapper with debounced autosave"
```

---

## Task 27: Wire the new builder into `/admin/productos/[productId]` behind the flag

**Files:**
- Modify: `app/admin/productos/[productId]/page.tsx`

- [ ] **Step 1: Update the page to check the flag and render the new builder**

Open `app/admin/productos/[productId]/page.tsx` and replace with:

```typescript
export const dynamic = "force-dynamic"

import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import EditProductForm from "@/components/admin/EditProductForm"
import { ProductLandingBuilder } from "@/components/admin/ProductLandingBuilder"
import { isPageBuilderV2Enabled } from "@/lib/blocks/feature-flag"
import type { BlockInstance, BlockContentV2 } from "@/lib/blocks/types"

interface EditProductPageProps {
  params: Promise<{
    productId: string
  }>
  searchParams?: Promise<{ tab?: string }>
}

export default async function EditProductPage({ params, searchParams }: EditProductPageProps) {
  const { productId } = await params
  const sp = (await searchParams) ?? {}
  const flagOn = await isPageBuilderV2Enabled()

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      categories: { include: { category: true } },
      variants: { orderBy: { createdAt: "asc" } },
      options: {
        include: { values: { orderBy: { position: "asc" } } },
        orderBy: { position: "asc" },
      },
      landingBlocks: { orderBy: { position: "asc" } },
    },
  })

  if (!product) notFound()

  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  const serializedCategories = categories.map((c) => ({ id: c.id, name: c.name }))

  const serializedProduct = {
    ...product,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    weight: product.weight ? Number(product.weight) : null,
    variants: product.variants.map((v) => ({
      ...v,
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      weight: v.weight ? Number(v.weight) : null,
    })),
  }

  // When the v2 flag is ON AND the admin opened the landing tab, render the
  // full-screen builder instead of the form-based editor.
  if (flagOn && sp.tab === "landing") {
    const blocks: BlockInstance[] = product.landingBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      position: b.position,
      content: b.content as unknown as BlockContentV2,
      sourceTemplateBlockId: b.sourceTemplateBlockId,
      detached: b.detached,
    }))

    return (
      <ProductLandingBuilder
        product={{ id: product.id, slug: product.slug, name: product.name }}
        initialBlocks={blocks}
      />
    )
  }

  return <EditProductForm product={serializedProduct} categories={serializedCategories} />
}
```

- [ ] **Step 2: Add a "Editar Landing" button in `EditProductForm.tsx` that appears only when flag is ON**

Open `components/admin/EditProductForm.tsx` and find the section that currently renders `<LandingBlockList ... />`. That section shows up inside a "Landing" tab in the edit form. Modify it so that:
- When flag is ON, that section shows ONLY a button "Editar en el nuevo builder" that links to `?tab=landing`.
- When flag is OFF, the existing `<LandingBlockList ... />` continues to render.

The flag check should happen server-side — pass a `showLegacyLandingEditor: boolean` prop from the page to the form. Update the page (Task 27 step 1) to also pass this prop to `EditProductForm`:

```typescript
return <EditProductForm
  product={serializedProduct}
  categories={serializedCategories}
  showLegacyLandingEditor={!flagOn}
/>
```

And in `EditProductForm.tsx`, update the props interface and the landing section:

```typescript
interface EditProductFormProps {
  product: any
  categories: Array<{ id: string; name: string }>
  showLegacyLandingEditor?: boolean
}
```

Inside the Landing tab content, replace the existing render of `<LandingBlockList .../>` with:

```tsx
{showLegacyLandingEditor ? (
  <LandingBlockList productId={product.id} initialBlocks={product.landingBlocks ?? []} />
) : (
  <div className="p-6 border rounded-md bg-muted/40 text-center">
    <p className="text-sm font-medium mb-1">Nuevo builder visual disponible</p>
    <p className="text-xs text-muted-foreground mb-4">
      Edita la landing de este producto con el editor WYSIWYG de pantalla completa.
    </p>
    <a
      href={`/admin/productos/${product.id}?tab=landing`}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      Editar en el nuevo builder →
    </a>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/productos/[productId]/page.tsx components/admin/EditProductForm.tsx
git commit -m "feat(admin): wire new PageBuilder into /admin/productos/[id] behind LANDING_BUILDER_V2 flag"
```

---

## Task 28: Smoke test the end-to-end flow manually

**Files:** none — manual verification only.

- [ ] **Step 1: Verify flag OFF (legacy behavior)**

Ensure the Setting `LANDING_BUILDER_V2` value is `false`. Run:
```bash
npm run dev
```

1. Go to `/admin/productos/<some-id>`
2. Click the Landing tab
3. Confirm you see the legacy `LandingBlockList` form-based UI (same as before this plan).
4. Add/edit/delete/reorder a block using the legacy UI.
5. Visit `/productos/<slug>` and confirm the block appears correctly.

- [ ] **Step 2: Enable the flag**

In Prisma Studio (`npx prisma studio`), update `Setting` row `LANDING_BUILDER_V2` to `value = true`.

- [ ] **Step 3: Verify flag ON shows entry point**

1. Reload `/admin/productos/<id>` and open the Landing tab
2. Confirm you now see the card "Nuevo builder visual disponible" with button "Editar en el nuevo builder →"
3. Click the button — you should be taken to `/admin/productos/<id>?tab=landing`

- [ ] **Step 4: Exercise the builder**

In the new builder:
1. Verify the 3 panels render: sidebar left with block list, canvas center with preview, sidebar right with empty state.
2. Click "+ Agregar" in the left sidebar, pick a block type. Verify it appears in canvas and is selected in the right panel.
3. Click a block in the canvas. Verify it selects (blue outline + right panel updates).
4. Edit a field in the right panel "Contenido" tab. Verify canvas updates in real time.
5. Toggle DeviceToggle between Desktop and Mobile. Verify canvas resizes with transition.
6. Drag a block in the left sidebar to reorder. Verify canvas reflects new order.
7. Click the ⋯ overflow menu on a block in the canvas. Verify you see Duplicar / Visibilidad / Copiar enlace / Avanzado / Eliminar.
8. Use keyboard shortcuts: Esc to deselect, Ctrl+D to duplicate, Del to delete (with confirm).
9. Wait 1 second after an edit — verify the topbar shows "Guardado ✓".
10. Refresh the page — verify all changes persisted.
11. Visit `/productos/<slug>` — verify changes appear on the storefront.

- [ ] **Step 5: Verify flag-off fallback**

1. Back in Prisma Studio, set `LANDING_BUILDER_V2 = false`
2. Reload the product edit page. Verify the legacy UI is restored and all blocks (including ones created via the new builder) display correctly.

- [ ] **Step 6: No commit for this task (manual verification)**

If any of the above steps fail, document the failure and return to the relevant task. Do not proceed to Plan 2 until all smoke tests pass.

---

## Final Verification and Summary

- [ ] **Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Run build**

```bash
npm run build
```

Expected: build succeeds without errors. Warnings from unrelated code are acceptable.

- [ ] **Run lint**

```bash
npm run lint
```

Expected: no new lint errors from Plan 1 files.

- [ ] **Review the feature flag state before merge**

Ensure `LANDING_BUILDER_V2` is `false` in the production DB before the merge commit. The flag is flipped to `true` only after all 4 plans ship and Phase 5 QA passes.

---

## What's next (Plan 2 preview)

Plan 2 covers:
- Right panel "Estilo" tab implemented with all Level 2 controls
- Device override system with opt-in per-field UI
- 5 new block types (RICH_TEXT, FAQ, IMAGE_TEXT, RELATED_PRODUCTS, TRUST_BADGES)

Plan 3: template library with sync.
Plan 4: Playwright E2E suite + cleanup + release.

Do not start Plan 2 until all Plan 1 smoke tests pass and Plan 1 is merged to master.

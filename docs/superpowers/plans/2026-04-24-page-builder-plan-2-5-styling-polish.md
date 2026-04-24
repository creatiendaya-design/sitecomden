# Page Builder — Plan 2.5: Block-aware Style Filtering + RichText Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the two most critical improvements from Plan 2 smoke testing without adding new style controls: (1) make the Style tab **block-aware** so each block shows only the sections that apply to it (Shopify-style, not Elementor), and (2) fix the RICH_TEXT block's centering + the RichTextEditor's broken functions (DOMPurify stripping + cursor-jump loop).

**Architecture:** Extend the block registry with a per-block `styleSupport` declaration; StyleTab reads it and hides irrelevant sections. Widen DOMPurify's allow-list to preserve TipTap toolbar output. Guard the editor's prop-sync useEffect with a ref so we don't re-setContent when our own onUpdate is echoed back through props.

**Tech Stack:** TypeScript, React 19, Tailwind v4, TipTap, DOMPurify.

**Preceded by:** [Plan 1](./2026-04-23-page-builder-plan-1-foundation-editor.md), [Plan 2](./2026-04-23-page-builder-plan-2-styling-new-blocks.md).
**Followed by:** Plan 2.7 (schema-driven forms refactor), then Plan 2.8 (new style controls — padding top/bottom, typography, gradient — rebuilt on schema), then Plan 3 (templates with sync).

**Scope explicitly NOT in this plan** (moved to Plan 2.8 after the schema refactor in Plan 2.7):
- New `paddingTop`/`paddingBottom` fields and PaddingTopBottomControl
- Typography controls (textSize, textWeight)
- Background gradient control
- All three are deferred so they can be built as schema primitives, not hand-coded components that would need re-migration later.

**Pre-flight:**

```bash
git checkout master
git pull --ff-only
git status
git checkout -b feature/page-builder-plan-2-5
```

---

## File Structure

**Modified files:**
```
lib/blocks/types.ts                                                # Add BlockStyleSupport type + resolveStyleSupport helper
lib/blocks/registry.ts                                             # Add optional styleSupport field to BlockDefinition
lib/blocks/register-existing-blocks.tsx                            # Declare styleSupport per registered block
components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx       # Filter sections by styleSupport (no new controls)
components/shop/templates/blocks/RichTextBlock.tsx                 # Apply alignment to inner prose div + widen DOMPurify
components/admin/RichTextEditor.tsx                                # Ref-guarded setContent to prevent cursor jumps
```

No new files in this plan.

---

## Task 1: Add `BlockStyleSupport` type to `types.ts`

**Files:**
- Modify: `lib/blocks/types.ts`

- [ ] **Step 1: Add the type and helper**

At the end of `lib/blocks/types.ts`, append:

```typescript
/**
 * Declares which style-tab sections apply to a block type. Each field is
 * opt-out (default true) EXCEPT `bgImage` which is opt-in (default false) —
 * most blocks should not show "Imagen de fondo" as a control.
 *
 * A block type sets `styleSupport` in its BlockDefinition (registry) to hide
 * irrelevant sections from the Style tab.
 */
export interface BlockStyleSupport {
  backgroundColor?: boolean        // default: true
  textColor?: boolean              // default: true
  padding?: boolean                // default: true
  alignment?: boolean              // default: true
  containerWidth?: boolean         // default: true
  cornerRadius?: boolean           // default: true
  border?: boolean                 // default: true
  shadow?: boolean                 // default: true
  visibility?: boolean             // default: true
  bgImage?: boolean                // default: FALSE (opt-in — only HERO uses it today)
}

/** Normalize a partial BlockStyleSupport to a fully-populated record. */
export function resolveStyleSupport(partial: Partial<BlockStyleSupport> | undefined): Required<BlockStyleSupport> {
  return {
    backgroundColor: partial?.backgroundColor ?? true,
    textColor: partial?.textColor ?? true,
    padding: partial?.padding ?? true,
    alignment: partial?.alignment ?? true,
    containerWidth: partial?.containerWidth ?? true,
    cornerRadius: partial?.cornerRadius ?? true,
    border: partial?.border ?? true,
    shadow: partial?.shadow ?? true,
    visibility: partial?.visibility ?? true,
    bgImage: partial?.bgImage ?? false,
  }
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/blocks/types.ts
git commit -m "feat(blocks): add BlockStyleSupport type + resolveStyleSupport helper"
```

---

## Task 2: Add `styleSupport` field to `BlockDefinition`

**Files:**
- Modify: `lib/blocks/registry.ts`

- [ ] **Step 1: Update the interface**

Open `lib/blocks/registry.ts`. Update the import line at the top to include `BlockStyleSupport`:

```typescript
import type { BlockCategory, BlockContentV2, BlockScope, LandingBlockType, BlockStyleSupport } from "./types"
```

Inside the `BlockDefinition` interface, add the optional field before the closing brace:

```typescript
  /** Declares which style-tab sections apply to this block type. Unset
   *  fields default per resolveStyleSupport() (all true except `bgImage`). */
  styleSupport?: Partial<BlockStyleSupport>
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/blocks/registry.ts
git commit -m "feat(blocks): add styleSupport field to BlockDefinition"
```

---

## Task 3: Declare `styleSupport` per registered block

**Why:** Each block type needs to express which style sections apply. Defaults (all-true except bgImage) cover most blocks — only special cases need explicit declarations.

**Files:**
- Modify: `lib/blocks/register-existing-blocks.tsx`

Per-block mapping:

| Block | styleSupport override needed |
|---|---|
| HERO | `{ bgImage: true }` — opt-in to background image |
| BENEFITS | none (defaults OK) |
| GALLERY | `{ textColor: false, alignment: false }` — no text |
| TESTIMONIALS | none |
| VIDEO | `{ textColor: false, alignment: false }` — no text |
| TICKER | minimal — only padding + visibility |
| TRUST_BADGES | none |
| RICH_TEXT | none |
| FAQ | none |
| IMAGE_TEXT | none |
| RELATED_PRODUCTS | `{ textColor: false, alignment: false }` — grid, no text-align |

- [ ] **Step 1: Add `styleSupport` to each entry in the `existing` array**

Open `lib/blocks/register-existing-blocks.tsx`. For each entry in the `existing: BlockDefinition[]` array, add the `styleSupport` field where needed per the table above. Specifically:

In the HERO entry, add:
```typescript
    styleSupport: { bgImage: true },
```

In the GALLERY entry, add:
```typescript
    styleSupport: { textColor: false, alignment: false },
```

In the VIDEO entry, add:
```typescript
    styleSupport: { textColor: false, alignment: false },
```

In the TICKER entry, add:
```typescript
    styleSupport: {
      backgroundColor: false,
      textColor: false,
      alignment: false,
      containerWidth: false,
      cornerRadius: false,
      border: false,
      shadow: false,
      // padding and visibility stay default (true)
    },
```

In the RELATED_PRODUCTS entry, add:
```typescript
    styleSupport: { textColor: false, alignment: false },
```

Leave BENEFITS, TESTIMONIALS, TRUST_BADGES, RICH_TEXT, FAQ, and IMAGE_TEXT untouched — their defaults are correct.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/blocks/register-existing-blocks.tsx
git commit -m "feat(blocks): declare styleSupport per block for Shopify-style section filtering"
```

---

## Task 4: Update `StyleTab` to filter sections by `styleSupport`

**Why:** StyleTab currently renders every section for every block. With `styleSupport` declared, hide sections that don't apply.

**Files:**
- Modify: `components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx`

- [ ] **Step 1: Replace the file**

Replace `components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx` with:

```typescript
"use client"

import { useBuilderStore } from "../../store"
import type { BlockStyle, DeviceValue } from "@/lib/blocks/types"
import { resolveStyleSupport } from "@/lib/blocks/types"
import { getBlockDefinition } from "@/lib/blocks/registry"
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

  const def = getBlockDefinition(block.type)
  const support = resolveStyleSupport(def?.styleSupport)

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

  // Section-level visibility
  const showColors = support.backgroundColor || support.textColor
  const showLayout = support.alignment || support.containerWidth
  const showBorders = support.cornerRadius || support.border || support.shadow

  // If nothing is supported (shouldn't happen, but guard)
  const anything =
    showColors || support.padding || showLayout || showBorders || support.visibility || support.bgImage
  if (!anything) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        Este bloque no tiene opciones de estilo configurables.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showColors && (
        <Section title="Colores">
          {support.backgroundColor && (
            <ColorControl
              label="Fondo"
              value={style.backgroundColor as DeviceValue<string> | undefined}
              onChange={(v) => patchStyle("backgroundColor", v)}
            />
          )}
          {support.textColor && (
            <ColorControl
              label="Texto"
              value={style.textColor as DeviceValue<string> | undefined}
              onChange={(v) => patchStyle("textColor", v)}
            />
          )}
        </Section>
      )}

      {support.padding && (
        <Section title="Espaciado">
          <PaddingControl
            value={style.paddingY}
            onChange={(v) => patchStyle("paddingY", v)}
          />
        </Section>
      )}

      {showLayout && (
        <Section title="Layout">
          {support.alignment && (
            <AlignmentControl
              value={style.alignment}
              onChange={(v) => patchStyle("alignment", v)}
            />
          )}
          {support.containerWidth && (
            <ContainerWidthControl
              value={style.containerWidth}
              onChange={(v) => patchStyle("containerWidth", v)}
            />
          )}
        </Section>
      )}

      {showBorders && (
        <Section title="Bordes y sombras">
          {support.cornerRadius && (
            <CornerRadiusControl
              value={style.cornerRadius}
              onChange={(v) => patchStyle("cornerRadius", v)}
            />
          )}
          {support.border && (
            <BorderControl
              value={style.border}
              onChange={(v) => patchStyle("border", v)}
            />
          )}
          {support.shadow && (
            <ShadowControl
              value={style.shadow}
              onChange={(v) => patchStyle("shadow", v)}
            />
          )}
        </Section>
      )}

      {support.visibility && (
        <Section title="Visibilidad">
          <VisibilityControl
            value={style.visibility}
            onChange={(v) => patchStyle("visibility", v)}
          />
        </Section>
      )}

      {support.bgImage && (
        <Section title="Imagen de fondo">
          <ImageControl
            label="Background"
            value={content.media?.bgImage}
            onChange={(v) => patchMedia("bgImage", v)}
          />
        </Section>
      )}
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

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Manually verify per block**

`npm run dev`, open the editor, select each block type, open Estilo tab. Confirm:

| Block | Sections visible |
|---|---|
| HERO | Colores, Espaciado, Layout, Bordes, Visibilidad, **Imagen de fondo** |
| BENEFITS | Colores, Espaciado, Layout, Bordes, Visibilidad (no Imagen) |
| GALLERY | Colores (only Fondo), Espaciado, Layout (only Container), Bordes, Visibilidad |
| TESTIMONIALS | Colores, Espaciado, Layout, Bordes, Visibilidad |
| VIDEO | Same as GALLERY |
| TICKER | Only Espaciado + Visibilidad |
| TRUST_BADGES | Colores, Espaciado, Layout, Bordes, Visibilidad |
| RICH_TEXT | Colores, Espaciado, Layout, Bordes, Visibilidad |
| FAQ | Colores, Espaciado, Layout, Bordes, Visibilidad |
| IMAGE_TEXT | Colores, Espaciado, Layout, Bordes, Visibilidad |
| RELATED_PRODUCTS | Colores (only Fondo), Espaciado, Layout (only Container), Bordes, Visibilidad |

- [ ] **Step 4: Commit**

```bash
git add components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx
git commit -m "feat(page-builder): StyleTab filters sections by block.styleSupport"
```

---

## Task 5: Fix RICH_TEXT centering + widen DOMPurify allow-list

**Why:** User reports (1) alignment=center doesn't center the text, and (2) several editor toolbar functions don't produce visible output. Both are the same kind of bug but in two places:
- Centering: the inner `<div className="prose max-w-[65ch] mx-auto">` centers the CONTAINER but not the text inside. The prose's own text-align rule wins. Fix: apply the alignment class to the prose div itself.
- Editor functions: DOMPurify strips `<img>`, `<s>`, `<code>`, `<h1>`, and the `class`/`style` attributes that TipTap TextAlign uses. Fix: widen the allow-list.

**Files:**
- Modify: `components/shop/templates/blocks/RichTextBlock.tsx`

- [ ] **Step 1: Replace the renderer**

```typescript
"use client";

import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";
import type { Alignment } from "@/lib/blocks/types";

interface RichTextContent {
  html: string;
  maxWidth?: "prose";
}

interface RichTextBlockProps {
  content: RichTextContent | unknown;
}

const ALIGN_CLASS: Record<Alignment, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export default function RichTextBlock({ content: rawContent }: RichTextBlockProps) {
  const content = readContent<RichTextContent>(rawContent, "RICH_TEXT");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const html = content.html ?? "";
  if (!html.trim()) return null;

  // Widened allow-list so common TipTap output survives sanitization:
  //  - <img> inline images
  //  - <s>, <strike> strikethrough
  //  - <code>, <pre> code
  //  - <h1> (previously stripped; used when admin clicks Título 1)
  //  - class attr — TipTap TextAlign uses class="text-center" etc.
  //  - style attr — some extensions inline-style text-align
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "strike", "code", "pre",
      "a", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "img",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class", "style"],
    ALLOW_DATA_ATTR: false,
  });

  // Resolve block-level alignment from Style tab → apply to the prose div
  // (not just the outer section) so the text actually centers/aligns.
  const rawAlign = blockStyle?.alignment;
  const resolvedAlign: Alignment | undefined =
    typeof rawAlign === "string"
      ? (rawAlign as Alignment)
      : rawAlign && typeof rawAlign === "object"
        ? ((rawAlign as { desktop?: Alignment; mobile?: Alignment }).desktop
          ?? (rawAlign as { desktop?: Alignment; mobile?: Alignment }).mobile)
        : undefined;
  const alignmentClass = resolvedAlign ? ALIGN_CLASS[resolvedAlign] : "";

  return (
    <section
      className={cn("landing-section @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            // max-w + mx-auto center the READING COLUMN; alignmentClass sets
            // the actual TEXT alignment within that column.
            "prose prose-sm @md:prose-base max-w-[65ch] mx-auto",
            "prose-headings:font-semibold prose-a:text-primary",
            alignmentClass,
          )}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Manually verify**

Add a RICH_TEXT block. In the editor: click Bold, Italic, Underline, Strike, H1/H2/H3, Lists, Link, TipTap Align Center. Each should persist after save and render on `/productos/<slug>`.
In Style tab: set Alignment = Center → text centers.

- [ ] **Step 4: Commit**

```bash
git add components/shop/templates/blocks/RichTextBlock.tsx
git commit -m "fix(blocks): RICH_TEXT centers text when alignment set + widen DOMPurify allow-list"
```

---

## Task 6: Fix RichTextEditor cursor-jump loop

**Why:** The `useEffect` in `RichTextEditor.tsx` calls `editor.commands.setContent(content)` whenever the `content` prop changes. When the editor fires `onUpdate`, parent re-renders, new `content` arrives, useEffect fires → `setContent` → cursor jumps. Several "function doesn't work" symptoms are this race: click Bold, state round-trips, setContent wipes the selection before the effect applies.

Fix: ref-guard the useEffect so it only fires when the content comes from OUTSIDE our own onUpdate (e.g., switching blocks).

**Files:**
- Modify: `components/admin/RichTextEditor.tsx`

- [ ] **Step 1: Read the file to locate the useEffect**

```bash
grep -n "editor.commands.setContent" components/admin/RichTextEditor.tsx
```

Confirm the anti-pattern is present.

- [ ] **Step 2: Add a ref and guard the useEffect**

Open `components/admin/RichTextEditor.tsx`. Find the existing useEffect around the line where `editor.commands.setContent` is called:

```typescript
useEffect(() => {
  if (editor && content !== editor.getHTML()) {
    editor.commands.setContent(content || "");
  }
}, [content, editor]);
```

Replace with:

```typescript
// Track what we emitted via our own onUpdate so we don't re-setContent
// (and jump the cursor) when the parent echoes our change back via props.
const lastEmittedRef = useRef<string>("");

useEffect(() => {
  if (!editor) return;
  // If the parent is echoing back what we just emitted, ignore.
  if (content === lastEmittedRef.current) return;
  // If content already matches, nothing to do.
  if (content === editor.getHTML()) return;
  // Truly external change: reset.
  editor.commands.setContent(content || "");
}, [content, editor]);
```

Also find the existing onUpdate callback:

```typescript
onUpdate: ({ editor }) => {
  onChange(editor.getHTML());
},
```

Replace with:

```typescript
onUpdate: ({ editor }) => {
  const html = editor.getHTML();
  lastEmittedRef.current = html;
  onChange(html);
},
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manually verify**

Open a RICH_TEXT or FAQ block. Type in the editor continuously — cursor stays in place. Select text, click Bold — text becomes bold instantly. No flicker, no cursor jumps.

- [ ] **Step 5: Commit**

```bash
git add components/admin/RichTextEditor.tsx
git commit -m "fix(editor): ref-guard setContent so prop echo doesn't jump the cursor"
```

---

## Task 7: Final smoke test

- [ ] **Step 1: Build**

```bash
npx tsc --noEmit
npm run build
```

Both pass.

- [ ] **Step 2: Block-aware filtering**

For each of the 11 registered blocks, select it and verify StyleTab shows only the expected sections (see table in Task 4 Step 3).

- [ ] **Step 3: RICH_TEXT fixes**

Verify the full editor toolbar works and that alignment in the Style tab centers the text.

- [ ] **Step 4: Regression pass**

Existing blocks (those using legacy `paddingY`) still render correctly. All other style controls continue to work as in Plan 2.

No commit for this task — it's verification.

---

## Merge

```bash
git checkout master
git merge --no-ff feature/page-builder-plan-2-5 -m "Merge Plan 2.5: block-aware StyleTab + RichText fixes"
```

---

## What's next

**Plan 2.7 — Schema-driven forms refactor** (~8-10 days). Replaces the 11 hand-coded `*ContentForm.tsx` adapters with JSON schemas. See [plan 2.7](./2026-04-24-page-builder-plan-2-7-schema-driven-forms.md).

After Plan 2.7: **Plan 2.8** — rebuild padding top/bottom, typography, gradient as schema primitives (now reusable across all blocks) + migrate block defaults to `paddingTop`/`paddingBottom`.

Then: **Plan 3** — Templates with sync.

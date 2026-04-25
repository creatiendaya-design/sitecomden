# Page Builder — Plan 2.8: Advanced Style Controls

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the three style controls deferred from Plan 2.5 — split top/bottom padding, typography (size + weight), and background gradients. The schema refactor in Plan 2.7 isn't a prerequisite for these — they're styling concerns and live in the existing `StyleTab`, not in the data-driven `ContentTab`.

**Architecture:** Extend `BlockStyle` with new optional fields (backward-compatible), extend `applyBlockStyle` to emit the corresponding Tailwind classes / inline CSS, build three new control components in `RightSidebar/controls/`, extend `BlockStyleSupport` so each block can opt out, render the new sections in `StyleTab` guarded by support flags. No data migration: existing blocks with legacy `paddingY` keep working as a fallback.

**Tech Stack:** TypeScript, React 19, Tailwind v4, shadcn/ui (Select, ToggleGroup if available; otherwise plain buttons + `cn`).

**Preceded by:** Plan 2.5 (block-aware StyleTab + RichText), Plan 2.7 (schema-driven forms). Both merged.
**Followed by:** Plan 3 (templates with sync).

**Scope explicitly NOT in this plan:**
- Migrating GALLERY's content shape to the schema-driven editor (deferred — see Plan 2.7 notes).
- Adding more colors / palettes presets — admins can already use any hex.
- Animation / motion / on-scroll effects.
- Per-device override for the new fields beyond what we already support (DeviceValue<T>).

**Pre-flight:**

```bash
git checkout master
git status
git checkout -b feature/page-builder-plan-2-8
```

---

## File Structure

**Modified files:**
```
lib/blocks/types.ts                                                # Extend BlockStyle + BlockStyleSupport with new fields
lib/blocks/apply-style.ts                                          # Emit classes/inline for paddingTop/Bottom, typography, gradient
components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx       # Render the three new controls + section guards
```

**New files:**
```
components/admin/page-builder/RightSidebar/controls/
├── PaddingTopBottomControl.tsx     # Two paired PaddingControl-style pickers (top + bottom)
├── TypographyControl.tsx            # Text size + weight selectors
└── GradientControl.tsx              # from + to + direction (linear gradient builder)
```

**Deleted files:** None — the existing `PaddingControl` stays available as a fallback for any block that hasn't migrated to top/bottom split.

---

## Task 1: Extend `BlockStyle` + `BlockStyleSupport` with new fields

**Files:**
- Modify: `lib/blocks/types.ts`

- [ ] **Step 1: Extend `BlockStyle`**

In `lib/blocks/types.ts`, add to the `BlockStyle` interface:

```typescript
  /** When set, replaces `paddingY` for the top side. Backward-compat: blocks
   *  that only have `paddingY` use it for both sides via applyBlockStyle. */
  paddingTop?: DeviceValue<PaddingSize>
  /** When set, replaces `paddingY` for the bottom side. */
  paddingBottom?: DeviceValue<PaddingSize>
  textSize?: DeviceValue<TextSize>
  textWeight?: DeviceValue<TextWeight>
  /** Linear gradient. Overrides `backgroundColor` when both are set. */
  backgroundGradient?: BackgroundGradient
```

Add the new types (place them with the other `Padding/Alignment/...` aliases):

```typescript
export type TextSize = "sm" | "base" | "lg" | "xl"
export type TextWeight = "regular" | "medium" | "semibold" | "bold"

export interface BackgroundGradient {
  from: string                         // hex/rgb
  to: string                           // hex/rgb
  direction: GradientDirection
}

export type GradientDirection =
  | "to-right"
  | "to-left"
  | "to-bottom"
  | "to-top"
  | "to-bottom-right"
  | "to-bottom-left"
```

- [ ] **Step 2: Extend `BlockStyleSupport`**

Add to `BlockStyleSupport`:

```typescript
  paddingTopBottom?: boolean       // default: true. When false, only the legacy `paddingY` (Plan 2 control) is shown.
  typography?: boolean              // default: true.
  gradient?: boolean                // default: false (opt-in — most blocks won't expose gradients).
```

Update `resolveStyleSupport` to include the three new defaults:

```typescript
    paddingTopBottom: partial?.paddingTopBottom ?? true,
    typography: partial?.typography ?? true,
    gradient: partial?.gradient ?? false,
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/blocks/types.ts
git commit -m "feat(blocks): extend BlockStyle + BlockStyleSupport with paddingTop/Bottom, typography, gradient"
```

---

## Task 2: Extend `applyBlockStyle` for the new fields

**Files:**
- Modify: `lib/blocks/apply-style.ts`

- [ ] **Step 1: Update the function**

The existing `applyBlockStyle(style)` returns `{ className, style }`. Add four new behaviors:

1. If `style.paddingTop` is set → emit `pt-*` from a new `PADDING_TOP_CLASS` table.
2. If `style.paddingBottom` is set → emit `pb-*` from a new `PADDING_BOTTOM_CLASS` table.
3. If `style.paddingTop` AND `style.paddingBottom` are both unset BUT legacy `style.paddingY` is set → fall back to the existing `PADDING_CLASS[style.paddingY]` (current behavior). This keeps stored content rendering correctly.
4. If `style.textSize` is set → emit `text-sm`/`text-base`/`text-lg`/`text-xl`.
5. If `style.textWeight` is set → emit `font-normal`/`font-medium`/`font-semibold`/`font-bold`.
6. If `style.backgroundGradient` is set → set inline `style.backgroundImage = "linear-gradient(<dir>, <from>, <to>)"`. This OVERRIDES the inline `backgroundColor` set from `style.backgroundColor` (gradient wins).

Example skeleton (replace the existing class-emission block):

```typescript
// Padding: prefer top/bottom split when set, else fall back to legacy paddingY.
if (style.paddingTop) classes.push(PADDING_TOP_CLASS[style.paddingTop as PaddingSize])
if (style.paddingBottom) classes.push(PADDING_BOTTOM_CLASS[style.paddingBottom as PaddingSize])
if (!style.paddingTop && !style.paddingBottom && style.paddingY) {
  classes.push(PADDING_CLASS[style.paddingY as PaddingSize])
}

if (style.textSize) classes.push(TEXT_SIZE_CLASS[style.textSize as TextSize])
if (style.textWeight) classes.push(TEXT_WEIGHT_CLASS[style.textWeight as TextWeight])
```

Add the new tables:

```typescript
const PADDING_TOP_CLASS: Record<PaddingSize, string> = {
  none: "pt-0",
  sm: "pt-4 @md:pt-6",
  md: "pt-8 @md:pt-10",
  lg: "pt-12 @md:pt-16",
  xl: "pt-16 @md:pt-24",
}

const PADDING_BOTTOM_CLASS: Record<PaddingSize, string> = {
  none: "pb-0",
  sm: "pb-4 @md:pb-6",
  md: "pb-8 @md:pb-10",
  lg: "pb-12 @md:pb-16",
  xl: "pb-16 @md:pb-24",
}

const TEXT_SIZE_CLASS: Record<TextSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
}

const TEXT_WEIGHT_CLASS: Record<TextWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
}
```

For the gradient, append after the existing color logic:

```typescript
if (style.backgroundGradient) {
  const g = style.backgroundGradient
  inline.backgroundImage = `linear-gradient(${gradientDirection(g.direction)}, ${g.from}, ${g.to})`
  // gradient overrides flat backgroundColor — clear it so both don't fight
  delete inline.backgroundColor
}
```

And the helper:

```typescript
function gradientDirection(d: GradientDirection): string {
  switch (d) {
    case "to-right": return "to right"
    case "to-left": return "to left"
    case "to-top": return "to top"
    case "to-bottom": return "to bottom"
    case "to-bottom-right": return "to bottom right"
    case "to-bottom-left": return "to bottom left"
  }
}
```

Import the new types at the top of `apply-style.ts`.

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add lib/blocks/apply-style.ts
git commit -m "feat(blocks): apply-style emits classes/inline for paddingTop/Bottom + typography + gradient"
```

---

## Task 3: Build `PaddingTopBottomControl`

**Files:**
- Create: `components/admin/page-builder/RightSidebar/controls/PaddingTopBottomControl.tsx`

A control that pairs two `PaddingControl`-style pickers — one for top, one for bottom — and emits two values to the parent. The parent (StyleTab) writes them to `style.paddingTop` and `style.paddingBottom` independently.

Use the same SVG-button preset row pattern as the existing `PaddingControl` so the UX is consistent. Each row has its own `DeviceOverrideWrapper` (so admin can override only top or only bottom per device).

```typescript
"use client"

import { cn } from "@/lib/utils"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue, PaddingSize } from "@/lib/blocks/types"

const OPTIONS: PaddingSize[] = ["none", "sm", "md", "lg", "xl"]
const LABELS: Record<PaddingSize, string> = {
  none: "—", sm: "S", md: "M", lg: "L", xl: "XL",
}

interface Props {
  topValue: DeviceValue<PaddingSize> | undefined
  bottomValue: DeviceValue<PaddingSize> | undefined
  onTopChange: (v: DeviceValue<PaddingSize> | undefined) => void
  onBottomChange: (v: DeviceValue<PaddingSize> | undefined) => void
}

export function PaddingTopBottomControl({ topValue, bottomValue, onTopChange, onBottomChange }: Props) {
  return (
    <div className="space-y-3">
      <DeviceOverrideWrapper
        label="Padding superior"
        value={topValue}
        onChange={onTopChange}
        render={(v, setV) => <PaddingRow current={v} onChange={setV} />}
      />
      <DeviceOverrideWrapper
        label="Padding inferior"
        value={bottomValue}
        onChange={onBottomChange}
        render={(v, setV) => <PaddingRow current={v} onChange={setV} />}
      />
    </div>
  )
}

function PaddingRow({ current, onChange }: { current: PaddingSize | undefined; onChange: (v: PaddingSize) => void }) {
  return (
    <div className="inline-flex rounded-md border bg-background p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded transition-colors",
            current === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={current === opt}
          title={`Padding ${opt}`}
        >
          {LABELS[opt]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 1: Create the file** (above)
- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add components/admin/page-builder/RightSidebar/controls/PaddingTopBottomControl.tsx
git commit -m "feat(blocks): add PaddingTopBottomControl with paired top/bottom presets"
```

---

## Task 4: Build `TypographyControl`

**Files:**
- Create: `components/admin/page-builder/RightSidebar/controls/TypographyControl.tsx`

Two paired selectors — text size and weight — using the same row-of-buttons pattern.

```typescript
"use client"

import { cn } from "@/lib/utils"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue, TextSize, TextWeight } from "@/lib/blocks/types"

const SIZE_OPTIONS: TextSize[] = ["sm", "base", "lg", "xl"]
const SIZE_LABELS: Record<TextSize, string> = { sm: "S", base: "M", lg: "L", xl: "XL" }

const WEIGHT_OPTIONS: TextWeight[] = ["regular", "medium", "semibold", "bold"]
const WEIGHT_LABELS: Record<TextWeight, string> = {
  regular: "Reg", medium: "Med", semibold: "Semi", bold: "Bold",
}

interface Props {
  size: DeviceValue<TextSize> | undefined
  weight: DeviceValue<TextWeight> | undefined
  onSizeChange: (v: DeviceValue<TextSize> | undefined) => void
  onWeightChange: (v: DeviceValue<TextWeight> | undefined) => void
}

export function TypographyControl({ size, weight, onSizeChange, onWeightChange }: Props) {
  return (
    <div className="space-y-3">
      <DeviceOverrideWrapper
        label="Tamaño de texto"
        value={size}
        onChange={onSizeChange}
        render={(v, setV) => (
          <Row options={SIZE_OPTIONS} labels={SIZE_LABELS} current={v} onChange={setV} />
        )}
      />
      <DeviceOverrideWrapper
        label="Peso de texto"
        value={weight}
        onChange={onWeightChange}
        render={(v, setV) => (
          <Row options={WEIGHT_OPTIONS} labels={WEIGHT_LABELS} current={v} onChange={setV} />
        )}
      />
    </div>
  )
}

function Row<T extends string>({
  options, labels, current, onChange,
}: {
  options: T[]
  labels: Record<T, string>
  current: T | undefined
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border bg-background p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded transition-colors",
            current === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={current === opt}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 1: Create the file**
- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add components/admin/page-builder/RightSidebar/controls/TypographyControl.tsx
git commit -m "feat(blocks): add TypographyControl (text size + weight)"
```

---

## Task 5: Build `GradientControl`

**Files:**
- Create: `components/admin/page-builder/RightSidebar/controls/GradientControl.tsx`

Two color pickers (from / to) + a direction selector + an "Enable gradient" switch. Without the switch, admins might enable gradients accidentally just by picking a color.

```typescript
"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { BackgroundGradient, GradientDirection } from "@/lib/blocks/types"

const DIRECTIONS: { value: GradientDirection; label: string }[] = [
  { value: "to-right", label: "→ Derecha" },
  { value: "to-left", label: "← Izquierda" },
  { value: "to-bottom", label: "↓ Abajo" },
  { value: "to-top", label: "↑ Arriba" },
  { value: "to-bottom-right", label: "↘ Diagonal abajo-derecha" },
  { value: "to-bottom-left", label: "↙ Diagonal abajo-izquierda" },
]

interface Props {
  value: BackgroundGradient | undefined
  onChange: (v: BackgroundGradient | undefined) => void
}

export function GradientControl({ value, onChange }: Props) {
  const enabled = !!value
  const g: BackgroundGradient = value ?? { from: "#3b82f6", to: "#a855f7", direction: "to-right" }

  const setEnabled = (on: boolean) => onChange(on ? g : undefined)
  const update = (patch: Partial<BackgroundGradient>) => onChange({ ...g, ...patch })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={setEnabled} id="gradient-enabled" />
        <Label htmlFor="gradient-enabled" className="text-xs">Usar gradiente de fondo</Label>
      </div>

      {enabled && (
        <div className="space-y-2 pl-6">
          <ColorPair label="Color inicial" value={g.from} onChange={(v) => update({ from: v })} />
          <ColorPair label="Color final" value={g.to} onChange={(v) => update({ to: v })} />
          <div>
            <Label className="text-xs mb-1 block">Dirección</Label>
            <Select value={g.direction} onValueChange={(v) => update({ direction: v as GradientDirection })}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div
            className="h-10 rounded-md border"
            style={{ backgroundImage: `linear-gradient(${g.direction.replace("-", " ")}, ${g.from}, ${g.to})` }}
          />
        </div>
      )}
    </div>
  )
}

function ColorPair({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs mb-1 block">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded border cursor-pointer p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs h-8 font-mono flex-1"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 1: Create the file**
- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add components/admin/page-builder/RightSidebar/controls/GradientControl.tsx
git commit -m "feat(blocks): add GradientControl (from/to/direction + live preview swatch)"
```

---

## Task 6: Wire the new controls into `StyleTab`

**Files:**
- Modify: `components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx`

The tab already filters sections via `resolveStyleSupport`. Three integration points:

1. **Padding**: When `support.paddingTopBottom` is true (default), render `PaddingTopBottomControl` instead of the legacy `PaddingControl`. Migration: read both legacy `style.paddingY` and new `paddingTop`/`paddingBottom`. If only `paddingY` exists, treat it as the initial value for both top and bottom (so the admin sees their existing setting). When the admin changes either, write to the new fields and clear `paddingY` (one-time migration on edit). If `support.paddingTopBottom` is false, keep the legacy single-padding control.

2. **Typography**: Wrap in a new section "Tipografía" guarded by `support.typography`. Render the `TypographyControl` reading/writing `style.textSize` and `style.textWeight`.

3. **Gradient**: Add a new section "Gradiente" guarded by `support.gradient` (opt-in). Render the `GradientControl` writing `style.backgroundGradient`.

Add the new section booleans alongside the existing `showColors`/`showLayout`/`showBorders`:

```typescript
const showTypography = support.typography
const showGradient = support.gradient
```

In the JSX, replace the existing `Espaciado` section with the new logic, add a `Tipografía` section between `Espaciado` and `Layout`, and add a `Gradiente` section after `Colores` (or wherever it fits visually):

```jsx
{support.padding && (
  <Section title="Espaciado">
    {support.paddingTopBottom ? (
      <PaddingTopBottomControl
        topValue={style.paddingTop ?? style.paddingY /* legacy fallback */}
        bottomValue={style.paddingBottom ?? style.paddingY}
        onTopChange={(v) => patchStyleMigratePadding({ paddingTop: v })}
        onBottomChange={(v) => patchStyleMigratePadding({ paddingBottom: v })}
      />
    ) : (
      <PaddingControl
        value={style.paddingY}
        onChange={(v) => patchStyle("paddingY", v)}
      />
    )}
  </Section>
)}

{showGradient && (
  <Section title="Gradiente">
    <GradientControl
      value={style.backgroundGradient}
      onChange={(v) => patchStyle("backgroundGradient", v)}
    />
  </Section>
)}

{showTypography && (
  <Section title="Tipografía">
    <TypographyControl
      size={style.textSize}
      weight={style.textWeight}
      onSizeChange={(v) => patchStyle("textSize", v)}
      onWeightChange={(v) => patchStyle("textWeight", v)}
    />
  </Section>
)}
```

Add `patchStyleMigratePadding` helper alongside `patchStyle`:

```typescript
function patchStyleMigratePadding(patch: Partial<BlockStyle>) {
  // First admin interaction with the new control: drop legacy paddingY so the
  // top/bottom values become the source of truth.
  const next = { ...style, ...patch }
  if ((patch.paddingTop || patch.paddingBottom) && next.paddingY) {
    delete next.paddingY
  }
  updateBlockContent(block!.id, { ...content, style: next })
}
```

- [ ] **Step 1: Update the file**
- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit
git add components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx
git commit -m "feat(page-builder): StyleTab renders new padding-split, typography, gradient controls"
```

---

## Task 7: Final smoke test + merge

- [ ] **Step 1: Build**

```bash
npx tsc --noEmit
npm run build
```

Both pass.

- [ ] **Step 2: Manual verification**

For at least 3 different blocks:
1. Open Style tab → confirm "Espaciado" now shows two separate top/bottom rows.
2. Set top = L, bottom = S → block visibly has more space above than below.
3. Existing block with legacy `paddingY = "md"` (no top/bottom yet): both rows show "M" as initial value.
4. Set top = none → confirm `paddingY` is dropped from the saved content (open Avanzado / DB and confirm).
5. Tipografía: change size + weight → text in the block reflects the change.
6. Gradient: enable on a block whose `styleSupport.gradient` is true → preview swatch updates, block background renders the gradient on the canvas + storefront.

Per-block `styleSupport.gradient` is opt-in. Manually opt HERO and IMAGE_TEXT in by adding `styleSupport: { gradient: true, ... }` to their entries in `register-existing-blocks.tsx` (small follow-up edit during smoke test). Other blocks stay without gradient.

- [ ] **Step 3: Merge**

```bash
git checkout master
git merge --no-ff feature/page-builder-plan-2-8 -m "Merge Plan 2.8: advanced style controls (padding split, typography, gradient)"
```

---

## What's next

**Plan 3 — Templates with sync.** Reusable landing templates that can be applied to multiple products, with block-level detach/sync semantics. See `docs/superpowers/specs/2026-04-23-page-builder-visual-design.md` section 6 for the full design.

GALLERY data-shape migration (deferred from Plan 2.7) can be folded into Plan 3 as a Phase 0, or run as a small dedicated mini-plan.

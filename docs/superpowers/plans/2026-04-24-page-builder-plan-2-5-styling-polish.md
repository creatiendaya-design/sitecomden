# Page Builder — Plan 2.5: Styling Polish + Block-aware Style Controls + RichText Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps found during Plan 2 smoke testing: (1) split padding into top/bottom, (2) add typography controls, (3) add gradient backgrounds, (4) make the Style tab **block-aware** — hide sections that don't apply to the selected block (Shopify-style, not Elementor-style), (5) fix RICH_TEXT centering, and (6) fix broken RichTextEditor functionality.

**Architecture:** Extend `BlockStyle` with new optional fields (backward-compatible). Add a per-block `styleSupport` declaration in the registry so each block type declares which style sections apply to it; StyleTab renders only the supported sections. Widen DOMPurify's allow-list and fix the cursor-jump sync pattern in the rich-text editor.

**Tech Stack:** TypeScript, React 19, Tailwind v4 with `@container`, TipTap (StarterKit + Underline + Link + Image + TextAlign), DOMPurify.

**Source:** [Plan 3 backlog](./plan-3-backlog.md) + user request during Plan 2 smoke test for Shopify-style per-block control filtering.
**Preceded by:** [Plan 1](./2026-04-23-page-builder-plan-1-foundation-editor.md) and [Plan 2](./2026-04-23-page-builder-plan-2-styling-new-blocks.md) (both merged to master).

**Scope explicitly NOT covered:** Templates with sync (Plan 3). E2E tests + cleanup (Plan 4). Per-device override on typography/padding-top/padding-bottom/gradient (deferred — admins can open override in Plan 3+). Opacity, animations on scroll, CSS custom per block (deferred indefinitely).

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
lib/blocks/types.ts                                                # Extend BlockStyle with 5 new optional fields + BlockStyleSupport type
lib/blocks/apply-style.ts                                          # Emit classes/inline for new fields
lib/blocks/defaults.ts                                             # Default paddingTop/paddingBottom instead of legacy paddingY
lib/blocks/registry.ts                                             # Add styleSupport to BlockDefinition interface
lib/blocks/register-existing-blocks.tsx                            # Declare styleSupport per block type
components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx       # Block-aware section filtering + new controls
components/shop/templates/blocks/RichTextBlock.tsx                 # Alignment centering + DOMPurify allow-list
components/admin/RichTextEditor.tsx                                # Remove cursor-jump useEffect
```

**New files:**
```
components/admin/page-builder/RightSidebar/controls/TypographyControl.tsx
components/admin/page-builder/RightSidebar/controls/GradientControl.tsx
components/admin/page-builder/RightSidebar/controls/PaddingTopBottomControl.tsx
```

---

## Task 1: Extend `BlockStyle` with new optional fields + add `BlockStyleSupport` type

**Why:** All new controls need a place in the type to write. The `BlockStyleSupport` type declares which fields apply to a given block (Shopify-style filtering).

**Files:**
- Modify: `lib/blocks/types.ts`

- [ ] **Step 1: Read the current file to locate the right sections**

```bash
grep -n "BlockStyle\|PaddingSize\|Alignment" lib/blocks/types.ts
```

Confirm where `BlockStyle` interface lives and where the type aliases are defined.

- [ ] **Step 2: Add new type aliases near the existing ones**

Open `lib/blocks/types.ts`. After the existing `Visibility` type export, add:

```typescript
/** Relative text-size preset. Applied as Tailwind text-* on the block wrapper. */
export type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl"

/** Font weight preset. */
export type TextWeight = "normal" | "medium" | "semibold" | "bold"

/** Gradient direction — 4 common options are enough for Level 2. */
export type GradientDirection = "to-r" | "to-b" | "to-br" | "to-bl"

/** Two-color gradient config. When present on BlockStyle.backgroundGradient,
 *  it wins over backgroundColor. */
export interface BackgroundGradient {
  from: string    // hex color e.g. "#ff0000"
  to: string
  direction: GradientDirection
}

/**
 * Declares which style-tab sections apply to a block type. Each field is
 * opt-out (default true) EXCEPT bgImage which is opt-in (default false) —
 * most blocks should not show "Imagen de fondo" as a control.
 *
 * A block type sets `styleSupport` in its BlockDefinition (registry) to
 * hide irrelevant sections from the Style tab.
 */
export interface BlockStyleSupport {
  backgroundColor?: boolean        // default: true
  backgroundGradient?: boolean     // default: true
  textColor?: boolean              // default: true
  padding?: boolean                // default: true
  typography?: boolean             // default: true
  alignment?: boolean              // default: true
  containerWidth?: boolean         // default: true
  cornerRadius?: boolean           // default: true
  border?: boolean                 // default: true
  shadow?: boolean                 // default: true
  visibility?: boolean             // default: true (always visible — admins need to be able to hide any block)
  bgImage?: boolean                // default: FALSE (opt-in)
}

/** Resolves a partial BlockStyleSupport to a fully-populated record with
 *  the defaults listed above. */
export function resolveStyleSupport(partial: Partial<BlockStyleSupport> | undefined): Required<BlockStyleSupport> {
  return {
    backgroundColor: partial?.backgroundColor ?? true,
    backgroundGradient: partial?.backgroundGradient ?? true,
    textColor: partial?.textColor ?? true,
    padding: partial?.padding ?? true,
    typography: partial?.typography ?? true,
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

- [ ] **Step 3: Extend `BlockStyle` interface**

Still in `lib/blocks/types.ts`, find `export interface BlockStyle` and replace with:

```typescript
export interface BlockStyle {
  backgroundColor?: DeviceValue<string>
  /** When set, takes precedence over backgroundColor. Not device-overridable
   *  in Level 2 — admins rarely need gradient differences per device. */
  backgroundGradient?: BackgroundGradient
  textColor?: DeviceValue<string>
  /** Legacy uniform padding (both top and bottom). Preserved for backward-
   *  compat. When paddingTop or paddingBottom are set, they override this. */
  paddingY?: DeviceValue<PaddingSize>
  paddingTop?: DeviceValue<PaddingSize>
  paddingBottom?: DeviceValue<PaddingSize>
  textSize?: DeviceValue<TextSize>
  textWeight?: DeviceValue<TextWeight>
  alignment?: DeviceValue<Alignment>
  containerWidth?: DeviceValue<ContainerWidth>
  cornerRadius?: CornerRadius
  border?: BorderStyle
  shadow?: ShadowStyle
  visibility?: Visibility
}
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add lib/blocks/types.ts
git commit -m "feat(blocks): extend BlockStyle with new fields and add BlockStyleSupport type"
```

---

## Task 2: Update `applyBlockStyle` to emit classes/inline for new fields

**Why:** The helper converts BlockStyle to CSS. Each new field needs its mapping.

**Files:**
- Modify: `lib/blocks/apply-style.ts`
- Modify: `scripts/verify-apply-style.ts`

- [ ] **Step 1: Replace the helper**

Replace `lib/blocks/apply-style.ts` with:

```typescript
import type { CSSProperties } from "react"
import type {
  BlockStyle,
  PaddingSize,
  Alignment,
  ContainerWidth,
  CornerRadius,
  BorderStyle,
  ShadowStyle,
  TextSize,
  TextWeight,
  BackgroundGradient,
  GradientDirection,
} from "./types"

export function applyBlockStyle(style: BlockStyle | undefined): {
  className: string
  style: CSSProperties
} {
  if (!style) return { className: "", style: {} }

  const classes: string[] = []
  const inline: CSSProperties = {}

  // Padding: prefer explicit top/bottom, fall back to paddingY (legacy)
  const paddingTop = (style.paddingTop ?? style.paddingY) as PaddingSize | undefined
  const paddingBottom = (style.paddingBottom ?? style.paddingY) as PaddingSize | undefined
  if (paddingTop) classes.push(PADDING_TOP_CLASS[paddingTop])
  if (paddingBottom) classes.push(PADDING_BOTTOM_CLASS[paddingBottom])

  if (style.alignment) classes.push(ALIGNMENT_CLASS[style.alignment as Alignment])
  if (style.containerWidth) classes.push(CONTAINER_WIDTH_CLASS[style.containerWidth as ContainerWidth])
  if (style.cornerRadius) classes.push(CORNER_RADIUS_CLASS[style.cornerRadius])
  if (style.border) classes.push(BORDER_CLASS[style.border])
  if (style.shadow) classes.push(SHADOW_CLASS[style.shadow])

  if (style.textSize) classes.push(TEXT_SIZE_CLASS[style.textSize as TextSize])
  if (style.textWeight) classes.push(TEXT_WEIGHT_CLASS[style.textWeight as TextWeight])

  // Gradient wins over flat color when both are set.
  if (style.backgroundGradient) {
    const g = style.backgroundGradient as BackgroundGradient
    inline.backgroundImage = `linear-gradient(${DIRECTION_CSS[g.direction]}, ${g.from}, ${g.to})`
  } else if (typeof style.backgroundColor === "string") {
    inline.backgroundColor = style.backgroundColor
  }
  if (typeof style.textColor === "string") {
    inline.color = style.textColor
  }

  return { className: classes.filter(Boolean).join(" "), style: inline }
}

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

const ALIGNMENT_CLASS: Record<Alignment, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

const CONTAINER_WIDTH_CLASS: Record<ContainerWidth, string> = {
  narrow: "[--landing-container:48rem]",
  normal: "[--landing-container:72rem]",
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

const TEXT_SIZE_CLASS: Record<TextSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
}

const TEXT_WEIGHT_CLASS: Record<TextWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
}

const DIRECTION_CSS: Record<GradientDirection, string> = {
  "to-r": "to right",
  "to-b": "to bottom",
  "to-br": "to bottom right",
  "to-bl": "to bottom left",
}
```

- [ ] **Step 2: Extend the verification script**

At the end of `scripts/verify-apply-style.ts` (before the final `if (failures > 0)` check), append:

```typescript
console.log("\nNew Plan 2.5 fields:")

const paddingSplit = applyBlockStyle({
  paddingTop: "sm",
  paddingBottom: "xl",
})
expect(paddingSplit.className.includes("pt-4"), true, "paddingTop sm → pt-4")
expect(paddingSplit.className.includes("pb-16"), true, "paddingBottom xl → pb-16")

const paddingLegacy = applyBlockStyle({ paddingY: "md" })
expect(paddingLegacy.className.includes("pt-8"), true, "paddingY md fallback → pt-8")
expect(paddingLegacy.className.includes("pb-8"), true, "paddingY md fallback → pb-8")

const typography = applyBlockStyle({
  textSize: "lg",
  textWeight: "bold",
})
expect(typography.className.includes("text-lg"), true, "textSize lg → text-lg")
expect(typography.className.includes("font-bold"), true, "textWeight bold → font-bold")

const gradient = applyBlockStyle({
  backgroundGradient: { from: "#ff0000", to: "#0000ff", direction: "to-r" },
  backgroundColor: "#ffffff",  // ignored when gradient is set
})
expect(gradient.style.backgroundImage, "linear-gradient(to right, #ff0000, #0000ff)", "gradient → linear-gradient CSS")
expect(gradient.style.backgroundColor, undefined, "gradient wins over backgroundColor")
```

- [ ] **Step 3: Run the verification**

```bash
npx tsx scripts/verify-apply-style.ts
```

Expected: all assertions pass.

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/blocks/apply-style.ts scripts/verify-apply-style.ts
git commit -m "feat(blocks): extend applyBlockStyle with paddingTop/Bottom, typography, gradient"
```

---

## Task 3: Create `PaddingTopBottomControl`

**Why:** Current PaddingControl writes to `paddingY` (uniform). Users want independent top/bottom. New control has a toggle "Uniforme / Separado" and writes to `paddingTop`/`paddingBottom`.

**Files:**
- Create: `components/admin/page-builder/RightSidebar/controls/PaddingTopBottomControl.tsx`

- [ ] **Step 1: Create the control**

```typescript
"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { DeviceValue, PaddingSize } from "@/lib/blocks/types"

const OPTIONS: PaddingSize[] = ["none", "sm", "md", "lg", "xl"]
const LABELS: Record<PaddingSize, string> = {
  none: "—",
  sm: "S",
  md: "M",
  lg: "L",
  xl: "XL",
}

interface Props {
  paddingTop?: PaddingSize | DeviceValue<PaddingSize>
  paddingBottom?: PaddingSize | DeviceValue<PaddingSize>
  paddingYFallback?: PaddingSize | DeviceValue<PaddingSize>
  /** Called when the user changes either field. Caller clears legacy
   *  paddingY to avoid two fields fighting at render time. */
  onChange: (next: { paddingTop?: PaddingSize; paddingBottom?: PaddingSize }) => void
}

function flatten(v: PaddingSize | DeviceValue<PaddingSize> | undefined): PaddingSize | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v === "string") return v as PaddingSize
  const o = v as { desktop?: PaddingSize; mobile?: PaddingSize }
  return o.desktop ?? o.mobile
}

export function PaddingTopBottomControl({
  paddingTop,
  paddingBottom,
  paddingYFallback,
  onChange,
}: Props) {
  const fallback = flatten(paddingYFallback)
  const topFlat = flatten(paddingTop) ?? fallback
  const bottomFlat = flatten(paddingBottom) ?? fallback

  const [mode, setMode] = useState<"uniform" | "split">(() => {
    const t = flatten(paddingTop)
    const b = flatten(paddingBottom)
    if ((t !== undefined || b !== undefined) && t !== b) return "split"
    return "uniform"
  })

  const setUniform = (v: PaddingSize) => {
    onChange({ paddingTop: v, paddingBottom: v })
  }

  const setTop = (v: PaddingSize) => {
    onChange({ paddingTop: v, paddingBottom: bottomFlat })
  }

  const setBottom = (v: PaddingSize) => {
    onChange({ paddingTop: topFlat, paddingBottom: v })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Padding vertical
        </Label>
        <div className="inline-flex rounded border text-[10px] overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("uniform")}
            className={cn(
              "px-2 py-0.5 transition-colors",
              mode === "uniform" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            Uniforme
          </button>
          <button
            type="button"
            onClick={() => setMode("split")}
            className={cn(
              "px-2 py-0.5 transition-colors",
              mode === "split" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            Separado
          </button>
        </div>
      </div>

      {mode === "uniform" ? (
        <Pills active={topFlat} onPick={setUniform} />
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-14 text-muted-foreground">Top</span>
            <Pills active={topFlat} onPick={setTop} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-14 text-muted-foreground">Bottom</span>
            <Pills active={bottomFlat} onPick={setBottom} />
          </div>
        </div>
      )}
    </div>
  )
}

function Pills({ active, onPick }: { active: PaddingSize | undefined; onPick: (v: PaddingSize) => void }) {
  return (
    <div className="inline-flex rounded-md border bg-background p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onPick(opt)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded transition-colors",
            active === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={active === opt}
          title={`Padding ${opt}`}
        >
          {LABELS[opt]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/page-builder/RightSidebar/controls/PaddingTopBottomControl.tsx
git commit -m "feat(page-builder): add PaddingTopBottomControl with uniform/split modes"
```

---

## Task 4: Create `TypographyControl`

**Files:**
- Create: `components/admin/page-builder/RightSidebar/controls/TypographyControl.tsx`

- [ ] **Step 1: Create the control**

```typescript
"use client"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { TextSize, TextWeight } from "@/lib/blocks/types"

const SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: "xs", label: "XS" },
  { value: "sm", label: "S" },
  { value: "base", label: "M" },
  { value: "lg", label: "L" },
  { value: "xl", label: "XL" },
  { value: "2xl", label: "2XL" },
]

const WEIGHT_OPTIONS: { value: TextWeight; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "medium", label: "Medio" },
  { value: "semibold", label: "Semi" },
  { value: "bold", label: "Bold" },
]

interface Props {
  size?: TextSize
  weight?: TextWeight
  onSizeChange: (v: TextSize | undefined) => void
  onWeightChange: (v: TextWeight | undefined) => void
}

export function TypographyControl({ size, weight, onSizeChange, onWeightChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 block">
          Tamaño
        </Label>
        <div className="inline-flex rounded-md border bg-background p-0.5">
          {SIZE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onSizeChange(size === value ? undefined : value)}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded transition-colors",
                size === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={size === value}
              title={label}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 block">
          Peso
        </Label>
        <div className="inline-flex rounded-md border bg-background p-0.5">
          {WEIGHT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onWeightChange(weight === value ? undefined : value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded transition-colors",
                weight === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={weight === value}
              title={label}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check and commit**

```bash
npx tsc --noEmit
git add components/admin/page-builder/RightSidebar/controls/TypographyControl.tsx
git commit -m "feat(page-builder): add TypographyControl with size and weight presets"
```

---

## Task 5: Create `GradientControl`

**Files:**
- Create: `components/admin/page-builder/RightSidebar/controls/GradientControl.tsx`

- [ ] **Step 1: Create the control**

```typescript
"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ArrowRight, ArrowDown, ArrowDownRight, ArrowDownLeft } from "lucide-react"
import type { BackgroundGradient, GradientDirection } from "@/lib/blocks/types"

const DIRECTIONS: { value: GradientDirection; Icon: typeof ArrowRight; label: string }[] = [
  { value: "to-r", Icon: ArrowRight, label: "Horizontal" },
  { value: "to-b", Icon: ArrowDown, label: "Vertical" },
  { value: "to-br", Icon: ArrowDownRight, label: "Diagonal ↘" },
  { value: "to-bl", Icon: ArrowDownLeft, label: "Diagonal ↙" },
]

interface Props {
  value: BackgroundGradient | undefined
  onChange: (next: BackgroundGradient | undefined) => void
}

const DEFAULT_GRADIENT: BackgroundGradient = {
  from: "#3b82f6",
  to: "#8b5cf6",
  direction: "to-br",
}

export function GradientControl({ value, onChange }: Props) {
  const enabled = Boolean(value)

  const toggle = (on: boolean) => {
    onChange(on ? (value ?? DEFAULT_GRADIENT) : undefined)
  }

  const patch = (delta: Partial<BackgroundGradient>) => {
    const base = value ?? DEFAULT_GRADIENT
    onChange({ ...base, ...delta })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Gradiente de fondo
        </Label>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>

      {enabled && value && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] mb-1 block">De</Label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={value.from}
                  onChange={(e) => patch({ from: e.target.value })}
                  className="h-8 w-10 rounded border cursor-pointer p-0.5"
                  aria-label="Color de inicio"
                />
                <Input
                  value={value.from}
                  onChange={(e) => patch({ from: e.target.value })}
                  className="text-xs h-8 font-mono"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] mb-1 block">A</Label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={value.to}
                  onChange={(e) => patch({ to: e.target.value })}
                  className="h-8 w-10 rounded border cursor-pointer p-0.5"
                  aria-label="Color de fin"
                />
                <Input
                  value={value.to}
                  onChange={(e) => patch({ to: e.target.value })}
                  className="text-xs h-8 font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-[10px] mb-1 block">Dirección</Label>
            <div className="inline-flex rounded-md border bg-background p-0.5">
              {DIRECTIONS.map(({ value: opt, Icon, label }) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => patch({ direction: opt })}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    value.direction === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={value.direction === opt}
                  aria-label={label}
                  title={label}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          <div
            className="h-12 rounded-md border"
            style={{
              backgroundImage: `linear-gradient(${cssDirection(value.direction)}, ${value.from}, ${value.to})`,
            }}
            aria-label="Vista previa del gradiente"
          />
          <p className="text-[11px] text-muted-foreground">
            Cuando el gradiente está activo, se muestra en lugar del color sólido.
          </p>
        </div>
      )}
    </div>
  )
}

function cssDirection(d: GradientDirection): string {
  switch (d) {
    case "to-r": return "to right"
    case "to-b": return "to bottom"
    case "to-br": return "to bottom right"
    case "to-bl": return "to bottom left"
  }
}
```

- [ ] **Step 2: Run TypeScript check and commit**

```bash
npx tsc --noEmit
git add components/admin/page-builder/RightSidebar/controls/GradientControl.tsx
git commit -m "feat(page-builder): add GradientControl with 2-color gradient and preview"
```

---

## Task 6: Add `styleSupport` to `BlockDefinition` in the registry

**Why:** Each block type needs to declare which style fields apply to it so the StyleTab can hide irrelevant sections (Shopify-style).

**Files:**
- Modify: `lib/blocks/registry.ts`

- [ ] **Step 1: Read the current file**

```bash
grep -n "BlockDefinition" lib/blocks/registry.ts
```

- [ ] **Step 2: Add the optional field**

Open `lib/blocks/registry.ts`. Find the `BlockDefinition` interface. Add one line importing the type, then add the optional field:

At the top near existing imports:
```typescript
import type { BlockCategory, BlockContentV2, BlockScope, LandingBlockType, BlockStyleSupport } from "./types"
```

Inside `interface BlockDefinition`, add this field (before the closing `}`):

```typescript
  /** Declares which style-tab sections apply to this block type.
   *  Each field is optional; unset fields default per `resolveStyleSupport()`
   *  (all true except `bgImage` which defaults to false). */
  styleSupport?: Partial<BlockStyleSupport>
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/blocks/registry.ts
git commit -m "feat(blocks): add styleSupport field to BlockDefinition for per-block style filtering"
```

---

## Task 7: Declare `styleSupport` for each registered block

**Why:** Now that the field exists, populate it with sensible declarations per block type.

**Files:**
- Modify: `lib/blocks/register-existing-blocks.tsx`

The mapping (defaults are all-true except `bgImage` which is false):

| Block | backgroundColor | backgroundGradient | textColor | padding | typography | alignment | containerWidth | cornerRadius | border | shadow | visibility | bgImage |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **HERO** | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | **YES (opt-in)** |
| **BENEFITS** | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | no |
| **GALLERY** | (y) | (y) | **NO** | (y) | **NO** | **NO** | (y) | (y) | (y) | (y) | (y) | no |
| **TESTIMONIALS** | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | no |
| **VIDEO** | (y) | (y) | **NO** | (y) | **NO** | **NO** | (y) | (y) | (y) | (y) | (y) | no |
| **TICKER** | **NO** | **NO** | **NO** | (y) | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | (y) | no |
| **TRUST_BADGES** | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | no |
| **RICH_TEXT** | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | no |
| **FAQ** | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | no |
| **IMAGE_TEXT** | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | (y) | no |
| **RELATED_PRODUCTS** | (y) | (y) | **NO** | (y) | **NO** | **NO** | (y) | (y) | (y) | (y) | (y) | no |

(y) = default (true). Explicit `false` is needed only to hide a section.

- [ ] **Step 1: Read the current file**

```bash
grep -n "type: \"" lib/blocks/register-existing-blocks.tsx
```

- [ ] **Step 2: Add styleSupport to each entry in the `existing` array**

Open `lib/blocks/register-existing-blocks.tsx`. For each block in the `existing: BlockDefinition[]` array, add a `styleSupport` field matching the table above. Examples:

```typescript
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
    contentForm: HeroContentForm as any,
    styleSupport: { bgImage: true },  // HERO is the one block where bgImage is on
  },
  {
    type: "BENEFITS",
    // ... existing fields ...
    // no styleSupport needed — all defaults are correct
  },
  {
    type: "GALLERY",
    // ... existing fields ...
    styleSupport: { textColor: false, typography: false, alignment: false },
  },
  {
    type: "TESTIMONIALS",
    // ... defaults ok, no styleSupport needed
  },
  {
    type: "VIDEO",
    // ... existing fields ...
    styleSupport: { textColor: false, typography: false, alignment: false },
  },
  {
    type: "TICKER",
    // ... existing fields ...
    styleSupport: {
      backgroundColor: false,
      backgroundGradient: false,
      textColor: false,
      typography: false,
      alignment: false,
      containerWidth: false,
      cornerRadius: false,
      border: false,
      shadow: false,
      // padding and visibility remain default (true)
    },
  },
  {
    type: "TRUST_BADGES",
    // ... defaults ok
  },
  {
    type: "RICH_TEXT",
    // ... defaults ok
  },
  {
    type: "FAQ",
    // ... defaults ok
  },
  {
    type: "IMAGE_TEXT",
    // ... defaults ok
  },
  {
    type: "RELATED_PRODUCTS",
    // ... existing fields ...
    styleSupport: { textColor: false, typography: false, alignment: false },
  },
```

Note: COLORS block (removed from the picker in Plan 2) does not need `styleSupport` since it's not in the registry.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/blocks/register-existing-blocks.tsx
git commit -m "feat(blocks): declare styleSupport per registered block for Shopify-style filtering"
```

---

## Task 8: Update `StyleTab` to respect `styleSupport` + wire new controls

**Why:** With styleSupport declared, StyleTab can hide sections per block. Also wires in the 3 new controls from Tasks 3-5.

**Files:**
- Modify: `components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx`

- [ ] **Step 1: Replace the file**

Open `components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx` and replace its content with:

```typescript
"use client"

import { useBuilderStore } from "../../store"
import type {
  BlockStyle,
  DeviceValue,
  PaddingSize,
  TextSize,
  TextWeight,
  BackgroundGradient,
} from "@/lib/blocks/types"
import { resolveStyleSupport } from "@/lib/blocks/types"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { ColorControl } from "../controls/ColorControl"
import { GradientControl } from "../controls/GradientControl"
import { PaddingTopBottomControl } from "../controls/PaddingTopBottomControl"
import { TypographyControl } from "../controls/TypographyControl"
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

  function patchPadding(delta: { paddingTop?: PaddingSize; paddingBottom?: PaddingSize }) {
    updateBlockContent(block!.id, {
      ...content,
      style: {
        ...style,
        paddingTop: delta.paddingTop,
        paddingBottom: delta.paddingBottom,
        paddingY: undefined,
      } as BlockStyle,
    })
  }

  function patchMedia(key: "bgImage", value: { desktop?: string; mobile?: string } | undefined) {
    updateBlockContent(block!.id, {
      ...content,
      media: { ...content.media, [key]: value },
    })
  }

  const flatSize = flatten<TextSize>(style.textSize)
  const flatWeight = flatten<TextWeight>(style.textWeight)

  // Check if a section has at least one supported field before rendering
  const showColorsSection = support.backgroundColor || support.textColor || support.backgroundGradient
  const showTypographySection = support.typography
  const showPaddingSection = support.padding
  const showLayoutSection = support.alignment || support.containerWidth
  const showBordersSection = support.cornerRadius || support.border || support.shadow
  const showVisibilitySection = support.visibility
  const showBgImageSection = support.bgImage

  // Nothing supported? Rare, but render a friendly hint
  const anySupported =
    showColorsSection || showTypographySection || showPaddingSection ||
    showLayoutSection || showBordersSection || showVisibilitySection || showBgImageSection
  if (!anySupported) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        Este bloque no tiene opciones de estilo configurables.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showColorsSection && (
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
          {support.backgroundGradient && (
            <GradientControl
              value={style.backgroundGradient as BackgroundGradient | undefined}
              onChange={(v) => patchStyle("backgroundGradient", v)}
            />
          )}
        </Section>
      )}

      {showTypographySection && (
        <Section title="Tipografía">
          <TypographyControl
            size={flatSize}
            weight={flatWeight}
            onSizeChange={(v) => patchStyle("textSize", v)}
            onWeightChange={(v) => patchStyle("textWeight", v)}
          />
        </Section>
      )}

      {showPaddingSection && (
        <Section title="Espaciado">
          <PaddingTopBottomControl
            paddingTop={style.paddingTop}
            paddingBottom={style.paddingBottom}
            paddingYFallback={style.paddingY}
            onChange={patchPadding}
          />
        </Section>
      )}

      {showLayoutSection && (
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

      {showBordersSection && (
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

      {showVisibilitySection && (
        <Section title="Visibilidad">
          <VisibilityControl
            value={style.visibility}
            onChange={(v) => patchStyle("visibility", v)}
          />
        </Section>
      )}

      {showBgImageSection && (
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

function flatten<T>(v: T | { desktop?: T; mobile?: T } | undefined): T | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v !== "object") return v as T
  const o = v as { desktop?: T; mobile?: T }
  return o.desktop ?? o.mobile
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Manually verify block-aware filtering**

`npm run dev`, open the editor. Select each block type in turn and open Estilo tab. Verify:
- HERO → all sections visible including Imagen de fondo
- BENEFITS → Colors, Typography, Padding, Layout, Borders, Visibility (no Imagen de fondo)
- GALLERY → Colors (only bg), Padding, Container Width, Borders, Visibility (no Typography, no Alignment, no textColor)
- TICKER → only Padding + Visibility
- RELATED_PRODUCTS → no Typography, no Alignment, no textColor

- [ ] **Step 4: Commit**

```bash
git add components/admin/page-builder/RightSidebar/tabs/StyleTab.tsx
git commit -m "feat(page-builder): StyleTab filters sections by block.styleSupport + wires new controls"
```

---

## Task 9: Fix RICH_TEXT centering + widen DOMPurify allow-list

**Why:** User reports (1) alignment=center doesn't actually center the text, and (2) several editor toolbar functions don't work. The alignment bug is that `mx-auto` on `max-w-[65ch]` centers the CONTAINER but not the text inside — we need to apply the alignment class to the prose div itself. The editor-functions bug is mostly DOMPurify stripping the output; need to allow more tags/attrs.

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
  //  - <img> for inline images
  //  - <s>, <strike> for strikethrough
  //  - <code>, <pre> for inline/block code
  //  - <h1> so Título 1 isn't stripped
  //  - class attribute — TipTap text-align extension uses class="text-center" etc.
  //  - style attribute — some extensions use inline style for text-align
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "strike", "code", "pre",
      "a", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "img",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class", "style"],
    ALLOW_DATA_ATTR: false,
  });

  // Resolve the block-level alignment from Style tab → apply to the prose div
  // (not just the outer section) so the actual text centers/aligns correctly.
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

- [ ] **Step 3: Manual verification**

Add a RICH_TEXT block. Test:
- Bold, italic, underline, strike, code — all visible on the storefront after save
- H1/H2/H3 — render as proper headings
- Lists (bullet + ordered) — render correctly
- Link — clickable with `target="_blank" rel="noopener"`
- TipTap Align Center button — text centers
- Style tab Alignment = Center → text centers (same result)

- [ ] **Step 4: Commit**

```bash
git add components/shop/templates/blocks/RichTextBlock.tsx
git commit -m "fix(blocks): RICH_TEXT centers text correctly + widen DOMPurify allow-list"
```

---

## Task 10: Fix RichTextEditor cursor-jump loop

**Why:** The `useEffect` that calls `editor.commands.setContent(content)` on every prop change is a known TipTap anti-pattern. When the editor emits `onUpdate`, parent re-renders, new `content` prop arrives, useEffect fires, `setContent` runs → cursor jumps to start, typing is lost. The fix is to guard the useEffect so it only fires when content was externally set (not echoed from our own onUpdate).

**Files:**
- Modify: `components/admin/RichTextEditor.tsx`

- [ ] **Step 1: Read the current file to locate the useEffect**

```bash
grep -n "editor.commands.setContent" components/admin/RichTextEditor.tsx
```

Confirm the pattern is there.

- [ ] **Step 2: Replace the useEffect with a ref-guarded version**

Open `components/admin/RichTextEditor.tsx`. Find the existing useEffect around line 85:

```typescript
useEffect(() => {
  if (editor && content !== editor.getHTML()) {
    editor.commands.setContent(content || "");
  }
}, [content, editor]);
```

Replace it with:

```typescript
// Track what we emitted via our own onUpdate so we don't re-setContent
// (and jump the cursor) when the parent echoes our change back via props.
const lastEmittedRef = useRef<string>("");

useEffect(() => {
  if (!editor) return;
  // If the parent is echoing back what we just emitted, ignore — this is
  // the "our own change came back" case. Avoids cursor jump.
  if (content === lastEmittedRef.current) return;
  // If the content already matches the editor, nothing to do.
  if (content === editor.getHTML()) return;
  // Truly external change (e.g., switching blocks): reset content.
  editor.commands.setContent(content || "");
}, [content, editor]);
```

Then find the existing `onUpdate` callback:

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

- [ ] **Step 4: Manual verification**

Open the editor. Type quickly. Expected:
- Cursor stays where you're typing (no jumps)
- Selecting text and clicking Bold/Italic works instantly
- Switching to a different block and back: content is preserved correctly

- [ ] **Step 5: Commit**

```bash
git add components/admin/RichTextEditor.tsx
git commit -m "fix(editor): prevent cursor jump by guarding setContent against echoed props"
```

---

## Task 11: Update block defaults to use paddingTop/paddingBottom

**Why:** New blocks should be created with the new fields so they immediately get the split-padding UX.

**Files:**
- Modify: `lib/blocks/defaults.ts`

- [ ] **Step 1: Update DEFAULT_STYLE**

Open `lib/blocks/defaults.ts`. Find `DEFAULT_STYLE` and replace with:

```typescript
export const DEFAULT_STYLE: BlockStyle = {
  backgroundColor: undefined,
  textColor: undefined,
  // Prefer paddingTop/paddingBottom on new blocks. paddingY is legacy.
  paddingTop: "md",
  paddingBottom: "md",
  alignment: "center",
  containerWidth: "normal",
  cornerRadius: "none",
  border: "none",
  shadow: "none",
  visibility: "always",
}
```

- [ ] **Step 2: Propagate to HERO and TICKER defaults**

In the same file, find the HERO entry and change `paddingY: "xl"` to `paddingTop: "xl", paddingBottom: "xl"`. Similarly for TICKER, change `paddingY: "sm"` to `paddingTop: "sm", paddingBottom: "sm"`. Example:

```typescript
  HERO: {
    data: {
      title: "Título del hero",
      subtitle: "",
      ctaText: "Comprar ahora",
    },
    style: { ...DEFAULT_STYLE, paddingTop: "xl", paddingBottom: "xl" },
    media: {
      bgImage: { desktop: "", mobile: "" },
      bgOverlay: { desktop: "rgba(0,0,0,0.3)", mobile: "rgba(0,0,0,0.3)" },
    },
  },
  // ...
  TICKER: {
    data: {
      mode: "scrolling",
      sticky: false,
      scrollingText: "🔥 Oferta especial • Envío gratis •",
      speed: 30,
      bgColor: "#dc2626",
      textColor: "#ffffff",
    },
    style: { ...DEFAULT_STYLE, paddingTop: "sm", paddingBottom: "sm" },
    media: {},
  },
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/blocks/defaults.ts
git commit -m "feat(blocks): default new blocks to paddingTop/paddingBottom instead of legacy paddingY"
```

---

## Task 12: Final smoke test

**Files:** none — manual verification only.

- [ ] **Step 1: Build + TypeScript**

```bash
npx tsc --noEmit
npm run build
```

Both must pass.

- [ ] **Step 2: Block-aware filtering verification**

`npm run dev`, open editor. For each block type, select it and open Estilo tab:

| Block | Expected sections visible |
|---|---|
| HERO | Colores (all 3), Tipografía, Espaciado, Layout, Bordes, Visibilidad, **Imagen de fondo** |
| BENEFITS | Colores, Tipografía, Espaciado, Layout, Bordes, Visibilidad (no Imagen) |
| GALLERY | Colores (only Fondo + Gradiente, NO Texto), Espaciado, Layout (only Container, NO Alignment), Bordes, Visibilidad |
| TESTIMONIALS | Colores, Tipografía, Espaciado, Layout, Bordes, Visibilidad |
| VIDEO | Same as GALLERY |
| TICKER | Only Espaciado + Visibilidad |
| TRUST_BADGES | Colores, Tipografía, Espaciado, Layout, Bordes, Visibilidad |
| RICH_TEXT | Colores, Tipografía, Espaciado, Layout, Bordes, Visibilidad |
| FAQ | Colores, Tipografía, Espaciado, Layout, Bordes, Visibilidad |
| IMAGE_TEXT | Colores, Tipografía, Espaciado, Layout, Bordes, Visibilidad |
| RELATED_PRODUCTS | Colores (only Fondo + Gradiente), Espaciado, Layout (only Container), Bordes, Visibilidad |

- [ ] **Step 3: New controls smoke test**

Select HERO or RICH_TEXT. In Estilo:
- Change Typography Size → canvas updates text size
- Change Typography Weight → canvas updates weight
- Enable Gradient → color pickers appear, change direction; canvas shows gradient
- Toggle Padding Uniforme/Separado → in Separado mode, change Top only; canvas shows asymmetric vertical padding

- [ ] **Step 4: RICH_TEXT fixes verification**

- Add RICH_TEXT block. Type in the editor; cursor stays where you type.
- Click every toolbar button (Bold / Italic / Underline / Strike / Code / H1 / H2 / H3 / Lists / Align / Link): each produces the expected effect and persists.
- In Style tab, set Alignment = Center → text centers in canvas.
- Save and reload `/productos/<slug>` → formatting is preserved.

- [ ] **Step 5: Regression pass**

Go through the other 10 blocks. Each should:
- Show only its supported sections in Estilo.
- Respond to changes in real time.
- Render correctly on the storefront.
- Existing data with legacy `paddingY` still renders (the fallback in applyBlockStyle).

If any regression appears, return to the owning task and fix before declaring Plan 2.5 complete.

- [ ] **Step 6: No commit — manual verification only**

---

## Merge

After smoke test passes:

```bash
git checkout master
git merge --no-ff feature/page-builder-plan-2-5 -m "Merge Plan 2.5: styling polish + block-aware filtering + RichText fixes"
```

Feature flag `LANDING_BUILDER_V2` remains on.

---

## What's next (Plan 3)

Plan 3: Templates with sync. See spec section 6. Estimated 3 weeks.

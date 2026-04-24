# Block Renderer Conventions

**Audience:** Any engineer or agent adding a new block renderer under `components/shop/templates/blocks/`.

**Why this exists:** The page builder canvas simulates device viewports (375px mobile, 1280px desktop) inside a shared admin page. Tailwind's viewport-based responsive variants (`sm:`, `md:`, `lg:`, `xl:`) always read the REAL browser viewport, so they produce the wrong layout inside the canvas mobile preview (real viewport is wide → `lg:grid-cols-3` activates → 3 columns shown inside a "375px mobile" frame). Real mobile customers see the correct layout; the preview lies to admins.

This document locks in the convention that prevents that divergence for all future block renderers.

---

## The one rule

> **Every block renderer under `components/shop/templates/blocks/` uses Tailwind v4 container queries (`@container` + `@md:` / `@lg:` / `@3xl:` / etc.) for its responsive behavior. NEVER use viewport-based variants (`sm:`, `md:`, `lg:`, `xl:`) inside a block renderer.**

The outermost element of every block renderer declares the `@container` class so all responsive classes inside respond to the block's own rendered width. This makes the canvas preview accurate at any simulated viewport.

---

## Breakpoint mapping

Rule of thumb when porting existing viewport classes or writing new ones:

| Old viewport variant | Typical px | New container variant | Typical container px |
|---|---|---|---|
| default (base) | < 640 | default | < 448 |
| `sm:` | ≥ 640 | `@md:` | ≥ 448 |
| `md:` | ≥ 768 | `@3xl:` | ≥ 768 |
| `lg:` | ≥ 1024 | `@5xl:` | ≥ 1024 |
| `xl:` | ≥ 1280 | `@7xl:` | ≥ 1280 |

(Tailwind v4's default container breakpoints use `rem` values; the table shows the `px` equivalent assuming the default 16px root font.)

---

## Template for a new block renderer

```tsx
"use client";

import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface MyBlockContent {
  /* ...data fields... */
}

interface MyBlockProps {
  content: MyBlockContent | unknown;
}

export default function MyBlock({ content: rawContent }: MyBlockProps) {
  const content = readContent<MyBlockContent>(rawContent, "MY_BLOCK");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  return (
    <section
      className={cn(
        // ✅ @container MUST be on the outermost element
        "landing-section py-8 @md:py-14 @container",
        styleClass,
      )}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            // ✅ Use @md: / @3xl: / etc. — never sm: / md: / lg:
            "grid gap-4 @md:gap-6",
            "grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4",
          )}
        >
          {/* ... */}
        </div>
      </div>
    </section>
  );
}
```

---

## Quick checklist when writing a new block

- [ ] Outermost element has `@container` in the className
- [ ] No `sm:`, `md:`, `lg:`, `xl:` variants anywhere in the renderer
- [ ] All responsive typography, grid columns, padding, gap, and flex-direction uses `@md:` / `@lg:` / `@3xl:` / `@5xl:` / `@7xl:`
- [ ] Use `applyBlockStyle()` for user-configurable style (Level 2 controls)
- [ ] Verify in the admin preview: toggle Desktop/Mobile, the layout changes accordingly — especially in the 375px simulated mobile frame

---

## When is it OK to use viewport variants?

Only **outside** block renderers — for example, in admin UI, the product storefront shell, or the page-builder editor chrome itself. Those live in a real browser viewport and benefit from viewport media queries. The rule is scoped to `components/shop/templates/blocks/*` because that's the only place where the canvas simulates a different viewport than the real one.

---

## Why Tailwind v4 (and not the `@tailwindcss/container-queries` plugin)?

The project uses Tailwind v4 which ships container queries natively via the `@container` class + `@md:` / `@3xl:` prefix syntax. No plugin install needed. Confirm by checking `package.json` has `"tailwindcss": "^4"`.

---

## Reference implementations

- `components/shop/templates/blocks/BenefitsBlock.tsx` — first block migrated to container queries in Plan 1
- `components/shop/templates/blocks/HeroBlock.tsx` (and the other 5 existing blocks) — migrated in Plan 2 Tasks 1-2
- The 5 new blocks in Plan 2 Tasks 13-17 (`TrustBadgesBlock`, `RichTextBlock`, `FaqBlock`, `ImageTextBlock`, `RelatedProductsBlock`) — all written against this convention from day one

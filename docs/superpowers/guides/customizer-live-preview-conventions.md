# Customizer Live-Preview Conventions

**Audience:** Any engineer or agent adding a new theme section, sub-block, or page-builder block — or refactoring an existing one to use custom style fields beyond `backgroundColor` / `textColor`.

**Why this exists:** The customizer iframe is server-rendered. When the admin edits a field, the in-memory Zustand store updates instantly but the iframe DOM is stale until the autosave + server refresh round-trip completes (~500ms–1s). The live-preview system at [components/admin/customizer/useLivePreviewOverrides.ts](../../../components/admin/customizer/useLivePreviewOverrides.ts) bridges that gap by patching the iframe DOM directly from store mutations — but it only works when the renderer follows a few conventions. This document lists them.

The general rule: **most things already work, you only need to opt in for a few specific patterns.**

---

## Use the helpers (recommended default)

[components/shop/theme-sections/_helpers.tsx](../../../components/shop/theme-sections/_helpers.tsx) exports three thin wrappers that bake in the conventions below so you don't have to remember the `data-*` attributes. Reach for these first in any new theme section / sub-block / array renderer:

- **`<SectionWrapper section={section} as="div">`** — emits `data-preview-target`, `data-color-scheme`, and the resolved style class/style. Replaces the manual `<div className={...} style={...} data-preview-target={`section:${section.id}`}>` boilerplate.
- **`<SubBlockWrapper block={block}>`** — emits `data-preview-target={`subblock:${block.id}`}` for sub-blocks of a section (e.g. MegaMenu panels).
- **`<ArrayItem array="items" index={i}>`** — emits `data-content-array` + `data-content-index` for items inside a repeatable field.

`data-content-field="<key>"` on the text-rendering element is the only convention you still apply by hand — keep it as `<h2 data-content-field="title">{title}</h2>` style.

Manual `data-*` attributes still work if a renderer needs structural control the wrappers don't expose, but new code should default to the helpers.

---

## What works automatically (no opt-in)

If your section/block uses standard `BlockStyle` fields and the wrapper has `data-preview-target`, everything below repaints instantly on edit with zero extra code:

- `backgroundColor`, `textColor` (incl. desktop / mobile split)
- `colorSchemeId`, `colorMode` (Esquema del tema / Personalizado toggle)
- `backgroundGradient`
- `paddingY`, `paddingTop`, `paddingBottom`
- `alignment`, `containerWidth` (when the renderer actually reads `var(--landing-container)`)
- `cornerRadius`, `border`, `shadow`
- `textSize`, `textWeight`
- `visibility` (`always` / `mobile-only` / `desktop-only` / `hidden`) — page-builder blocks only

### Requirement: `data-preview-target` on the wrapper

Every renderer's outermost element needs the attribute. Prefer the helper — it handles it for you:

```tsx
// Theme sections — use SectionWrapper:
import { SectionWrapper } from "@/components/shop/theme-sections/_helpers"

<SectionWrapper section={section} as="nav" className="...">
  ...
</SectionWrapper>

// Or manually (only if you need structural control SectionWrapper can't provide):
<div data-preview-target={`section:${section.id}`}> ... </div>

// Page-builder blocks: handled centrally by LandingBlockRenderer,
// no per-block code needed.
```

---

## Pattern 1 — Text content live preview (opt-in via convention)

**Use when:** Your renderer displays a string field directly as text (title, subtitle, button label, etc.).

**How:** Add `data-content-field="<key>"` to the element that renders the text. The hook auto-discovers the attribute and patches `textContent` on every store mutation. No registry declaration needed.

```tsx
// Page-builder block (content.data.title):
<h1 data-content-field="title">{title}</h1>
<p data-content-field="subtitle">{subtitle}</p>
<button data-content-field="ctaText">{ctaText}</button>

// Theme section (content.title):
<h2 data-content-field="title">{section.content.title}</h2>
```

**Rules to respect:**

- **Only for plain text.** Rich text (HTML) is NOT synced (would require `innerHTML` + sanitization).
- **Avoid when the field has a render-time fallback** like `data.title ?? "Default text"` or `value || "Default"`. The hook would force `textContent=""` when the admin clears the field, hiding the fallback. If you really need a fallback for empty state, move it into the store (set the default in `defaultContent`) instead of using `??` in JSX.
- **Conditional elements work.** `{title && <h2 data-content-field="title">{title}</h2>}` is fine — the element appears once the field has a value, and from then on it's synced.
- **Array items use the array convention** (see Pattern 1b).

### Pattern 1b — Array item text live preview

**Use when:** Your block / section renders a list of items (testimonials, badges, links, etc.) and each item has editable text fields.

**How:** Use the `<ArrayItem>` helper. Inside, the same `data-content-field="<fieldKey>"` convention works — but the hook resolves the field against `data[arrayKey][i]` instead of the top-level data.

```tsx
import { ArrayItem } from "@/components/shop/theme-sections/_helpers"

{items.map((item, i) => (
  <ArrayItem key={item.id} array="items" index={i}>
    <p data-content-field="text">{item.text}</p>
    <span data-content-field="name">{item.name}</span>
  </ArrayItem>
))}
```

Equivalent manual form (if you need an `<article>` or some other tag the helper doesn't cover):

```tsx
<div data-content-array="items" data-content-index={i}>...</div>
```

The arrayKey is whatever the field is called on the block's `content.data` (or the section's `content`). For nested arrays inside an item (rare), declare another `data-content-array` on the inner container — the hook scopes lookups to the nearest ancestor.

### Pattern 1c — Sub-block text live preview (theme sections)

**Use when:** Your theme section has sub-blocks (e.g. MegaMenu panels, FooterColumns link columns) and each sub-block has its own editable text.

**How:** Use the `<SubBlockWrapper>` helper. Inside, both Pattern 1 (top-level fields) and Pattern 1b (array items) work — but resolved against the sub-block's `content`, not the parent section's.

```tsx
import { SubBlockWrapper, ArrayItem } from "@/components/shop/theme-sections/_helpers"

{section.blocks.map((block) => {
  const panel = block.content as PanelContent
  return (
    <SubBlockWrapper key={block.id} block={block}>
      <button>
        <span data-content-field="trigger">{panel.trigger}</span>
      </button>
      <ul>
        {(panel.links ?? []).map((link, i) => (
          <ArrayItem key={i} array="links" index={i} as="li">
            <a href={link.href}>
              <span data-content-field="label">{link.label}</span>
            </a>
          </ArrayItem>
        ))}
      </ul>
    </SubBlockWrapper>
  )
})}
```

---

## Pattern 2 — Portal overrides (declared in registry)

**Use when:** Your section renders a piece of UI in a React portal — Radix `Sheet`, `Dialog`, `Popover`, `HoverCard`, `DropdownMenu`, `Tooltip`, anything that mounts outside the section's wrapper subtree — AND that portal accepts custom colors as props.

**Why it needs opt-in:** The portal element lives outside the section's wrapper, so descendant CSS selectors from the live-preview hook can't reach it. The colors get baked into inline styles by React props, which only update on autosave + refresh.

**How:** Two-step convention.

### Step 1 — Tag the portal element

In the portal renderer (e.g. `MobileMenu.tsx`, a future `CartDrawer.tsx`), add a stable `data-*` attribute to the element that receives the color CSS variables:

```tsx
<SheetContent
  style={drawerStyle}            // sets --drawer-bg, --drawer-text, etc.
  data-mobile-drawer=""           // <-- the hook's selector hook
>
```

Pick a distinct attribute name per portal (`data-mobile-drawer`, `data-cart-drawer`, `data-search-overlay`, etc).

### Step 2 — Declare the mapping in the section schema

In the section's registry definition under `lib/theme-sections/schema/`:

```ts
export const headerMainDefinition: ThemeSectionDefinition = {
  type: "HEADER_MAIN",
  // ...
  portalOverrides: [
    {
      selector: "[data-mobile-drawer]",
      device: "mobile",  // "shared" for desktop / responsive portals
      vars: {
        drawerBgColor: "--drawer-bg",
        drawerTextColor: "--drawer-text",
      },
    },
  ],
}
```

The hook reads this on every store mutation, resolves each field via `resolveColorValue`, and emits a global CSS rule like:

```css
[data-mobile-drawer] {
  --drawer-bg: <value> !important;
  --drawer-text: <value> !important;
}
```

The portal repaints instantly because its inline `backgroundColor: var(--drawer-bg)` resolves to the new value the moment the variable is rebound. **Zero code changes to the live-preview hook.**

`device: "mobile"` — read the mobile side of `DeviceValue<string>` first, fall back to shared. Use this for mobile-only surfaces (drawers, sheets that slide in from the side).
`device: "shared"` — read the shared (desktop) side first, fall back to mobile. Use this for desktop / responsive portals.

---

## Pattern 3 — Skip live preview entirely

Some changes legitimately can't be live-previewed and will continue to require the autosave + refresh cycle. Don't try to bridge these:

- **Structural changes** — adding / removing / reordering blocks or sub-blocks. The iframe DOM doesn't have the new element; only a fresh server render can produce it.
- **Image swaps** — image URL changes. The `<img>` `src` attribute could be patched but the loaded image data is server-resolved (Vercel Blob), and `next/image` plays games with srcsets we don't want to duplicate.
- **Rich-text (HTML) content** — requires `innerHTML` + sanitization. Not worth the risk for the edit-frequency gain.
- **Theme tokens** (the per-theme `--theme-*` defaults at the `.theme-<id>` scope) — admin edits in the Tokens panel still trigger `getThemesHash()` → CSS bundle URL changes → iframe reloads the stylesheet. That's correct; don't bypass.

Visual feedback for these is "best effort" — the admin sees the change after the next autosave (~250ms) + server render (~300-800ms).

---

## When to extend the hook itself

Default position: **don't.** The patterns above cover the long tail. The hook's apply-block-style switch is intentionally generic over `BlockStyle` — adding a new field to that type auto-cascades into the hook without changes.

You should extend [useLivePreviewOverrides.ts](../../../components/admin/customizer/useLivePreviewOverrides.ts) only when:

1. You're introducing a brand-new CSS surface that isn't a color or a `BlockStyle` field (e.g. a new responsive breakpoint, a new pseudo-element).
2. You're adding a new field to `BlockStyle` that needs special resolution beyond `resolveColorValue` / `addDevice`.
3. You're adding live preview for a content shape that the existing patterns don't cover (e.g. array-item text sync — currently not supported).

When in doubt: write the schema-driven version first (Pattern 2 style), only fall back to hook code if the abstraction doesn't fit.

---

## Quick checklist for a new section / block

- [ ] Outer wrapper has `data-preview-target={`section:${section.id}`}` (sections) — or you're relying on `LandingBlockRenderer` for blocks.
- [ ] Custom color fields beyond bg/text are added to `BlockStyle` in [lib/blocks/types.ts](../../../lib/blocks/types.ts) so the generic resolver handles them.
- [ ] Text fields that the admin will edit live have `data-content-field="<key>"` on the element that renders them.
- [ ] Render-time fallbacks (`?? "default"`) are moved into the section's `defaultContent` so they live in the store, not in JSX.
- [ ] Any portal-rendered UI declares its `portalOverrides` in the registry + emits a matching `data-*` attribute.
- [ ] The renderer uses `var(--landing-container, 72rem)` for content max-width (so the "Ancho del contenedor" control works).
- [ ] Overlays / fallback decorations are conditional on the absence of the admin's choice (so a configured bg color isn't hidden by a default overlay).

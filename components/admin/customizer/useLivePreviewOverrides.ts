"use client"

import { useEffect, type RefObject } from "react"
import type { BlockStyle, DeviceValue } from "@/lib/blocks/types"
import {
  buildPreviewOverridesCss,
  type PreviewTarget,
} from "@/lib/blocks/preview-overrides-css"
import { resolveColorValue } from "@/lib/blocks/apply-style"
import type { ColorScheme } from "@/lib/themes/color-schemes"
import {
  getThemeSectionDefinition,
  getSectionBlockDefinition,
} from "@/lib/theme-sections/registry"
import type { PortalOverrideMapping } from "@/lib/theme-sections/types"
import { deriveHeroLiveStyles } from "@/lib/blocks/hero-vars"
import type { HeroBlockContent } from "@/lib/types/landing-blocks"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { useThemeSectionsStore } from "./theme-sections-store"
import { useBuilderStore } from "@/components/admin/page-builder/store"

const STYLE_ELEMENT_ID = "customizer-live-overrides"

/**
 * CSS custom properties this hook may set inline on a preview target.
 * Tracked so we can cleanly remove our own additions on the next apply
 * without nuking properties that the SSR set (e.g. HeaderMain's manual
 * `--theme-bg` fallback). Uses a WeakMap keyed by the element.
 */
const managedSchemeProps = new WeakMap<HTMLElement, Set<string>>()

/** Tracks the data-* attributes we set per HERO wrapper so we can clean
 *  them up when the admin clears a value. Mirrors managedSchemeProps. */
const managedHeroAttrs = new WeakMap<HTMLElement, Set<string>>()

/** Tracks CSS custom properties set by liveContentVars per element so we
 *  can drop them cleanly when the admin clears a field. */
const managedContentVars = new WeakMap<HTMLElement, Set<string>>()

/**
 * Live-preview bridge: pushes BlockStyle changes from the customizer's
 * in-memory stores into the (same-origin) iframe DOM on every Zustand
 * mutation. Five sync surfaces, each handling a slice the others can't:
 *
 *  1. Injected `<style>` — color / padding / border / etc rules with
 *     `!important`, plus mobile media-query overrides.
 *  2. Inline `background-color` and `color` directly on the target
 *     element. Required to CLEAR stale SSR inline styles when the admin
 *     removes a value (CSS injection only ADDS rules, can't remove the
 *     inline that the server originally baked in).
 *  3. Inline `--theme-*` custom properties on each section/block
 *     wrapper — bypasses the per-theme CSS rule lookup so scheme
 *     switching paints instantly. Tracked per-element via WeakMap so we
 *     only clear what we previously set.
 *  4. `data-color-scheme` attribute — kept in sync for any consumer
 *     that reads it (user-defined CSS, the per-theme stylesheet rule).
 *  5. Portal overrides — sections / sub-blocks declare CSS-variable
 *     bridges via `portalOverrides` in their registry definition so
 *     elements rendered in React portals (Radix Sheet / Dialog /
 *     Popover etc) can be live-previewed without per-portal hardcoding
 *     in this file. New portal-styled UI: declare the mapping in the
 *     section schema, no code change here.
 */
export function useLivePreviewOverrides(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  colorSchemes: ColorScheme[],
) {
  useEffect(() => {
    const apply = () => {
      const doc = iframeRef.current?.contentDocument
      if (!doc) return

      const themeState = useThemeSectionsStore.getState()
      const builderState = useBuilderStore.getState()

      // Plan 17 — `product` joins header/footer as a live-previewable group.
      // Without including it here, every Plan 17 section/sub-block edit
      // (color scheme switch, padding, alignment, scheme rebind, etc.)
      // waited on the ~500-1000ms autosave + revalidate round-trip.
      const allSections = [
        ...themeState.header,
        ...themeState.footer,
        ...themeState.product,
      ]

      // Shopify-style LEGACY_BLOCK adapter — a theme section that wraps a
      // universal page-builder block. Its content shape mirrors
      // BlockContentV2 ({ blockType, data, style, media }), so we want it
      // to behave like a `block:*` target during live preview (text sync
      // reads `content.data`, color element is firstElementChild, etc.).
      // We track legacy section ids here so the patching loop below can
      // branch without re-querying the registry each iteration.
      const legacySectionIds = new Set(
        allSections
          .filter((s) => s.type === "LEGACY_BLOCK")
          .map((s) => s.id),
      )

      const targets: PreviewTarget[] = [
        ...allSections.map((s) => ({
          target: `section:${s.id}`,
          style: (s.content.style as BlockStyle | undefined) ?? undefined,
        })),
        ...allSections.flatMap((s) =>
          s.blocks.map((b) => ({
            target: `subblock:${b.id}`,
            style: (b.content.style as BlockStyle | undefined) ?? undefined,
          })),
        ),
        ...builderState.blocks.map((b) => ({
          target: `block:${b.id}`,
          style: b.content.style,
        })),
      ]

      // 1. Update the injected stylesheet with:
      //    - color / padding / border / etc rules (per-target)
      //    - portal overrides (mobile drawers, dropdowns, modals)
      //    - visibility rules (Solo móvil / Solo escritorio / Oculto)
      //
      //    All three categories repaint instantly via CSS so the admin
      //    doesn't wait for the autosave round-trip.
      const baseCss = buildPreviewOverridesCss(targets)
      const portalCss = buildPortalOverridesCss(allSections)
      const visibilityCss = buildBlockVisibilityCss(builderState.blocks)
      const css = [baseCss, portalCss, visibilityCss]
        .filter(Boolean)
        .join("\n")
      let styleEl = doc.getElementById(STYLE_ELEMENT_ID) as
        | HTMLStyleElement
        | null
      if (!styleEl) {
        styleEl = doc.createElement("style")
        styleEl.id = STYLE_ELEMENT_ID
        doc.head.appendChild(styleEl)
      }
      if (styleEl.textContent !== css) {
        styleEl.textContent = css
      }

      // 2. + 3. + 4. — per-target DOM patching: inline colors, scheme,
      // and data-color-scheme attribute. Done together so we visit each
      // element once.
      for (const { target, style } of targets) {
        const wrapper = doc.querySelector<HTMLElement>(
          `[data-preview-target="${cssEscape(target)}"]`,
        )
        if (!wrapper) continue

        // LEGACY_BLOCK sections render the wrapped block as their first
        // child (the block's own <section> carries the inline
        // backgroundColor / color from applyBlockStyle), so they need
        // the same firstElementChild path as `block:*` targets.
        const sectionId = target.startsWith("section:")
          ? target.slice("section:".length)
          : null
        const isLegacySection =
          sectionId !== null && legacySectionIds.has(sectionId)

        // The element that paints the colors:
        //  - `section:*` targets — the wrapper itself
        //  - `block:*` and LEGACY_BLOCK section targets — first child
        const colorEl: HTMLElement =
          (target.startsWith("block:") || isLegacySection) &&
          wrapper.firstElementChild instanceof HTMLElement
            ? wrapper.firstElementChild
            : wrapper

        applyInlineColors(colorEl, style)

        const schemeId = style?.colorSchemeId
        if (schemeId) {
          wrapper.setAttribute("data-color-scheme", schemeId)
        } else {
          wrapper.removeAttribute("data-color-scheme")
        }
        const scheme = schemeId
          ? colorSchemes.find((c) => c.id === schemeId)
          : undefined
        applySchemeInline(wrapper, scheme)
      }

      // 6. Block content.data → wrapper CSS vars + attrs. Required for
      //    blocks (currently only HERO) whose visual output is driven by
      //    schema-form data fields, not by BlockStyle. Without this hook
      //    those fields only repaint after the autosave round-trip
      //    rebuilds the iframe — same bug the drawer had before the
      //    portalOverrides bridge.
      //
      //    The actual SSR element painted by HeroBlock is the .hero-block
      //    <section> inside the LandingBlockRenderer wrapper, so we read
      //    the wrapper.firstElementChild (matches the color-patching
      //    logic above for `block:*` targets).
      //
      //    LEGACY_BLOCK sections that wrap a HERO get the same treatment —
      //    their preview target is `section:*` but the same hero element
      //    sits as firstElementChild.
      const heroSources: Array<{
        target: string
        data: Partial<HeroBlockContent>
      }> = []
      for (const block of builderState.blocks) {
        if (block.type !== "HERO") continue
        heroSources.push({
          target: `block:${block.id}`,
          data: (block.content.data ?? {}) as Partial<HeroBlockContent>,
        })
      }
      for (const s of allSections) {
        if (s.type !== "LEGACY_BLOCK") continue
        if (s.content.blockType !== "HERO") continue
        heroSources.push({
          target: `section:${s.id}`,
          data: ((s.content.data as Partial<HeroBlockContent> | undefined) ??
            {}) as Partial<HeroBlockContent>,
        })
      }
      for (const { target, data } of heroSources) {
        const wrapper = doc.querySelector<HTMLElement>(
          `[data-preview-target="${cssEscape(target)}"]`,
        )
        if (!wrapper) continue
        const heroEl =
          wrapper.firstElementChild instanceof HTMLElement
            ? wrapper.firstElementChild
            : wrapper
        applyHeroDataLivePreview(heroEl, data)
      }

      // 6b. Generic data-driven CSS variables. Each block definition can
      //     declare `liveContentVars: { fieldKey: "--css-var" }` in the
      //     registry; this loop reads the value from the in-memory store
      //     and sets the matching CSS custom property on the block's
      //     section element. Renderers reference these vars via
      //     `var(--block-accent)` so changes repaint instantly. No
      //     per-block special-casing here — adding a new live-preview
      //     content color is a registry-only change.
      //
      //     LEGACY_BLOCK sections that wrap a block with `liveContentVars`
      //     get the same treatment via the section target.
      const contentVarSources: Array<{
        target: string
        mapping: Record<string, string>
        data: Record<string, unknown>
      }> = []
      for (const block of builderState.blocks) {
        const def = getBlockDefinition(block.type)
        if (!def?.liveContentVars) continue
        contentVarSources.push({
          target: `block:${block.id}`,
          mapping: def.liveContentVars,
          data: (block.content.data as Record<string, unknown>) ?? {},
        })
      }
      for (const s of allSections) {
        if (s.type !== "LEGACY_BLOCK") continue
        const blockType = s.content.blockType
        if (typeof blockType !== "string") continue
        const def = getBlockDefinition(blockType)
        if (!def?.liveContentVars) continue
        contentVarSources.push({
          target: `section:${s.id}`,
          mapping: def.liveContentVars,
          data: (s.content.data as Record<string, unknown>) ?? {},
        })
      }
      for (const { target, mapping, data } of contentVarSources) {
        const wrapper = doc.querySelector<HTMLElement>(
          `[data-preview-target="${cssEscape(target)}"]`,
        )
        if (!wrapper) continue
        const targetEl =
          wrapper.firstElementChild instanceof HTMLElement
            ? wrapper.firstElementChild
            : wrapper
        applyContentVars(targetEl, mapping, data)
      }

      // 5. Text content sync — for any element inside a preview target
      //    that carries `data-content-field="<key>"`, patch its
      //    textContent to match the corresponding string field on the
      //    block / section's content. Block authors opt in by adding the
      //    attribute to title/subtitle/CTA/etc elements; the hook is
      //    fully generic, so future blocks get free text live preview.
      //
      //    Sub-blocks (theme section children, e.g. MegaMenu panels) get
      //    their own `subblock:<id>` target via a sibling
      //    `data-preview-target` on the sub-block wrapper. Array items
      //    inside a block's content (Testimonials items, TrustBadges
      //    badges, etc.) are handled by `data-content-array` containers —
      //    no per-block hook code needed.
      const subBlockEntries: Array<{
        target: string
        data: Record<string, unknown>
      }> = []
      for (const s of allSections) {
        for (const b of s.blocks) {
          subBlockEntries.push({ target: `subblock:${b.id}`, data: b.content })
        }
      }

      applyContentTextSync(doc, [
        ...allSections.map((s) => ({
          target: `section:${s.id}`,
          // LEGACY_BLOCK sections persist the wrapped block's BlockContentV2
          // verbatim, so their text fields live under `s.content.data` —
          // mirroring how the page-builder addresses block text fields. The
          // native theme sections (Plan 16/17) keep their fields at the top
          // level of `s.content`.
          data:
            s.type === "LEGACY_BLOCK"
              ? ((s.content.data as Record<string, unknown>) ?? {})
              : s.content,
        })),
        ...subBlockEntries,
        ...builderState.blocks.map((b) => ({
          target: `block:${b.id}`,
          data: (b.content.data as Record<string, unknown>) ?? {},
        })),
      ])
    }

    const onLoad = () => apply()
    const iframe = iframeRef.current
    iframe?.addEventListener("load", onLoad)
    apply()

    const unsubTheme = useThemeSectionsStore.subscribe(() => apply())
    const unsubBuilder = useBuilderStore.subscribe(() => apply())

    return () => {
      iframe?.removeEventListener("load", onLoad)
      unsubTheme()
      unsubBuilder()
    }
  }, [iframeRef, colorSchemes])
}

/**
 * Set inline `background-color` and `color` to match the current store
 * value, or REMOVE the property when the store has no value. Removing
 * is the critical part: if the SSR baked an inline color (because the
 * admin had Personalizado set), that inline persists in the DOM until
 * a full re-render. We can't override it with a CSS rule when the store
 * is empty (no rule to emit) — but we CAN remove the inline directly.
 *
 * For DeviceValue split colors, we use the shared (desktop) value as
 * the inline; the mobile-only override is handled by the injected
 * media-query rule.
 */
function applyInlineColors(el: HTMLElement, style: BlockStyle | undefined) {
  // Background color (skipped when a gradient is set — gradient owns it).
  if (style?.backgroundGradient) {
    el.style.removeProperty("background-color")
  } else {
    const bg = resolveColorValue(style?.backgroundColor)
    if (bg.shared !== undefined) {
      el.style.setProperty("background-color", bg.shared)
    } else {
      el.style.removeProperty("background-color")
    }
  }

  // Text color
  const text = resolveColorValue(style?.textColor)
  if (text.shared !== undefined) {
    el.style.setProperty("color", text.shared)
  } else {
    el.style.removeProperty("color")
  }
}

/**
 * Rebind the eight `--theme-*` custom properties on a section wrapper to
 * a specific color scheme's palette (or clear them when no scheme is
 * picked, letting the ancestor `.theme-<id>` defaults inherit).
 *
 * Tracks via WeakMap so we only clear properties WE set — never touches
 * `--theme-*` values the SSR may have written for its own purposes
 * (HeaderMain's `--theme-bg` override when no scheme is configured).
 */
function applySchemeInline(
  el: HTMLElement,
  scheme: ColorScheme | undefined,
): void {
  // Clear whatever we set previously on this element.
  const prev = managedSchemeProps.get(el)
  if (prev) {
    for (const prop of prev) el.style.removeProperty(prop)
    prev.clear()
  }

  if (!scheme) {
    managedSchemeProps.delete(el)
    return
  }

  const newProps = prev ?? new Set<string>()
  for (const [key, value] of Object.entries(scheme.colors)) {
    if (typeof value !== "string" || !value) continue
    const cssProp = `--theme-${kebabCase(key)}`
    el.style.setProperty(cssProp, value)
    newProps.add(cssProp)
  }
  managedSchemeProps.set(el, newProps)
}

/**
 * Walk every section + sub-block, look up its registry definition, and
 * emit CSS for every `portalOverrides` mapping declared there. This is
 * what lets the mobile drawer / dropdowns / modals — anything rendered
 * in a React portal outside the section's wrapper — be live-previewed
 * without per-portal hardcoding in this hook.
 *
 * Sections that don't declare `portalOverrides` cost nothing here
 * (one map lookup, no rule emitted). Adding a new portal-styled UI to
 * any future section is a registry-only change.
 */
type StoreSection = {
  type: string
  content: { style?: BlockStyle } | Record<string, unknown>
  blocks?: Array<{
    type: string
    content: { style?: BlockStyle } | Record<string, unknown>
  }>
}

function buildPortalOverridesCss(sections: StoreSection[]): string {
  const rules: string[] = []
  for (const sec of sections) {
    const def = getThemeSectionDefinition(sec.type)
    if (!def) continue

    if (def.portalOverrides) {
      for (const mapping of def.portalOverrides) {
        const rule = buildPortalRule(mapping, sec.content)
        if (rule) rules.push(rule)
      }
    }

    if (sec.blocks) {
      for (const block of sec.blocks) {
        const blockDef = getSectionBlockDefinition(sec.type, block.type)
        if (!blockDef?.block.portalOverrides) continue
        for (const mapping of blockDef.block.portalOverrides) {
          const rule = buildPortalRule(mapping, block.content)
          if (rule) rules.push(rule)
        }
      }
    }
  }
  return rules.join("\n")
}

function buildPortalRule(
  mapping: PortalOverrideMapping,
  content: { style?: BlockStyle } | Record<string, unknown> | undefined,
): string | null {
  const style = (content as { style?: BlockStyle } | undefined)?.style
  if (!style) return null
  const device = mapping.device ?? "mobile"
  const decls: string[] = []
  for (const [fieldKey, cssVar] of Object.entries(mapping.vars)) {
    const fieldValue = (style as Record<string, unknown>)[fieldKey] as
      | DeviceValue<string>
      | undefined
    const resolved = resolveColorValue(fieldValue)
    const value =
      device === "mobile"
        ? (resolved.mobile ?? resolved.shared)
        : (resolved.shared ?? resolved.mobile)
    if (value !== undefined) {
      decls.push(`${cssVar}: ${sanitizeCssValue(value)} !important`)
    }
  }
  if (decls.length === 0) return null
  return `${mapping.selector} { ${decls.join("; ")}; }`
}

/**
 * Push HERO block's content.data into the live wrapper as CSS custom
 * properties + data-* attributes. The HeroBlock SSR + globals.css read
 * these same vars/attrs to drive every visual aspect, so patching them
 * here gives instant repaint without an autosave round-trip.
 *
 * Tracks attributes via WeakMap so toggling a value off ("Activar
 * overlay" → off) actually removes the attribute instead of leaving a
 * stale one behind.
 */
function applyHeroDataLivePreview(
  el: HTMLElement,
  data: Partial<HeroBlockContent>,
): void {
  const live = deriveHeroLiveStyles(data)

  // CSS vars — setProperty is idempotent and cheap, so re-setting on
  // every store mutation is fine.
  for (const [prop, value] of Object.entries(live.vars)) {
    el.style.setProperty(prop, value)
  }

  // Data attributes — track what we set so we can clean up on the next
  // tick if a future render emits a smaller set.
  const prev = managedHeroAttrs.get(el)
  const next = new Set<string>()
  for (const [attr, value] of Object.entries(live.attrs)) {
    el.setAttribute(attr, value)
    next.add(attr)
  }
  if (prev) {
    for (const attr of prev) {
      if (!next.has(attr)) el.removeAttribute(attr)
    }
  }
  managedHeroAttrs.set(el, next)
}

/**
 * Set CSS custom properties on a block's painted element based on the
 * registry's `liveContentVars` mapping and the current store data.
 * Removes properties whose source field is empty / missing so descendants
 * fall back to whatever the renderer set inline via `var(--x, default)`.
 *
 * Tracks via WeakMap so removing a field (admin clears the picker) drops
 * the corresponding CSS custom property too.
 */
function applyContentVars(
  el: HTMLElement,
  mapping: Record<string, string>,
  data: Record<string, unknown>,
): void {
  const prev = managedContentVars.get(el)
  const next = new Set<string>()

  for (const [fieldKey, cssVar] of Object.entries(mapping)) {
    const raw = data[fieldKey]
    if (typeof raw === "string" && raw.length > 0) {
      el.style.setProperty(cssVar, raw)
      next.add(cssVar)
    } else {
      el.style.removeProperty(cssVar)
    }
  }

  // Clear any vars we set previously that are not in this update — covers
  // the case where a registry change removes a mapping mid-session.
  if (prev) {
    for (const cssVar of prev) {
      if (!next.has(cssVar)) el.style.removeProperty(cssVar)
    }
  }
  managedContentVars.set(el, next)
}

/**
 * Visibility live preview for page-builder blocks. SSR bakes a Tailwind
 * class (`lg:hidden` / `hidden lg:block`) into the LandingBlockRenderer
 * wrapper based on `style.visibility`; when the admin changes the value
 * mid-edit, that class is stale until autosave + refresh. We override
 * with `display: none` / `display: block` (always !important) wrapped in
 * the same `lg` breakpoint media query (1024px) that the Tailwind class
 * targets, so toggling Solo móvil / Solo escritorio / Oculto repaints
 * the iframe instantly.
 *
 * Only emitted for `block:*` targets — theme sections don't currently
 * honor visibility in their renderers, so a "hidden" preview would
 * drift from the storefront paint.
 */
function buildBlockVisibilityCss(
  blocks: Array<{ id: string; content: { style?: BlockStyle } }>,
): string {
  const base: string[] = []
  const desktopHidden: string[] = []
  const mobileHidden: string[] = []

  for (const block of blocks) {
    const visibility = block.content.style?.visibility ?? "always"
    const selector = `[data-preview-target="block:${cssEscape(block.id)}"]`
    switch (visibility) {
      case "hidden":
        // Fully hidden — overrides any SSR class regardless of viewport.
        base.push(`${selector} { display: none !important; }`)
        break
      case "mobile-only":
        // Visible on mobile (override `lg:hidden` would be no-op there),
        // hidden on desktop. Explicit `display: block` on the base rule
        // ensures we win against any stale class the SSR baked in.
        base.push(`${selector} { display: block !important; }`)
        desktopHidden.push(`${selector} { display: none !important; }`)
        break
      case "desktop-only":
        base.push(`${selector} { display: block !important; }`)
        mobileHidden.push(`${selector} { display: none !important; }`)
        break
      case "always":
      default:
        // Force visible — overrides any stale `lg:hidden` / `hidden lg:block`
        // class the SSR baked in before the admin switched to "always".
        base.push(`${selector} { display: block !important; }`)
        break
    }
  }

  const parts: string[] = []
  if (base.length) parts.push(base.join("\n"))
  if (desktopHidden.length) {
    parts.push(
      `@media (min-width: 1024px) {\n${desktopHidden.join("\n")}\n}`,
    )
  }
  if (mobileHidden.length) {
    parts.push(
      `@media (max-width: 1023px) {\n${mobileHidden.join("\n")}\n}`,
    )
  }
  return parts.join("\n")
}

/**
 * Generic text-content live preview. Block / section authors opt in by
 * adding `data-content-field="<key>"` to whichever DOM element renders
 * a given content field; this function then patches that element's
 * `textContent` to match the in-memory store on every store mutation.
 *
 * Two conventions:
 *  - Top-level fields: `<h2 data-content-field="title">…</h2>` reads
 *    `data.title`.
 *  - Array items: a parent element with
 *    `data-content-array="<key>" data-content-index="<i>"` scopes any
 *    descendant `data-content-field` lookups to `data[key][i]`. Lets
 *    Testimonials, TrustBadges, MegaMenu panels, etc. live-preview
 *    their per-item text without per-block hook code. Nested arrays
 *    work via `closest()` boundary checks.
 *
 * The mapping is fully convention-based — there's no per-block schema
 * declaration to maintain. New blocks get free live preview for text
 * fields by sprinkling `data-content-field` (and `data-content-array`
 * for repeated items) on the right elements.
 *
 * Scope:
 *  - Only string fields are synced. Nested objects beyond array items,
 *    and richtext HTML are skipped (richtext would require innerHTML
 *    and a sanitization pass — out of scope for now).
 *  - Reads textContent before assigning so we don't churn the DOM when
 *    the value hasn't actually changed (avoids cursor jumps in
 *    contenteditable, layout thrash on text-measured elements).
 */
function applyContentTextSync(
  doc: Document,
  entries: Array<{ target: string; data: Record<string, unknown> }>,
): void {
  for (const { target, data } of entries) {
    const wrapper = doc.querySelector<HTMLElement>(
      `[data-preview-target="${cssEscape(target)}"]`,
    )
    if (!wrapper) continue

    // Pass 1 — Array items. Walk every `[data-content-array]` container
    // under this target and sync its `data-content-field` descendants
    // against the matching array entry. Done first so the top-level
    // pass can safely skip these nodes via `closest()`.
    const arrayContainers = wrapper.querySelectorAll<HTMLElement>(
      "[data-content-array]",
    )
    for (const container of arrayContainers) {
      // Skip nested array containers — they're processed when their own
      // outer iteration reaches them. (Outer/inner ordering doesn't
      // matter for correctness, but processing twice would waste work.)
      const parentArray = container.parentElement?.closest(
        "[data-content-array]",
      )
      if (parentArray) {
        // Resolve the right ancestor data for this nested container by
        // walking outwards. For now we only support one level of nesting
        // (the storefront doesn't have deeper structures); add more
        // levels here if a future block needs it.
        continue
      }
      syncArrayContainer(container, data)
    }

    // Pass 2 — Top-level string fields. Skip any `data-content-field`
    // that lives inside an array container (handled in pass 1).
    for (const [field, value] of Object.entries(data)) {
      if (typeof value !== "string") continue
      const nodes = wrapper.querySelectorAll<HTMLElement>(
        `[data-content-field="${cssEscape(field)}"]`,
      )
      for (const node of nodes) {
        if (node.closest("[data-content-array]")) continue
        if (node.textContent !== value) {
          node.textContent = value
        }
      }
    }
  }
}

/**
 * Patch every `[data-content-field]` directly scoped to this array
 * container against the corresponding entry in `data[arrayKey][index]`.
 * Skips fields that belong to a deeper array container so nested loops
 * (rare) don't leak.
 */
function syncArrayContainer(
  container: HTMLElement,
  data: Record<string, unknown>,
): void {
  const arrayKey = container.getAttribute("data-content-array")
  const indexAttr = container.getAttribute("data-content-index")
  if (!arrayKey || indexAttr === null) return
  const index = Number.parseInt(indexAttr, 10)
  if (!Number.isFinite(index) || index < 0) return
  const arr = data[arrayKey]
  if (!Array.isArray(arr)) return
  const item = arr[index]
  if (!item || typeof item !== "object") return
  const itemData = item as Record<string, unknown>

  const fieldNodes = container.querySelectorAll<HTMLElement>(
    "[data-content-field]",
  )
  for (const node of fieldNodes) {
    // Only sync fields whose nearest array ancestor IS this container —
    // fields inside a nested `[data-content-array]` belong to a deeper
    // item and should be processed when that container's own loop runs.
    if (node.closest("[data-content-array]") !== container) continue
    const field = node.getAttribute("data-content-field")
    if (!field) continue
    const value = itemData[field]
    if (typeof value !== "string") continue
    if (node.textContent !== value) {
      node.textContent = value
    }
  }
}

/**
 * Strip CSS punctuation that would break out of a declaration. Mirrors
 * the helper in preview-overrides-css.ts (kept local here to avoid
 * exporting an internal utility).
 */
function sanitizeCssValue(value: string): string {
  return value.replace(/[;{}]/g, "")
}

function kebabCase(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
}

/**
 * Minimal CSS.escape polyfill for the attribute-value subset we control
 * (cuid / uuid section ids). The native CSS.escape isn't always available
 * inside iframes from the parent context, and our ids never include the
 * characters that would actually need escaping — so we just defang the
 * two attribute-quote-breaking chars.
 */
function cssEscape(value: string): string {
  return value.replace(/["\\]/g, "\\$&")
}

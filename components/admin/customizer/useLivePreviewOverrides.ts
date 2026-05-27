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

      const targets: PreviewTarget[] = [
        ...themeState.header.map((s) => ({
          target: `section:${s.id}`,
          style: (s.content.style as BlockStyle | undefined) ?? undefined,
        })),
        ...themeState.footer.map((s) => ({
          target: `section:${s.id}`,
          style: (s.content.style as BlockStyle | undefined) ?? undefined,
        })),
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
      const portalCss = buildPortalOverridesCss([
        ...themeState.header,
        ...themeState.footer,
      ])
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

        // The element that paints the colors:
        //  - `section:*` targets — the wrapper itself
        //  - `block:*` targets — its first child (LandingBlockRenderer
        //    wraps each block but the block's <section> is what carries
        //    the inline backgroundColor / color from applyBlockStyle)
        const colorEl: HTMLElement =
          target.startsWith("block:") &&
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
      for (const block of builderState.blocks) {
        if (block.type !== "HERO") continue
        const wrapper = doc.querySelector<HTMLElement>(
          `[data-preview-target="block:${cssEscape(block.id)}"]`,
        )
        if (!wrapper) continue
        const heroEl =
          wrapper.firstElementChild instanceof HTMLElement
            ? wrapper.firstElementChild
            : wrapper
        const data = (block.content.data ?? {}) as Partial<HeroBlockContent>
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
      for (const block of builderState.blocks) {
        const def = getBlockDefinition(block.type)
        if (!def?.liveContentVars) continue
        const wrapper = doc.querySelector<HTMLElement>(
          `[data-preview-target="block:${cssEscape(block.id)}"]`,
        )
        if (!wrapper) continue
        const targetEl =
          wrapper.firstElementChild instanceof HTMLElement
            ? wrapper.firstElementChild
            : wrapper
        const data = (block.content.data as Record<string, unknown>) ?? {}
        applyContentVars(targetEl, def.liveContentVars, data)
      }

      // 5. Text content sync — for any element inside a preview target
      //    that carries `data-content-field="<key>"`, patch its
      //    textContent to match the corresponding string field on the
      //    block / section's content. Block authors opt in by adding the
      //    attribute to title/subtitle/CTA/etc elements; the hook is
      //    fully generic, so future blocks get free text live preview.
      applyContentTextSync(doc, [
        ...themeState.header.map((s) => ({
          target: `section:${s.id}`,
          data: s.content,
        })),
        ...themeState.footer.map((s) => ({
          target: `section:${s.id}`,
          data: s.content,
        })),
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
 * The mapping is fully convention-based — there's no per-block schema
 * declaration to maintain. New blocks get free live preview for text
 * fields by sprinkling `data-content-field` on the right elements.
 *
 * Scope:
 *  - Only top-level string fields are synced. Nested objects, arrays,
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
    for (const [field, value] of Object.entries(data)) {
      if (typeof value !== "string") continue
      const nodes = wrapper.querySelectorAll<HTMLElement>(
        `[data-content-field="${cssEscape(field)}"]`,
      )
      for (const node of nodes) {
        if (node.textContent !== value) {
          node.textContent = value
        }
      }
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

"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import type { ThemeSectionGroup } from "@prisma/client"
import {
  useThemeSectionsStore,
  findGroupBySection,
} from "./theme-sections-store"

export interface OverlayRect {
  top: number
  left: number
  width: number
  height: number
}

export interface HoveredSection {
  id: string
  group: ThemeSectionGroup
  rect: OverlayRect
}

interface Options {
  /** Only attach when the customizer is showing the sections view + preview. */
  enabled: boolean
  /** Re-attach when the device frame changes (iframe width changes). */
  device: string
  /** Re-attach when the previewed URL changes (iframe reloads a new page). */
  previewUrl: string | null
}

/**
 * Plan 19 — interactive canvas overlay for the customizer iframe.
 *
 * The preview iframe is SAME-ORIGIN, so the parent can read section
 * positions and listen for hover/click inside it. Every storefront section
 * carries `data-preview-target="section:<id>"` (see
 * components/shop/theme-sections/_helpers.tsx). This hook attaches
 * mouseover/click listeners to the iframe document, identifies the section
 * under the cursor, and exposes its rectangle in PARENT viewport coords
 * (for `position: fixed` overlay elements). It only READS the iframe DOM —
 * `useLivePreviewOverrides` owns writes, so the two don't conflict.
 */
export function useIframeSectionOverlay(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  { enabled, device, previewUrl }: Options,
): {
  hovered: HoveredSection | null
  selected: { id: string; group: ThemeSectionGroup; rect: OverlayRect } | null
} {
  const [hovered, setHovered] = useState<HoveredSection | null>(null)
  const [selected, setSelected] = useState<{
    id: string
    group: ThemeSectionGroup
    rect: OverlayRect
  } | null>(null)
  const hoveredIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setHovered(null)
      setSelected(null)
      hoveredIdRef.current = null
      return
    }
    const iframe = iframeRef.current
    if (!iframe) return

    let rafId = 0
    let observer: ResizeObserver | null = null
    let attachedDoc: Document | null = null

    const rectOf = (el: Element): OverlayRect => {
      const r = el.getBoundingClientRect()
      const f = iframe.getBoundingClientRect()
      return {
        top: r.top + f.top,
        left: r.left + f.left,
        width: r.width,
        height: r.height,
      }
    }

    const sectionIdFrom = (node: EventTarget | null): string | null => {
      if (!(node instanceof Element)) return null
      const el = node.closest('[data-preview-target^="section:"]')
      if (!el) return null
      const target = el.getAttribute("data-preview-target")
      return target ? target.slice("section:".length) : null
    }

    const recompute = () => {
      const doc = iframe.contentDocument
      if (!doc) return

      // Hover
      const hid = hoveredIdRef.current
      if (hid) {
        const el = doc.querySelector(
          `[data-preview-target="section:${cssEscape(hid)}"]`,
        )
        const group = findGroupBySection(
          useThemeSectionsStore.getState(),
          hid,
        )
        setHovered(
          el && group ? { id: hid, group, rect: rectOf(el) } : null,
        )
      } else {
        setHovered(null)
      }

      // Selection (from the store)
      const sel = useThemeSectionsStore.getState().selected
      const sid = sel?.kind === "section" ? sel.sectionId : null
      if (sid) {
        const el = doc.querySelector(
          `[data-preview-target="section:${cssEscape(sid)}"]`,
        )
        const group = findGroupBySection(
          useThemeSectionsStore.getState(),
          sid,
        )
        setSelected(
          el && group ? { id: sid, group, rect: rectOf(el) } : null,
        )
      } else {
        setSelected(null)
      }
    }

    const schedule = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = 0
        recompute()
      })
    }

    const onMouseOver = (e: Event) => {
      const id = sectionIdFrom(e.target)
      if (id !== hoveredIdRef.current) {
        hoveredIdRef.current = id
        schedule()
      }
    }
    const onMouseLeaveDoc = () => {
      if (hoveredIdRef.current !== null) {
        hoveredIdRef.current = null
        schedule()
      }
    }
    const onClick = (e: Event) => {
      // Neutralize storefront navigation while editing on the canvas.
      e.preventDefault()
      e.stopPropagation()
      const id = sectionIdFrom(e.target)
      const store = useThemeSectionsStore.getState()
      if (id && findGroupBySection(store, id)) {
        store.select({ kind: "section", sectionId: id })
      } else {
        store.select(null)
      }
    }
    const onScroll = () => schedule()

    const detach = () => {
      if (attachedDoc) {
        attachedDoc.removeEventListener("mouseover", onMouseOver, true)
        attachedDoc.removeEventListener("mouseleave", onMouseLeaveDoc, true)
        attachedDoc.removeEventListener("click", onClick, true)
        attachedDoc.defaultView?.removeEventListener("scroll", onScroll, true)
      }
      observer?.disconnect()
      observer = null
      attachedDoc = null
    }

    const attach = () => {
      const doc = iframe.contentDocument
      const win = iframe.contentWindow
      if (!doc || !win) return
      if (attachedDoc === doc) {
        schedule()
        return
      }
      detach()
      doc.addEventListener("mouseover", onMouseOver, true)
      doc.addEventListener("mouseleave", onMouseLeaveDoc, true)
      doc.addEventListener("click", onClick, true)
      win.addEventListener("scroll", onScroll, true)
      if (doc.body) {
        observer = new ResizeObserver(schedule)
        observer.observe(doc.body)
      }
      attachedDoc = doc
      schedule()
    }

    const onLoad = () => attach()
    iframe.addEventListener("load", onLoad)
    attach()

    const unsub = useThemeSectionsStore.subscribe(schedule)
    window.addEventListener("resize", onScroll)
    window.addEventListener("scroll", onScroll, true)

    return () => {
      iframe.removeEventListener("load", onLoad)
      detach()
      unsub()
      window.removeEventListener("resize", onScroll)
      window.removeEventListener("scroll", onScroll, true)
      if (rafId) cancelAnimationFrame(rafId)
      hoveredIdRef.current = null
    }
  }, [iframeRef, enabled, device, previewUrl])

  return { hovered, selected }
}

/** CSS.escape fallback for attribute-selector safety. */
function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value)
  }
  return value.replace(/["\\]/g, "\\$&")
}

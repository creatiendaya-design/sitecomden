"use client"

import { useEffect, useMemo, useState, type RefObject } from "react"
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

export interface OverlaySection {
  id: string
  group: ThemeSectionGroup
  rect: OverlayRect
}

interface Options {
  enabled: boolean
  device: string
  previewUrl: string | null
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value)
  }
  return value.replace(/["\\]/g, "\\$&")
}

function sectionIdFrom(node: Element | null): string | null {
  if (!node) return null
  const el = node.closest('[data-preview-target^="section:"]')
  if (!el) return null
  const target = el.getAttribute("data-preview-target")
  return target ? target.slice("section:".length) : null
}

/**
 * Plan 19 — interactive canvas overlay for the customizer iframe.
 *
 * Hover/click are NOT detected via listeners inside the iframe document
 * (unreliable across the iframe's document swaps). Instead the overlay
 * component renders a transparent capture surface in the PARENT over the
 * iframe and calls `handleMove`/`handleSelect` with client coordinates; this
 * hook maps them to a section using the iframe's `elementFromPoint`
 * (same-origin). Section rects are computed as `section rect + iframe offset`
 * and recomputed on a `tick` bumped by scroll/resize/layout/store changes.
 */
export function useIframeSectionOverlay(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  { enabled, device, previewUrl }: Options,
): {
  hovered: OverlaySection | null
  selected: OverlaySection | null
  iframeRect: OverlayRect | null
  handleMove: (clientX: number, clientY: number) => void
  handleLeave: () => void
  handleSelect: (clientX: number, clientY: number) => void
  scrollBy: (deltaX: number, deltaY: number) => void
} {
  const storeSelected = useThemeSectionsStore((s) => s.selected)
  const selectedId =
    storeSelected?.kind === "section" ? storeSelected.sectionId : null

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [iframeRect, setIframeRect] = useState<OverlayRect | null>(null)

  // Recompute trigger: keep `tick` + `iframeRect` fresh on scroll / resize /
  // iframe internal scroll / layout changes / store mutations / reload.
  useEffect(() => {
    if (!enabled) {
      setHoveredId(null)
      setIframeRect(null)
      return
    }
    const iframe = iframeRef.current
    if (!iframe) return

    let raf = 0
    let attachedWin: Window | null = null
    let observer: ResizeObserver | null = null

    const bump = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const f = iframe.getBoundingClientRect()
        setIframeRect({ top: f.top, left: f.left, width: f.width, height: f.height })
        setTick((t) => t + 1)
      })
    }

    const sync = () => {
      const win = iframe.contentWindow
      if (win && win !== attachedWin) {
        attachedWin?.removeEventListener("scroll", bump, true)
        win.addEventListener("scroll", bump, true)
        attachedWin = win
      }
      const doc = iframe.contentDocument
      if (doc?.body) {
        observer?.disconnect()
        observer = new ResizeObserver(bump)
        observer.observe(doc.body)
      }
      bump()
    }

    const onLoad = () => sync()
    iframe.addEventListener("load", onLoad)
    sync()
    const poll = window.setInterval(sync, 1000)
    const unsub = useThemeSectionsStore.subscribe(bump)
    window.addEventListener("resize", bump)
    window.addEventListener("scroll", bump, true)

    return () => {
      iframe.removeEventListener("load", onLoad)
      attachedWin?.removeEventListener("scroll", bump, true)
      observer?.disconnect()
      if (raf) cancelAnimationFrame(raf)
      window.clearInterval(poll)
      unsub()
      window.removeEventListener("resize", bump)
      window.removeEventListener("scroll", bump, true)
    }
  }, [iframeRef, enabled, device, previewUrl])

  const computeSection = (id: string | null): OverlaySection | null => {
    if (!id) return null
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc || !iframe) return null
    const el = doc.querySelector(
      `[data-preview-target="section:${cssEscape(id)}"]`,
    )
    const group = findGroupBySection(useThemeSectionsStore.getState(), id)
    if (!el || !group) return null
    const r = el.getBoundingClientRect()
    const f = iframe.getBoundingClientRect()
    return {
      id,
      group,
      rect: {
        top: r.top + f.top,
        left: r.left + f.left,
        width: r.width,
        height: r.height,
      },
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hovered = useMemo(() => computeSection(hoveredId), [hoveredId, tick])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selected = useMemo(() => computeSection(selectedId), [selectedId, tick])

  const elementAt = (clientX: number, clientY: number): Element | null => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc || !iframe) return null
    const f = iframe.getBoundingClientRect()
    return doc.elementFromPoint(clientX - f.left, clientY - f.top)
  }

  const handleMove = (clientX: number, clientY: number) => {
    setHoveredId(sectionIdFrom(elementAt(clientX, clientY)))
  }
  const handleLeave = () => setHoveredId(null)
  const handleSelect = (clientX: number, clientY: number) => {
    const id = sectionIdFrom(elementAt(clientX, clientY))
    const store = useThemeSectionsStore.getState()
    store.select(
      id && findGroupBySection(store, id)
        ? { kind: "section", sectionId: id }
        : null,
    )
  }
  const scrollBy = (deltaX: number, deltaY: number) => {
    iframeRef.current?.contentWindow?.scrollBy({ left: deltaX, top: deltaY })
  }

  return {
    hovered,
    selected,
    iframeRect,
    handleMove,
    handleLeave,
    handleSelect,
    scrollBy,
  }
}

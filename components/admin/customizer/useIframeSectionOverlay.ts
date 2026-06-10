"use client"

import { useEffect, useMemo, useState, type RefObject } from "react"
import type { ThemeSectionGroup } from "@prisma/client"
import {
  useThemeSectionsStore,
  findGroupBySection,
} from "./theme-sections-store"
import { useBuilderStore } from "@/components/admin/page-builder/store"

export interface OverlayRect {
  top: number
  left: number
  width: number
  height: number
}

export interface OverlayTarget {
  /** "section" = theme section (ThemeSection store); "block" = page-builder block. */
  kind: "section" | "block"
  id: string
  /** Theme-section group (only for kind === "section"). */
  group: ThemeSectionGroup | null
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

/** The full `data-preview-target` value ("section:<id>" | "block:<id>") under a node. */
function targetKeyFrom(node: Element | null): string | null {
  if (!node) return null
  const el = node.closest(
    '[data-preview-target^="section:"],[data-preview-target^="block:"]',
  )
  return el?.getAttribute("data-preview-target") ?? null
}

/**
 * Plan 19 — interactive canvas overlay for the customizer iframe. Works for
 * BOTH editing systems visible in the preview:
 *  - theme sections (`data-preview-target="section:<id>"`, ThemeSection store)
 *  - page-builder blocks (`data-preview-target="block:<id>"`, builder store)
 *
 * Hover/click are detected from a parent capture surface (the overlay
 * component) and mapped to a target via the iframe's `elementFromPoint`
 * (same-origin). Rects are `target rect + iframe offset`, recomputed on a
 * `tick` bumped by scroll/resize/layout/store changes.
 */
export function useIframeSectionOverlay(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  { enabled, device, previewUrl }: Options,
): {
  hovered: OverlayTarget | null
  selected: OverlayTarget | null
  iframeRect: OverlayRect | null
  handleMove: (clientX: number, clientY: number) => void
  handleLeave: () => void
  handleSelect: (clientX: number, clientY: number) => void
  scrollBy: (deltaX: number, deltaY: number) => void
} {
  const themeSelected = useThemeSectionsStore((s) => s.selected)
  const builderSelected = useBuilderStore((s) => s.selectedBlockId)
  const selectedKey =
    themeSelected?.kind === "section"
      ? `section:${themeSelected.sectionId}`
      : builderSelected
        ? `block:${builderSelected}`
        : null

  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [iframeRect, setIframeRect] = useState<OverlayRect | null>(null)

  useEffect(() => {
    if (!enabled) {
      setHoveredKey(null)
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
        setIframeRect({
          top: f.top,
          left: f.left,
          width: f.width,
          height: f.height,
        })
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
    const unsubTheme = useThemeSectionsStore.subscribe(bump)
    const unsubBuilder = useBuilderStore.subscribe(bump)
    window.addEventListener("resize", bump)
    window.addEventListener("scroll", bump, true)

    return () => {
      iframe.removeEventListener("load", onLoad)
      attachedWin?.removeEventListener("scroll", bump, true)
      observer?.disconnect()
      if (raf) cancelAnimationFrame(raf)
      window.clearInterval(poll)
      unsubTheme()
      unsubBuilder()
      window.removeEventListener("resize", bump)
      window.removeEventListener("scroll", bump, true)
    }
  }, [iframeRef, enabled, device, previewUrl])

  const compute = (key: string | null): OverlayTarget | null => {
    if (!key) return null
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc || !iframe) return null
    const el = doc.querySelector(
      `[data-preview-target="${cssEscape(key)}"]`,
    )
    if (!el) return null
    const sep = key.indexOf(":")
    const kind = key.slice(0, sep) as "section" | "block"
    const id = key.slice(sep + 1)
    let group: ThemeSectionGroup | null = null
    if (kind === "section") {
      group = findGroupBySection(useThemeSectionsStore.getState(), id)
      if (!group) return null
    }
    const r = el.getBoundingClientRect()
    const f = iframe.getBoundingClientRect()
    return {
      kind,
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
  const hovered = useMemo(() => compute(hoveredKey), [hoveredKey, tick])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selected = useMemo(() => compute(selectedKey), [selectedKey, tick])

  const elementAt = (clientX: number, clientY: number): Element | null => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc || !iframe) return null
    const f = iframe.getBoundingClientRect()
    return doc.elementFromPoint(clientX - f.left, clientY - f.top)
  }

  const handleMove = (clientX: number, clientY: number) => {
    setHoveredKey(targetKeyFrom(elementAt(clientX, clientY)))
  }
  const handleLeave = () => setHoveredKey(null)
  const handleSelect = (clientX: number, clientY: number) => {
    const key = targetKeyFrom(elementAt(clientX, clientY))
    const themeStore = useThemeSectionsStore.getState()
    const builderStore = useBuilderStore.getState()
    if (!key) {
      themeStore.select(null)
      builderStore.selectBlock(null)
      return
    }
    const sep = key.indexOf(":")
    const kind = key.slice(0, sep)
    const id = key.slice(sep + 1)
    if (kind === "section") {
      if (findGroupBySection(themeStore, id)) {
        themeStore.select({ kind: "section", sectionId: id })
      }
    } else {
      builderStore.selectBlock(id)
    }
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

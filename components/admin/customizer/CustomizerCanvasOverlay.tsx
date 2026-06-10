"use client"

import { useEffect, useRef, type RefObject } from "react"
import {
  useIframeSectionOverlay,
  type OverlayRect,
} from "./useIframeSectionOverlay"
import { CustomizerSectionToolbar } from "./CustomizerSectionToolbar"

interface Props {
  iframeRef: RefObject<HTMLIFrameElement | null>
  /** Active only in the sections view with a live preview. */
  enabled: boolean
  device: string
  previewUrl: string | null
  /** Fase 3 — per-product override mode (detach/restore in the toolbar). */
  productOverride: { productId: string; productSlug: string } | null
}

/**
 * Plan 19 — interactive canvas overlay over the customizer iframe.
 *
 * A transparent capture surface (positioned over the iframe) detects
 * hover/click in the PARENT and maps them to sections via the hook's
 * `elementFromPoint`. This avoids the unreliable in-iframe listeners. The
 * capture surface forwards wheel events so the preview still scrolls.
 * Hover/selection borders are drawn above it (pointer-events-none), and the
 * floating toolbar sits on top.
 */
export function CustomizerCanvasOverlay({
  iframeRef,
  enabled,
  device,
  previewUrl,
  productOverride,
}: Props) {
  const {
    hovered,
    selected,
    iframeRect,
    handleMove,
    handleLeave,
    handleSelect,
    scrollBy,
  } = useIframeSectionOverlay(iframeRef, { enabled, device, previewUrl })

  // Forward wheel to the iframe (the capture surface would otherwise swallow
  // it). Native listener with passive:false so preventDefault works.
  const captureRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = captureRef.current
    if (!el || !enabled) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      scrollBy(e.deltaX, e.deltaY)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [enabled, scrollBy])

  if (!enabled || !iframeRect) return null

  const clip = iframeRect
  const showHover = hovered && (!selected || hovered.id !== selected.id)
  // Borders are drawn inside a clip box the exact size of the iframe, with
  // coordinates RELATIVE to it, so a section scrolled partly out of view
  // never paints over the header / toolbar / browser chrome.
  const rel = (r: OverlayRect): OverlayRect => ({
    top: r.top - clip.top,
    left: r.left - clip.left,
    width: r.width,
    height: r.height,
  })

  return (
    <>
      <div
        ref={captureRef}
        className="fixed z-20"
        style={{
          top: clip.top,
          left: clip.left,
          width: clip.width,
          height: clip.height,
        }}
        onPointerMove={(e) => handleMove(e.clientX, e.clientY)}
        onPointerLeave={handleLeave}
        onPointerDown={(e) => handleSelect(e.clientX, e.clientY)}
      />

      <div
        className="pointer-events-none fixed z-30 overflow-hidden"
        style={{
          top: clip.top,
          left: clip.left,
          width: clip.width,
          height: clip.height,
        }}
      >
        {showHover && (
          <Box
            rect={rel(hovered.rect)}
            className="outline outline-2 -outline-offset-2 outline-blue-400/60"
          />
        )}
        {selected && (
          <Box
            rect={rel(selected.rect)}
            className="outline outline-2 -outline-offset-2 outline-blue-500"
          />
        )}
      </div>

      {selected && (
        <CustomizerSectionToolbar
          target={selected}
          clip={clip}
          productOverride={productOverride}
        />
      )}
    </>
  )
}

function Box({ rect, className }: { rect: OverlayRect; className: string }) {
  return (
    <div
      className={`absolute ${className}`}
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    />
  )
}

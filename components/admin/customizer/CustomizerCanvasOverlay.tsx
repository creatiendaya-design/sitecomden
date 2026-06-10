"use client"

import type { RefObject } from "react"
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
 * Plan 19 — interactive canvas overlay drawn in the PARENT, positioned over
 * the customizer iframe. Reads section rects via `useIframeSectionOverlay`
 * and paints a blue hover/selection border (Shopify/page-builder style).
 * `pointer-events-none` so it never blocks the iframe or the sidebar.
 * (Fase 2 adds the floating toolbar.)
 */
export function CustomizerCanvasOverlay({
  iframeRef,
  enabled,
  device,
  previewUrl,
  productOverride,
}: Props) {
  const { hovered, selected } = useIframeSectionOverlay(iframeRef, {
    enabled,
    device,
    previewUrl,
  })

  if (!enabled) return null

  const showHover = hovered && (!selected || hovered.id !== selected.id)

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-30">
        {showHover && (
          <Box
            rect={hovered.rect}
            className="border-2 border-blue-400/60 rounded-[1px]"
          />
        )}
        {selected && (
          <Box
            rect={selected.rect}
            className="border-2 border-blue-500 rounded-[1px]"
          />
        )}
      </div>
      {selected && (
        <CustomizerSectionToolbar
          sectionId={selected.id}
          group={selected.group}
          rect={selected.rect}
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

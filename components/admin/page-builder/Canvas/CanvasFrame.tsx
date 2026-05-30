"use client"

import type { ReactNode } from "react"
import { useBuilderStore } from "../store"
import { cn } from "@/lib/utils"

interface CanvasFrameProps {
  children: ReactNode
}

/**
 * Simulates a viewport frame around the preview. Desktop gets a subtle
 * browser-chrome look; mobile gets a phone-frame look. The width transitions
 * smoothly when the DeviceToggle flips.
 *
 * The scrolling lives INSIDE the frame (not outside it) so that
 * `position: sticky top-0` children stick to the top of the device preview
 * — matching the customer-facing behavior on the storefront.
 */
export function CanvasFrame({ children }: CanvasFrameProps) {
  const device = useBuilderStore((s) => s.device)
  return (
    <div className="flex-1 flex items-stretch justify-center py-6 px-4 overflow-hidden min-h-0">
      <div
        className={cn(
          // `pb-canvas-light` insulates this storefront preview frame from the
          // admin's dark theme so the canvas content never inherits dark
          // `--background`/`--muted`/… tokens (see app/globals.css). The
          // sidebars/topbar live outside the frame and stay theme-driven.
          "pb-canvas-light bg-background shadow-xl border transition-all duration-200 overflow-y-auto overflow-x-hidden",
          device === "desktop"
            ? "w-full max-w-[1280px] rounded-lg"
            : "w-[375px] rounded-2xl border-2"
        )}
      >
        {children}
      </div>
    </div>
  )
}

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
 */
export function CanvasFrame({ children }: CanvasFrameProps) {
  const device = useBuilderStore((s) => s.device)
  return (
    <div className="flex-1 flex items-start justify-center overflow-auto py-6 px-4">
      <div
        className={cn(
          "bg-background shadow-xl border rounded-lg overflow-hidden transition-all duration-200",
          device === "desktop"
            ? "w-full max-w-[1280px]"
            : "w-[375px] rounded-2xl border-2"
        )}
      >
        {children}
      </div>
    </div>
  )
}

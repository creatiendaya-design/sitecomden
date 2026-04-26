"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import type { DeviceMode } from "./CustomizerToolbar"

interface Props {
  src: string
  device: DeviceMode
}

const DEVICE_FRAME: Record<DeviceMode, string> = {
  desktop: "w-full max-w-[1400px] h-full",
  tablet: "w-[820px] max-w-full h-[1100px] max-h-full",
  mobile: "w-[390px] max-w-full h-[844px] max-h-full",
}

/**
 * Plan 13 — preview iframe in the right panel of the customizer.
 *
 * Loads the storefront with `?theme-preview=<id>`. The middleware copies
 * that into a request header so the theme resolver renders THIS theme,
 * regardless of which is currently active.
 *
 * The shell controls reload via `iframe.contentWindow.location.reload()`
 * after a successful save — no postMessage needed since same-origin
 * iframes expose contentWindow directly. Same-origin also means the
 * iframe inherits the admin's session cookie, which the resolver uses
 * to gate the preview header (admins-only).
 */
export const CustomizerPreview = forwardRef<HTMLIFrameElement, Props>(
  function CustomizerPreview({ src, device }, ref) {
    return (
      <div
        className={cn(
          "rounded-md overflow-hidden border bg-background shadow-sm transition-all",
          DEVICE_FRAME[device],
          // Tablet/mobile centered with a soft outline so the device
          // frame is visually distinct from the gray surround.
          device !== "desktop" && "ring-1 ring-border",
        )}
      >
        <iframe
          ref={ref}
          src={src}
          title="Vista previa del tema"
          className="w-full h-full border-0"
          // sandbox kept permissive so storefront JS (cart, search, etc.)
          // works inside the iframe just like a real visit.
        />
      </div>
    )
  },
)

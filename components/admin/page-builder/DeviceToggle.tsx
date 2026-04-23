"use client"

import { Monitor, Smartphone } from "lucide-react"
import { useBuilderStore } from "./store"
import { cn } from "@/lib/utils"

export function DeviceToggle() {
  const device = useBuilderStore((s) => s.device)
  const setDevice = useBuilderStore((s) => s.setDevice)

  return (
    <div className="inline-flex items-center rounded-md border bg-background p-0.5">
      <button
        type="button"
        onClick={() => setDevice("desktop")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
          device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={device === "desktop"}
        aria-label="Vista desktop"
      >
        <Monitor className="h-4 w-4" />
        Desktop
      </button>
      <button
        type="button"
        onClick={() => setDevice("mobile")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
          device === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={device === "mobile"}
        aria-label="Vista mobile"
      >
        <Smartphone className="h-4 w-4" />
        Mobile
      </button>
    </div>
  )
}

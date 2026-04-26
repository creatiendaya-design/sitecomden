"use client"

import {
  Smartphone,
  Tablet,
  Monitor,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PagePicker } from "./PagePicker"
import type { PageTarget } from "./page-targets"

export type DeviceMode = "desktop" | "tablet" | "mobile"

interface Props {
  themeName: string
  targets: PageTarget[]
  currentTargetKey: string
  onTargetChange: (key: string) => void
  device: DeviceMode
  onDeviceChange: (device: DeviceMode) => void
  isDirty: boolean
  pending: boolean
  onSave: () => void
  onExit: () => void
}

const DEVICES: { key: DeviceMode; icon: typeof Smartphone; label: string }[] = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
]

export function CustomizerToolbar({
  targets,
  currentTargetKey,
  onTargetChange,
  device,
  onDeviceChange,
  isDirty,
  pending,
  onSave,
  onExit,
}: Props) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-4">
      {/* Left: page picker */}
      <div className="flex items-center gap-3 min-w-0">
        <PagePicker
          targets={targets}
          currentKey={currentTargetKey}
          onChange={onTargetChange}
        />
      </div>

      {/* Center: device toggle */}
      <div className="flex items-center rounded-md border bg-background p-0.5">
        {DEVICES.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onDeviceChange(key)}
            aria-label={label}
            aria-pressed={device === key}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded transition-colors",
              device === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Right: save + exit */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onExit} disabled={pending}>
          Salir
        </Button>
        <Button size="sm" onClick={onSave} disabled={!isDirty || pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar"
          )}
        </Button>
      </div>
    </div>
  )
}

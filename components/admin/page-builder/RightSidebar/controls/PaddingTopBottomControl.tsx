"use client"

import { cn } from "@/lib/utils"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue, PaddingSize } from "@/lib/blocks/types"

const OPTIONS: PaddingSize[] = ["none", "sm", "md", "lg", "xl"]
const LABELS: Record<PaddingSize, string> = {
  none: "—", sm: "S", md: "M", lg: "L", xl: "XL",
}

interface Props {
  topValue: DeviceValue<PaddingSize> | undefined
  bottomValue: DeviceValue<PaddingSize> | undefined
  onTopChange: (v: DeviceValue<PaddingSize> | undefined) => void
  onBottomChange: (v: DeviceValue<PaddingSize> | undefined) => void
}

export function PaddingTopBottomControl({ topValue, bottomValue, onTopChange, onBottomChange }: Props) {
  return (
    <div className="space-y-3">
      <DeviceOverrideWrapper
        label="Padding superior"
        value={topValue}
        onChange={onTopChange}
        render={(v, setV) => <PaddingRow current={v} onChange={setV} />}
      />
      <DeviceOverrideWrapper
        label="Padding inferior"
        value={bottomValue}
        onChange={onBottomChange}
        render={(v, setV) => <PaddingRow current={v} onChange={setV} />}
      />
    </div>
  )
}

function PaddingRow({ current, onChange }: { current: PaddingSize | undefined; onChange: (v: PaddingSize) => void }) {
  return (
    <div className="inline-flex rounded-md border bg-background p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded transition-colors",
            current === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={current === opt}
          title={`Padding ${opt}`}
        >
          {LABELS[opt]}
        </button>
      ))}
    </div>
  )
}

"use client"

import { Input } from "@/components/ui/input"
import { DeviceOverrideWrapper } from "./DeviceOverrideWrapper"
import type { DeviceValue } from "@/lib/blocks/types"
import { useDebouncedCommit } from "@/lib/blocks/schema/use-debounced-commit"

interface ColorControlProps {
  label: string
  value: DeviceValue<string> | undefined
  onChange: (next: DeviceValue<string> | undefined) => void
}

// 0ms: color picker / hex changes commit to the store synchronously.
// useLivePreviewOverrides reads the store and patches the iframe in the
// same tick, so the storefront repaints instantly. The autosave layer
// (theme-sections / page-builder) keeps its own debounce for the server
// write — we don't need this debounce too once live preview is wired.
const COMMIT_DEBOUNCE_MS = 0

export function ColorControl({ label, value, onChange }: ColorControlProps) {
  return (
    <DeviceOverrideWrapper
      label={label}
      value={value}
      onChange={onChange}
      render={(v, setV) => <ColorRow value={v} onChange={setV} label={label} />}
    />
  )
}

/**
 * Single hex+picker row with local-mirror + debounced commit. Two inputs
 * share one debounced value so dragging the native color picker doesn't
 * flood the store with a write per pixel.
 */
function ColorRow({
  value,
  onChange,
  label,
}: {
  value: string | undefined
  onChange: (v: string | undefined) => void
  label: string
}) {
  const { local, set, flush } = useDebouncedCommit<string>(
    value ?? "",
    (next) => onChange(next || undefined),
    COMMIT_DEBOUNCE_MS,
  )

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={local || "#ffffff"}
        onChange={(e) => set(e.target.value)}
        onBlur={flush}
        className="h-8 w-10 rounded border cursor-pointer p-0.5"
        aria-label={`${label} color picker`}
      />
      <Input
        value={local}
        onChange={(e) => set(e.target.value)}
        onBlur={flush}
        placeholder="#000000"
        className="text-xs h-8 font-mono flex-1"
      />
    </div>
  )
}

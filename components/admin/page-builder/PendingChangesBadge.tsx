"use client"

import { useBuilderStore } from "./store"

export function PendingChangesBadge() {
  const count = useBuilderStore((s) => s.pendingChangeCount)
  const editorMode = useBuilderStore((s) => s.editorMode)

  if (editorMode !== "template" || count === 0) return null

  return (
    <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-md font-medium">
      {count} {count === 1 ? "cambio pendiente" : "cambios pendientes"}
    </span>
  )
}

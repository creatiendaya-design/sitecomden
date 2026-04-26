"use client"

import { Check, Loader2, AlertCircle } from "lucide-react"
import { useBuilderStore } from "@/components/admin/page-builder/store"
import { cn } from "@/lib/utils"

/**
 * Plan 13 — replaces the manual Save button. Reads the page-builder
 * store's saveStatus (which the EmbeddedBlocksEditor updates on each
 * autosave) and shows "Guardando…" / "Guardado" / "Error" in the toolbar.
 *
 * Header/Footer menu changes also indirectly surface through this — they
 * trigger router.refresh() which re-renders this component fresh.
 */
export function SaveStatusIndicator() {
  const status = useBuilderStore((s) => s.saveStatus)

  if (status.status === "idle") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5" />
        Guardado
      </span>
    )
  }

  if (status.status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Guardando…
      </span>
    )
  }

  if (status.status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <Check className="h-3.5 w-3.5" />
        Guardado
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-destructive",
      )}
      title={status.message}
    >
      <AlertCircle className="h-3.5 w-3.5" />
      Error al guardar
    </span>
  )
}

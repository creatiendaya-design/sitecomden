"use client"

import Link from "next/link"
import { ArrowLeft, Check, Loader2, AlertCircle, MoreVertical } from "lucide-react"
import { useBuilderStore } from "./store"
import { DeviceToggle } from "./DeviceToggle"
import { PendingChangesBadge } from "./PendingChangesBadge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PageBuilderActions } from "./types"

interface TopBarProps {
  title?: string
  backHref?: string
  actions?: PageBuilderActions
}

export function TopBar({ title, backHref, actions }: TopBarProps) {
  const editorMode = useBuilderStore((s) => s.editorMode)
  const pendingCount = useBuilderStore((s) => s.pendingChangeCount)

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b bg-background shrink-0">
      {backHref && (
        <Button asChild variant="ghost" size="icon">
          <Link href={backHref} aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      )}
      {title && <h1 className="font-medium text-sm truncate max-w-xs">{title}</h1>}

      <div className="flex-1 flex items-center justify-center">
        <DeviceToggle />
      </div>

      <div className="flex items-center gap-2">
        {editorMode === "template" ? (
          <>
            <PendingChangesBadge />
            {actions?.onDiscardDraft && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pendingCount === 0}
                onClick={actions.onDiscardDraft}
              >
                Descartar cambios
              </Button>
            )}
            {actions?.onSaveTemplate && (
              <Button
                size="sm"
                disabled={pendingCount === 0}
                onClick={actions.onSaveTemplate}
              >
                Guardar y propagar
              </Button>
            )}
          </>
        ) : (
          <SaveStatusIndicator />
        )}
        {(actions?.onApplyTemplate ||
          actions?.onSaveAsTemplate ||
          actions?.onUnlinkTemplate) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Más acciones">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions?.onApplyTemplate && (
                <DropdownMenuItem onClick={actions.onApplyTemplate}>
                  Aplicar plantilla...
                </DropdownMenuItem>
              )}
              {actions?.onSaveAsTemplate && (
                <DropdownMenuItem onClick={actions.onSaveAsTemplate}>
                  Guardar como plantilla...
                </DropdownMenuItem>
              )}
              {actions?.onUnlinkTemplate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={actions.onUnlinkTemplate} className="text-destructive">
                    Desvincular plantilla
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}

function SaveStatusIndicator() {
  const status = useBuilderStore((s) => s.saveStatus)

  switch (status.status) {
    case "saving":
      return (
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Guardando...
        </span>
      )
    case "saved":
      return (
        <span className="text-xs text-green-600 inline-flex items-center gap-1.5">
          <Check className="h-3 w-3" />
          Guardado
        </span>
      )
    case "error":
      return (
        <span className="text-xs text-destructive inline-flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          {status.message}
        </span>
      )
    default:
      return null
  }
}

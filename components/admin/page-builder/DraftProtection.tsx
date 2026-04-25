"use client"

import { useEffect, useState } from "react"
import { useBuilderStore } from "./store"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { BlockInstance } from "@/lib/blocks/types"

interface DraftPayload {
  blocks: BlockInstance[]
  savedAt: number
}

interface Props {
  templateId: string
  userId: string
  /** Timestamp of the last persisted update for this template (compare against
   *  backup.savedAt to decide whether to prompt for recovery). */
  persistedAt: number
  /** When true, opens the discard-changes confirm dialog. */
  showDiscardConfirm: boolean
  onCloseDiscardConfirm: () => void
}

export function DraftProtection({
  templateId,
  userId,
  persistedAt,
  showDiscardConfirm,
  onCloseDiscardConfirm,
}: Props) {
  const blocks = useBuilderStore((s) => s.blocks)
  const pendingCount = useBuilderStore((s) => s.pendingChangeCount)
  const originalSnapshot = useBuilderStore((s) => s.originalSnapshot)
  const setBlocks = useBuilderStore((s) => s.setBlocks)

  const [recoverPayload, setRecoverPayload] = useState<DraftPayload | null>(null)

  const storageKey = `template-draft-${templateId}-${userId}`

  // 1. On mount: check if a stored draft is newer than the persisted state.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as DraftPayload
      if (parsed.savedAt > persistedAt && Array.isArray(parsed.blocks)) {
        setRecoverPayload(parsed)
      }
    } catch {
      // ignore corrupt backups
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. Auto-backup every 5 seconds when there are pending changes.
  useEffect(() => {
    if (pendingCount === 0) return
    const handle = setInterval(() => {
      try {
        const payload: DraftPayload = { blocks, savedAt: Date.now() }
        localStorage.setItem(storageKey, JSON.stringify(payload))
      } catch {
        // localStorage full or unavailable
      }
    }, 5000)
    return () => clearInterval(handle)
  }, [blocks, pendingCount, storageKey])

  // 3. Warn the user before leaving/refreshing when there are pending changes.
  useEffect(() => {
    if (pendingCount === 0) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [pendingCount])

  const handleRecover = () => {
    if (!recoverPayload) return
    setBlocks(recoverPayload.blocks)
    setRecoverPayload(null)
  }

  const handleDiscardBackup = () => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
    setRecoverPayload(null)
  }

  const handleConfirmDiscard = () => {
    // Revert blocks back to the original snapshot, clear localStorage.
    setBlocks(originalSnapshot)
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
    onCloseDiscardConfirm()
  }

  return (
    <>
      {recoverPayload && (
        <AlertDialog open onOpenChange={(o) => !o && handleDiscardBackup()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Recuperar cambios no guardados</AlertDialogTitle>
              <AlertDialogDescription>
                Encontramos un borrador de tu sesión anterior con cambios sin
                guardar. ¿Querés recuperarlos o descartarlos?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDiscardBackup}>
                Descartar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleRecover}>
                Recuperar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog
        open={showDiscardConfirm}
        onOpenChange={(o) => !o && onCloseDiscardConfirm()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar cambios</AlertDialogTitle>
            <AlertDialogDescription>
              Se perderán {pendingCount}{" "}
              {pendingCount === 1 ? "cambio" : "cambios"} sin guardar.
              ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCloseDiscardConfirm}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

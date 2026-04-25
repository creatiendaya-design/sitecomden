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
}

export function DraftProtection({ templateId, userId, persistedAt }: Props) {
  const blocks = useBuilderStore((s) => s.blocks)
  const pendingCount = useBuilderStore((s) => s.pendingChangeCount)
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

  const handleRecover = () => {
    if (!recoverPayload) return
    setBlocks(recoverPayload.blocks)
    setRecoverPayload(null)
  }

  const handleDiscard = () => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
    setRecoverPayload(null)
  }

  if (!recoverPayload) return null

  return (
    <AlertDialog open onOpenChange={(o) => !o && handleDiscard()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Recuperar cambios no guardados</AlertDialogTitle>
          <AlertDialogDescription>
            Encontramos un borrador de tu sesión anterior con cambios sin
            guardar. ¿Querés recuperarlos o descartarlos?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDiscard}>Descartar</AlertDialogCancel>
          <AlertDialogAction onClick={handleRecover}>Recuperar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

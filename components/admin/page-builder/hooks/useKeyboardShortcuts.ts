"use client"

import { useEffect } from "react"
import { useBuilderStore } from "../store"

/**
 * Global keyboard shortcuts for the page builder.
 * Active only when focus is NOT in an input, textarea, or contentEditable element.
 */
export function useKeyboardShortcuts() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const selectBlock = useBuilderStore((s) => s.selectBlock)
  const removeBlock = useBuilderStore((s) => s.removeBlock)
  const duplicateBlock = useBuilderStore((s) => s.duplicateBlock)
  const moveBlockRelative = useBuilderStore((s) => s.moveBlockRelative)
  const blocks = useBuilderStore((s) => s.blocks)

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
      if (target.isContentEditable) return true
      return false
    }

    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return

      if (e.key === "Escape") {
        selectBlock(null)
        return
      }

      if (!selectedBlockId) return

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        if (confirm("¿Eliminar este bloque?")) removeBlock(selectedBlockId)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault()
        duplicateBlock(selectedBlockId)
        return
      }

      const idx = blocks.findIndex((b) => b.id === selectedBlockId)
      if (idx < 0) return

      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowUp") {
        e.preventDefault()
        moveBlockRelative(selectedBlockId, "up")
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowDown") {
        e.preventDefault()
        moveBlockRelative(selectedBlockId, "down")
        return
      }
      if (e.key === "ArrowUp" && idx > 0) {
        e.preventDefault()
        selectBlock(blocks[idx - 1].id)
        return
      }
      if (e.key === "ArrowDown" && idx < blocks.length - 1) {
        e.preventDefault()
        selectBlock(blocks[idx + 1].id)
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectedBlockId, selectBlock, removeBlock, duplicateBlock, moveBlockRelative, blocks])
}

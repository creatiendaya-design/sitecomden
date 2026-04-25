"use client"

import { create } from "zustand"
import type { BlockInstance, LandingBlockType, BlockContentV2, Device, SaveStatus } from "./types"
import { getBlockDefinition } from "@/lib/blocks/registry"

type EditorMode = "product" | "template"

interface BuilderState {
  blocks: BlockInstance[]
  selectedBlockId: string | null
  device: Device
  saveStatus: SaveStatus
  isDirty: boolean

  // Template-editor state
  editorMode: EditorMode
  originalSnapshot: BlockInstance[]
  pendingChangeCount: number

  // Setters
  setBlocks: (blocks: BlockInstance[]) => void
  selectBlock: (id: string | null) => void
  setDevice: (device: Device) => void
  setSaveStatus: (status: SaveStatus) => void
  setEditorMode: (mode: EditorMode) => void
  setOriginalSnapshot: (blocks: BlockInstance[]) => void
  recomputePendingCount: () => void

  // Mutations (return the new blocks so the wrapper can persist via Server Action)
  updateBlockContent: (id: string, content: BlockContentV2) => BlockInstance[]
  reorderBlocks: (fromIndex: number, toIndex: number) => BlockInstance[]
  moveBlockRelative: (id: string, direction: "up" | "down") => BlockInstance[]
  addBlock: (type: LandingBlockType, position?: number) => BlockInstance[]
  duplicateBlock: (id: string) => BlockInstance[]
  removeBlock: (id: string) => BlockInstance[]
}

function diffCount(a: BlockInstance[], b: BlockInstance[]): number {
  const aById = new Map(a.map((x) => [x.id, x]))
  const bById = new Map(b.map((x) => [x.id, x]))
  let count = 0
  // added (in b not in a) + removed (in a not in b)
  for (const id of bById.keys()) if (!aById.has(id)) count++
  for (const id of aById.keys()) if (!bById.has(id)) count++
  // modified (in both, content/position/type differ)
  for (const [id, ax] of aById) {
    const bx = bById.get(id)
    if (!bx) continue
    if (
      ax.type !== bx.type ||
      ax.position !== bx.position ||
      JSON.stringify(ax.content) !== JSON.stringify(bx.content)
    ) {
      count++
    }
  }
  return count
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  blocks: [],
  selectedBlockId: null,
  device: "desktop",
  saveStatus: { status: "idle" },
  isDirty: false,

  editorMode: "product",
  originalSnapshot: [],
  pendingChangeCount: 0,

  setBlocks: (blocks) => {
    set({ blocks, isDirty: false })
    set({ pendingChangeCount: diffCount(get().originalSnapshot, blocks) })
  },
  selectBlock: (id) => set({ selectedBlockId: id }),
  setDevice: (device) => set({ device }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setEditorMode: (editorMode) => set({ editorMode }),
  setOriginalSnapshot: (originalSnapshot) => {
    set({ originalSnapshot })
    set({ pendingChangeCount: diffCount(originalSnapshot, get().blocks) })
  },
  recomputePendingCount: () => {
    set({ pendingChangeCount: diffCount(get().originalSnapshot, get().blocks) })
  },

  updateBlockContent: (id, content) => {
    const blocks = get().blocks.map((b) => (b.id === id ? { ...b, content } : b))
    set({ blocks, isDirty: true })
    set({ pendingChangeCount: diffCount(get().originalSnapshot, blocks) })
    return blocks
  },

  reorderBlocks: (fromIndex, toIndex) => {
    const current = [...get().blocks]
    const [moved] = current.splice(fromIndex, 1)
    current.splice(toIndex, 0, moved)
    const blocks = current.map((b, i) => ({ ...b, position: i }))
    set({ blocks, isDirty: true })
    set({ pendingChangeCount: diffCount(get().originalSnapshot, blocks) })
    return blocks
  },

  moveBlockRelative: (id, direction) => {
    const blocks = get().blocks
    const idx = blocks.findIndex((b) => b.id === id)
    if (idx < 0) return blocks
    const newIdx = direction === "up" ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= blocks.length) return blocks
    return get().reorderBlocks(idx, newIdx)
  },

  addBlock: (type, position) => {
    const def = getBlockDefinition(type)
    if (!def) return get().blocks
    const current = get().blocks
    const insertAt = position ?? current.length
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newBlock: BlockInstance = {
      id: tempId,
      type,
      position: insertAt,
      content: def.defaultContent,
    }
    const next = [
      ...current.slice(0, insertAt),
      newBlock,
      ...current.slice(insertAt),
    ].map((b, i) => ({ ...b, position: i }))
    set({ blocks: next, selectedBlockId: tempId, isDirty: true })
    set({ pendingChangeCount: diffCount(get().originalSnapshot, next) })
    return next
  },

  duplicateBlock: (id) => {
    const current = get().blocks
    const idx = current.findIndex((b) => b.id === id)
    if (idx < 0) return current
    const original = current[idx]
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const clone: BlockInstance = {
      ...original,
      id: tempId,
      sourceTemplateBlockId: null,  // a duplicate is always local
      detached: false,
    }
    const next = [
      ...current.slice(0, idx + 1),
      clone,
      ...current.slice(idx + 1),
    ].map((b, i) => ({ ...b, position: i }))
    set({ blocks: next, selectedBlockId: tempId, isDirty: true })
    set({ pendingChangeCount: diffCount(get().originalSnapshot, next) })
    return next
  },

  removeBlock: (id) => {
    const next = get()
      .blocks.filter((b) => b.id !== id)
      .map((b, i) => ({ ...b, position: i }))
    const selected = get().selectedBlockId === id ? null : get().selectedBlockId
    set({ blocks: next, selectedBlockId: selected, isDirty: true })
    set({ pendingChangeCount: diffCount(get().originalSnapshot, next) })
    return next
  },
}))

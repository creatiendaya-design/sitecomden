"use client"

import { create } from "zustand"
import type { BlockInstance, LandingBlockType, BlockContentV2, Device, SaveStatus } from "./types"
import { getBlockDefinition } from "@/lib/blocks/registry"

interface BuilderState {
  blocks: BlockInstance[]
  selectedBlockId: string | null
  device: Device
  saveStatus: SaveStatus
  isDirty: boolean

  // Setters
  setBlocks: (blocks: BlockInstance[]) => void
  selectBlock: (id: string | null) => void
  setDevice: (device: Device) => void
  setSaveStatus: (status: SaveStatus) => void

  // Mutations (return the new blocks so the wrapper can persist via Server Action)
  updateBlockContent: (id: string, content: BlockContentV2) => BlockInstance[]
  reorderBlocks: (fromIndex: number, toIndex: number) => BlockInstance[]
  moveBlockRelative: (id: string, direction: "up" | "down") => BlockInstance[]
  addBlock: (type: LandingBlockType, position?: number) => BlockInstance[]
  duplicateBlock: (id: string) => BlockInstance[]
  removeBlock: (id: string) => BlockInstance[]
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  blocks: [],
  selectedBlockId: null,
  device: "desktop",
  saveStatus: { status: "idle" },
  isDirty: false,

  setBlocks: (blocks) => set({ blocks, isDirty: false }),
  selectBlock: (id) => set({ selectedBlockId: id }),
  setDevice: (device) => set({ device }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),

  updateBlockContent: (id, content) => {
    const blocks = get().blocks.map((b) => (b.id === id ? { ...b, content } : b))
    set({ blocks, isDirty: true })
    return blocks
  },

  reorderBlocks: (fromIndex, toIndex) => {
    const current = [...get().blocks]
    const [moved] = current.splice(fromIndex, 1)
    current.splice(toIndex, 0, moved)
    const blocks = current.map((b, i) => ({ ...b, position: i }))
    set({ blocks, isDirty: true })
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
    return next
  },

  removeBlock: (id) => {
    const next = get()
      .blocks.filter((b) => b.id !== id)
      .map((b, i) => ({ ...b, position: i }))
    const selected = get().selectedBlockId === id ? null : get().selectedBlockId
    set({ blocks: next, selectedBlockId: selected, isDirty: true })
    return next
  },
}))

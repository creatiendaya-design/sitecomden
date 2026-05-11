"use client"

import { create } from "zustand"
import type {
  CodFormTemplateData,
  CodFormBlock,
  ButtonStyle,
  PostSubmitAction,
  CodFormBlockType,
} from "@/lib/cod-forms/types"

type EditorState = CodFormTemplateData & {
  saveStatus: "idle" | "saving" | "saved" | "error"
  setName: (name: string) => void
  setButtonText: (v: string) => void
  setButtonStyle: (patch: Partial<ButtonStyle>) => void
  setPostSubmit: (a: PostSubmitAction) => void
  setThankYouTitle: (v: string | null) => void
  setThankYouMessage: (v: string | null) => void
  setWhatsappNumber: (v: string | null) => void
  setWhatsappMessage: (v: string | null) => void
  setThankYouPageId: (v: string | null) => void
  setBlocks: (blocks: CodFormBlock[]) => void
  patchBlock: (id: string, patch: Partial<CodFormBlock>) => void
  addBlock: (type: CodFormBlockType) => void
  removeBlock: (id: string) => void
  setShippingRateIds: (ids: string[]) => void
  toggleShippingRateId: (id: string) => void
  setSaveStatus: (s: EditorState["saveStatus"]) => void
  hydrate: (data: CodFormTemplateData) => void
}

export const useCodFormEditor = create<EditorState>((set) => ({
  // Filled by hydrate()
  id: "",
  name: "",
  isDefault: false,
  buttonText: "",
  buttonStyle: {} as ButtonStyle,
  postSubmitAction: "INLINE_THANK_YOU",
  thankYouTitle: null,
  thankYouMessage: null,
  whatsappNumber: null,
  whatsappMessage: null,
  thankYouPageId: null,
  thankYouPageSlug: null,
  blocks: [],
  shippingRateIds: [],
  saveStatus: "idle",

  hydrate: (data) =>
    set({
      ...data,
      shippingRateIds: [...(data.shippingRateIds ?? [])].sort(),
      saveStatus: "idle",
    }),
  setName: (name) => set({ name }),
  setButtonText: (buttonText) => set({ buttonText }),
  setButtonStyle: (patch) =>
    set((s) => ({ buttonStyle: { ...s.buttonStyle, ...patch } })),
  setPostSubmit: (postSubmitAction) => set({ postSubmitAction }),
  setThankYouTitle: (thankYouTitle) => set({ thankYouTitle }),
  setThankYouMessage: (thankYouMessage) => set({ thankYouMessage }),
  setWhatsappNumber: (whatsappNumber) => set({ whatsappNumber }),
  setWhatsappMessage: (whatsappMessage) => set({ whatsappMessage }),
  setThankYouPageId: (thankYouPageId) => set({ thankYouPageId }),
  setBlocks: (blocks) =>
    set({ blocks: blocks.map((b, idx) => ({ ...b, position: idx })) }),
  patchBlock: (id, patch) =>
    set((s) => ({
      blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),
  addBlock: (type) =>
    set((s) => {
      const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const submitButtonIdx = s.blocks.findIndex((b) => b.type === "SUBMIT_BUTTON")
      const newBlock: CodFormBlock = {
        id,
        position: 0,
        type,
        content: {},
        visible: true,
        required: false,
      }
      // Insert before SUBMIT_BUTTON if it exists, otherwise append.
      const next =
        submitButtonIdx >= 0
          ? [
              ...s.blocks.slice(0, submitButtonIdx),
              newBlock,
              ...s.blocks.slice(submitButtonIdx),
            ]
          : [...s.blocks, newBlock]
      return { blocks: next.map((b, idx) => ({ ...b, position: idx })) }
    }),
  removeBlock: (id) =>
    set((s) => ({
      blocks: s.blocks
        .filter((b) => b.id !== id)
        .map((b, idx) => ({ ...b, position: idx })),
    })),
  setShippingRateIds: (ids) =>
    set({ shippingRateIds: [...ids].sort() }),
  toggleShippingRateId: (rateId) =>
    set((s) => {
      const has = s.shippingRateIds.includes(rateId)
      const next = has
        ? s.shippingRateIds.filter((x) => x !== rateId)
        : [...s.shippingRateIds, rateId]
      return { shippingRateIds: next.slice().sort() }
    }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
}))

"use client"

import { create } from "zustand"
import type { ThemeSectionGroup } from "@prisma/client"
import type {
  ThemeSectionRow,
  ThemeSectionBlockRow,
} from "@/actions/theme-sections"

export interface SectionDraft extends Omit<ThemeSectionRow, "blocks" | "content"> {
  /** Top-level content stored as a generic record so the store doesn't need to
   *  know each section type's content shape. The customizer's RightSidebar
   *  reads + writes through SchemaForm, which already accepts/produces this. */
  content: Record<string, unknown>
  blocks: BlockDraft[]
  /** True when the draft was created in this session and has not been persisted. */
  isNew: boolean
  /** True when the draft differs from what's persisted (or it's new). */
  dirty: boolean
}

export interface BlockDraft extends Omit<ThemeSectionBlockRow, "content"> {
  content: Record<string, unknown>
  isNew: boolean
  dirty: boolean
}

export type SidebarTarget =
  | { kind: "section"; sectionId: string }
  | { kind: "section-block"; sectionId: string; blockId: string }
  | null

interface Store {
  themeId: string | null
  header: SectionDraft[]
  footer: SectionDraft[]
  selected: SidebarTarget
  /** Group-level dirty flags. Set true on every mutation that affects a
   *  group's section list (add / remove / reorder / toggle / content edit
   *  / block CRUD). Reset to false by `markGroupSaved` after a successful
   *  autosave round-trip. The autosave hook reads these flags so deletions
   *  (which leave no per-draft dirty trace) still trigger a save. */
  headerDirty: boolean
  footerDirty: boolean

  /** Replace local state with what came from the server. Called on first
   *  mount and after every successful save (so persisted ids replace tmp- ids). */
  hydrate: (
    themeId: string,
    header: ThemeSectionRow[],
    footer: ThemeSectionRow[],
  ) => void

  /** Called by the autosave hook after `saveThemeSectionGroup` resolves
   *  successfully. Clears the group's dirty flag so the hook doesn't
   *  spin in a save loop. */
  markGroupSaved: (group: ThemeSectionGroup) => void

  select: (target: SidebarTarget) => void

  // Section-level mutations
  addSection: (
    group: ThemeSectionGroup,
    type: string,
    defaultContent: Record<string, unknown>,
    defaultBlocks?: Array<{ type: string; content: Record<string, unknown> }>,
  ) => string
  removeSection: (sectionId: string) => void
  reorderSections: (group: ThemeSectionGroup, orderedIds: string[]) => void
  updateSectionContent: (
    sectionId: string,
    content: Record<string, unknown>,
  ) => void
  toggleSectionEnabled: (sectionId: string) => void

  // Sub-block mutations
  addBlock: (
    sectionId: string,
    type: string,
    defaultContent: Record<string, unknown>,
  ) => string
  removeBlock: (blockId: string) => void
  reorderBlocks: (sectionId: string, orderedIds: string[]) => void
  updateBlockContent: (
    blockId: string,
    content: Record<string, unknown>,
  ) => void
  toggleBlockEnabled: (blockId: string) => void

  /** Returns the in-memory snapshot of a group, ready to send to
   *  saveThemeSectionGroup. */
  getGroupSnapshot: (group: ThemeSectionGroup) => SectionDraft[]
}

let counter = 0
const tmpId = (kind: "s" | "b") => `tmp-${kind}-${++counter}-${Date.now()}`

function rowToDraft(row: ThemeSectionRow): SectionDraft {
  return {
    id: row.id,
    themeId: row.themeId,
    group: row.group,
    type: row.type,
    position: row.position,
    enabled: row.enabled,
    content: (row.content ?? {}) as Record<string, unknown>,
    blocks: row.blocks.map<BlockDraft>((b) => ({
      id: b.id,
      sectionId: b.sectionId,
      type: b.type,
      position: b.position,
      enabled: b.enabled,
      content: (b.content ?? {}) as Record<string, unknown>,
      isNew: false,
      dirty: false,
    })),
    isNew: false,
    dirty: false,
  }
}

export const useThemeSectionsStore = create<Store>((set, get) => ({
  themeId: null,
  header: [],
  footer: [],
  selected: null,
  headerDirty: false,
  footerDirty: false,

  hydrate(themeId, header, footer) {
    set({
      themeId,
      header: header.map(rowToDraft),
      footer: footer.map(rowToDraft),
      // Reset selection on hydrate to avoid pointing at a stale id.
      selected: null,
      headerDirty: false,
      footerDirty: false,
    })
  },

  markGroupSaved(group) {
    set(group === "HEADER" ? { headerDirty: false } : { footerDirty: false })
  },

  select(target) {
    set({ selected: target })
  },

  addSection(group, type, defaultContent, defaultBlocks) {
    const themeId = get().themeId ?? ""
    const id = tmpId("s")
    const list = group === "HEADER" ? get().header : get().footer
    const newSection: SectionDraft = {
      id,
      themeId,
      group,
      type,
      position: list.length,
      enabled: true,
      content: defaultContent,
      blocks: (defaultBlocks ?? []).map<BlockDraft>((b, i) => ({
        id: tmpId("b"),
        sectionId: id,
        type: b.type,
        position: i,
        enabled: true,
        content: b.content,
        isNew: true,
        dirty: true,
      })),
      isNew: true,
      dirty: true,
    }
    set((s) =>
      group === "HEADER"
        ? { header: [...s.header, newSection], headerDirty: true }
        : { footer: [...s.footer, newSection], footerDirty: true },
    )
    return id
  },

  removeSection(sectionId) {
    set((s) => {
      const inHeader = s.header.some((x) => x.id === sectionId)
      const inFooter = s.footer.some((x) => x.id === sectionId)
      return {
        header: s.header.filter((x) => x.id !== sectionId),
        footer: s.footer.filter((x) => x.id !== sectionId),
        selected:
          s.selected?.kind === "section" && s.selected.sectionId === sectionId
            ? null
            : s.selected,
        headerDirty: inHeader ? true : s.headerDirty,
        footerDirty: inFooter ? true : s.footerDirty,
      }
    })
  },

  reorderSections(group, orderedIds) {
    set((s) => {
      const list = group === "HEADER" ? s.header : s.footer
      const map = new Map(list.map((x) => [x.id, x]))
      const reordered = orderedIds
        .map((id, idx) => {
          const item = map.get(id)
          if (!item) return null
          return { ...item, position: idx, dirty: true }
        })
        .filter((x): x is SectionDraft => x !== null)
      return group === "HEADER"
        ? { header: reordered, headerDirty: true }
        : { footer: reordered, footerDirty: true }
    })
  },

  updateSectionContent(sectionId, content) {
    set((s) => {
      const inHeader = s.header.some((x) => x.id === sectionId)
      const inFooter = s.footer.some((x) => x.id === sectionId)
      return {
        header: s.header.map((x) =>
          x.id === sectionId ? { ...x, content, dirty: true } : x,
        ),
        footer: s.footer.map((x) =>
          x.id === sectionId ? { ...x, content, dirty: true } : x,
        ),
        headerDirty: inHeader ? true : s.headerDirty,
        footerDirty: inFooter ? true : s.footerDirty,
      }
    })
  },

  toggleSectionEnabled(sectionId) {
    set((s) => {
      const inHeader = s.header.some((x) => x.id === sectionId)
      const inFooter = s.footer.some((x) => x.id === sectionId)
      return {
        header: s.header.map((x) =>
          x.id === sectionId ? { ...x, enabled: !x.enabled, dirty: true } : x,
        ),
        footer: s.footer.map((x) =>
          x.id === sectionId ? { ...x, enabled: !x.enabled, dirty: true } : x,
        ),
        headerDirty: inHeader ? true : s.headerDirty,
        footerDirty: inFooter ? true : s.footerDirty,
      }
    })
  },

  addBlock(sectionId, type, defaultContent) {
    const id = tmpId("b")
    set((s) => {
      const inHeader = s.header.some((sec) => sec.id === sectionId)
      const inFooter = s.footer.some((sec) => sec.id === sectionId)
      const patch = (list: SectionDraft[]) =>
        list.map((sec) => {
          if (sec.id !== sectionId) return sec
          return {
            ...sec,
            dirty: true,
            blocks: [
              ...sec.blocks,
              {
                id,
                sectionId,
                type,
                position: sec.blocks.length,
                enabled: true,
                content: defaultContent,
                isNew: true,
                dirty: true,
              },
            ],
          }
        })
      return {
        header: patch(s.header),
        footer: patch(s.footer),
        headerDirty: inHeader ? true : s.headerDirty,
        footerDirty: inFooter ? true : s.footerDirty,
      }
    })
    return id
  },

  removeBlock(blockId) {
    set((s) => {
      const inHeader = s.header.some((sec) =>
        sec.blocks.some((b) => b.id === blockId),
      )
      const inFooter = s.footer.some((sec) =>
        sec.blocks.some((b) => b.id === blockId),
      )
      const patch = (list: SectionDraft[]) =>
        list.map((sec) => ({
          ...sec,
          dirty: sec.blocks.some((b) => b.id === blockId) ? true : sec.dirty,
          blocks: sec.blocks.filter((b) => b.id !== blockId),
        }))
      return {
        header: patch(s.header),
        footer: patch(s.footer),
        selected:
          s.selected?.kind === "section-block" && s.selected.blockId === blockId
            ? null
            : s.selected,
        headerDirty: inHeader ? true : s.headerDirty,
        footerDirty: inFooter ? true : s.footerDirty,
      }
    })
  },

  reorderBlocks(sectionId, orderedIds) {
    set((s) => {
      const inHeader = s.header.some((sec) => sec.id === sectionId)
      const inFooter = s.footer.some((sec) => sec.id === sectionId)
      const patch = (list: SectionDraft[]) =>
        list.map((sec) => {
          if (sec.id !== sectionId) return sec
          const map = new Map(sec.blocks.map((b) => [b.id, b]))
          const reordered = orderedIds
            .map((id, idx) => {
              const b = map.get(id)
              if (!b) return null
              return { ...b, position: idx, dirty: true }
            })
            .filter((x): x is BlockDraft => x !== null)
          return { ...sec, blocks: reordered, dirty: true }
        })
      return {
        header: patch(s.header),
        footer: patch(s.footer),
        headerDirty: inHeader ? true : s.headerDirty,
        footerDirty: inFooter ? true : s.footerDirty,
      }
    })
  },

  updateBlockContent(blockId, content) {
    set((s) => {
      const inHeader = s.header.some((sec) =>
        sec.blocks.some((b) => b.id === blockId),
      )
      const inFooter = s.footer.some((sec) =>
        sec.blocks.some((b) => b.id === blockId),
      )
      const patch = (list: SectionDraft[]) =>
        list.map((sec) => {
          if (!sec.blocks.some((b) => b.id === blockId)) return sec
          return {
            ...sec,
            dirty: true,
            blocks: sec.blocks.map((b) =>
              b.id === blockId ? { ...b, content, dirty: true } : b,
            ),
          }
        })
      return {
        header: patch(s.header),
        footer: patch(s.footer),
        headerDirty: inHeader ? true : s.headerDirty,
        footerDirty: inFooter ? true : s.footerDirty,
      }
    })
  },

  toggleBlockEnabled(blockId) {
    set((s) => {
      const inHeader = s.header.some((sec) =>
        sec.blocks.some((b) => b.id === blockId),
      )
      const inFooter = s.footer.some((sec) =>
        sec.blocks.some((b) => b.id === blockId),
      )
      const patch = (list: SectionDraft[]) =>
        list.map((sec) => {
          if (!sec.blocks.some((b) => b.id === blockId)) return sec
          return {
            ...sec,
            dirty: true,
            blocks: sec.blocks.map((b) =>
              b.id === blockId ? { ...b, enabled: !b.enabled, dirty: true } : b,
            ),
          }
        })
      return {
        header: patch(s.header),
        footer: patch(s.footer),
        headerDirty: inHeader ? true : s.headerDirty,
        footerDirty: inFooter ? true : s.footerDirty,
      }
    })
  },

  getGroupSnapshot(group) {
    return group === "HEADER" ? get().header : get().footer
  },
}))

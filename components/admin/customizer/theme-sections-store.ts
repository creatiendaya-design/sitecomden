"use client"

import { create } from "zustand"
import type { ThemeSectionGroup } from "@prisma/client"
import type {
  ThemeSectionRow,
  ThemeSectionBlockRow,
} from "@/actions/theme-sections"

export interface SectionDraft
  extends Omit<ThemeSectionRow, "blocks" | "content" | "version"> {
  /** Top-level content stored as a generic record so the store doesn't need to
   *  know each section type's content shape. The customizer's RightSidebar
   *  reads + writes through SchemaForm, which already accepts/produces this. */
  content: Record<string, unknown>
  blocks: BlockDraft[]
  /** True when the draft was created in this session and has not been persisted. */
  isNew: boolean
  /** True when the draft differs from what's persisted (or it's new). */
  dirty: boolean
  /** Plan 18 — optimistic-locking version. Undefined for `isNew` drafts (they
   *  don't have a server version until the first save creates them). */
  version?: number
}

export interface BlockDraft extends Omit<ThemeSectionBlockRow, "content" | "version"> {
  content: Record<string, unknown>
  isNew: boolean
  dirty: boolean
  /** Plan 18 — see SectionDraft.version. */
  version?: number
}

export type SidebarTarget =
  | { kind: "section"; sectionId: string }
  | { kind: "section-block"; sectionId: string; blockId: string }
  | null

/** Single source of truth for the list of editable groups in the store.
 *  Adding a new ThemeSectionGroup value should only require appending it
 *  here (plus the matching slot in the initial state below). */
const GROUPS: readonly ThemeSectionGroup[] = [
  "HEADER",
  "FOOTER",
  "PRODUCT",
  "COLLECTION",
]

interface Store {
  themeId: string | null
  header: SectionDraft[]
  footer: SectionDraft[]
  product: SectionDraft[]
  collection: SectionDraft[]
  selected: SidebarTarget
  /** Group-level dirty flags. Set true on every mutation that affects a
   *  group's section list (add / remove / reorder / toggle / content edit
   *  / block CRUD). Reset to false by `markGroupSaved` after a successful
   *  autosave round-trip. The autosave hook reads these flags so deletions
   *  (which leave no per-draft dirty trace) still trigger a save. */
  headerDirty: boolean
  footerDirty: boolean
  productDirty: boolean
  collectionDirty: boolean

  /** Replace local state with what came from the server. Called on first
   *  mount and after every successful save (so persisted ids replace tmp- ids). */
  hydrate: (
    themeId: string,
    rows: {
      header: ThemeSectionRow[]
      footer: ThemeSectionRow[]
      product: ThemeSectionRow[]
      collection: ThemeSectionRow[]
    },
  ) => void

  /** Called by the autosave hook after `saveThemeSectionGroup` resolves
   *  successfully. Clears the group's dirty flag so the hook doesn't
   *  spin in a save loop. */
  markGroupSaved: (group: ThemeSectionGroup) => void

  /** Replace a single group's drafts with the persisted rows returned by
   *  `saveThemeSectionGroup`. Maps tmp-ids → real ids by position so the
   *  current `selected` target survives the swap when the persisted row
   *  occupies the same slot. Drops the group's dirty flag.
   *
   *  WARNING: blows away any edits the admin made WHILE the save was in
   *  flight. Used only by initial hydration paths; the autosave loop
   *  uses `mergeSavedIds` instead (see below). */
  replaceGroup: (group: ThemeSectionGroup, rows: ThemeSectionRow[]) => void

  /** Non-destructive post-save reconciliation. Walks the snapshot we
   *  sent to the server alongside the persisted rows that came back,
   *  and updates ONLY the ids of sections/blocks that were created with
   *  tmp-ids — every other field (content, position, enabled) stays as
   *  the admin currently sees it in the store.
   *
   *  This is the fix for the bug where typing through the autosave
   *  window (~250ms debounce + 300-800ms server roundtrip) would see
   *  the latest edits reverted when the save resolved. The server
   *  response is the canonical SAVED state but the in-memory store is
   *  the canonical CURRENT state — we merge ids only and trust the
   *  store for everything else. */
  mergeSavedIds: (
    group: ThemeSectionGroup,
    sent: SectionDraft[],
    saved: ThemeSectionRow[],
  ) => void

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

type SlotKey = "header" | "footer" | "product" | "collection"
type DirtyKey =
  | "headerDirty"
  | "footerDirty"
  | "productDirty"
  | "collectionDirty"

function slotKey(group: ThemeSectionGroup): SlotKey {
  if (group === "HEADER") return "header"
  if (group === "FOOTER") return "footer"
  if (group === "COLLECTION") return "collection"
  return "product"
}

function dirtyKey(group: ThemeSectionGroup): DirtyKey {
  if (group === "HEADER") return "headerDirty"
  if (group === "FOOTER") return "footerDirty"
  if (group === "COLLECTION") return "collectionDirty"
  return "productDirty"
}

/**
 * Maps the current `selected` target (which may reference a tmp-id from
 * the about-to-be-replaced drafts) to the persisted equivalent by
 * positional alignment. Returns null when the previous selection is no
 * longer present in the fresh snapshot — e.g. user deleted the selected
 * section, or it doesn't belong to the group being replaced.
 */
function remapSelectedAcrossReplace(
  selected: SidebarTarget,
  previous: SectionDraft[],
  fresh: SectionDraft[],
  _group: ThemeSectionGroup,
): SidebarTarget {
  if (!selected) return null

  const prevIdx = previous.findIndex((sec) => sec.id === selected.sectionId)
  if (prevIdx === -1) {
    // Selection isn't in the replaced group — it lives in the other
    // group (which is untouched), so leave it alone.
    return selected
  }

  const replacement = fresh[prevIdx]
  if (!replacement) return null

  if (selected.kind === "section") {
    return { kind: "section", sectionId: replacement.id }
  }

  const prevBlockIdx = previous[prevIdx].blocks.findIndex(
    (b) => b.id === selected.blockId,
  )
  if (prevBlockIdx === -1) return null

  const newBlock = replacement.blocks[prevBlockIdx]
  if (!newBlock) return null

  return {
    kind: "section-block",
    sectionId: replacement.id,
    blockId: newBlock.id,
  }
}

function rowToDraft(row: ThemeSectionRow): SectionDraft {
  return {
    id: row.id,
    themeId: row.themeId,
    group: row.group,
    type: row.type,
    position: row.position,
    enabled: row.enabled,
    content: (row.content ?? {}) as Record<string, unknown>,
    version: row.version,
    blocks: row.blocks.map<BlockDraft>((b) => ({
      id: b.id,
      sectionId: b.sectionId,
      type: b.type,
      position: b.position,
      enabled: b.enabled,
      content: (b.content ?? {}) as Record<string, unknown>,
      version: b.version,
      isNew: false,
      dirty: false,
    })),
    isNew: false,
    dirty: false,
  }
}

/** Find which group owns a given section id, scanning all known slots. */
function findGroupBySection(
  state: {
    header: SectionDraft[]
    footer: SectionDraft[]
    product: SectionDraft[]
    collection: SectionDraft[]
  },
  sectionId: string,
): ThemeSectionGroup | null {
  if (state.header.some((x) => x.id === sectionId)) return "HEADER"
  if (state.footer.some((x) => x.id === sectionId)) return "FOOTER"
  if (state.product.some((x) => x.id === sectionId)) return "PRODUCT"
  if (state.collection.some((x) => x.id === sectionId)) return "COLLECTION"
  return null
}

function findGroupByBlock(
  state: {
    header: SectionDraft[]
    footer: SectionDraft[]
    product: SectionDraft[]
    collection: SectionDraft[]
  },
  blockId: string,
): ThemeSectionGroup | null {
  for (const g of GROUPS) {
    const slot = state[slotKey(g)]
    if (slot.some((sec) => sec.blocks.some((b) => b.id === blockId))) {
      return g
    }
  }
  return null
}

export const useThemeSectionsStore = create<Store>((set, get) => ({
  themeId: null,
  header: [],
  footer: [],
  product: [],
  collection: [],
  selected: null,
  headerDirty: false,
  footerDirty: false,
  productDirty: false,
  collectionDirty: false,

  hydrate(themeId, rows) {
    set({
      themeId,
      header: rows.header.map(rowToDraft),
      footer: rows.footer.map(rowToDraft),
      product: rows.product.map(rowToDraft),
      collection: rows.collection.map(rowToDraft),
      // Reset selection on hydrate to avoid pointing at a stale id.
      selected: null,
      headerDirty: false,
      footerDirty: false,
      productDirty: false,
      collectionDirty: false,
    })
  },

  markGroupSaved(group) {
    set({ [dirtyKey(group)]: false } as Partial<Store>)
  },

  replaceGroup(group, rows) {
    set((s) => {
      const fresh = rows.map(rowToDraft)
      const previous = s[slotKey(group)]

      // Preserve the user's selected sidebar target across the swap by
      // mapping its id through positional alignment: when the previously
      // selected section was at index N, its persisted replacement also
      // sits at index N (the server saves in the order we send).
      const nextSelected = remapSelectedAcrossReplace(
        s.selected,
        previous,
        fresh,
        group,
      )

      return {
        [slotKey(group)]: fresh,
        [dirtyKey(group)]: false,
        selected: nextSelected,
      } as Partial<Store>
    })
  },

  mergeSavedIds(group, sent, saved) {
    set((s) => {
      // Build sent.id → saved.id lookups (sections + nested blocks). We
      // align by position rather than id because sent[i].id is a tmp-id
      // and saved[i].id is the just-persisted real id — there's no way
      // to correlate the two except by their position in the array we
      // sent (the server preserves order).
      const sectionIdMap = new Map<string, string>()
      const blockIdMap = new Map<string, string>()
      const sectionVersionMap = new Map<string, number>()
      const blockVersionMap = new Map<string, number>()
      for (let i = 0; i < sent.length; i++) {
        const sentSec = sent[i]
        const savedSec = saved[i]
        if (!savedSec) continue
        if (sentSec.id !== savedSec.id) {
          sectionIdMap.set(sentSec.id, savedSec.id)
        }
        sectionVersionMap.set(sentSec.id, savedSec.version)
        for (let j = 0; j < sentSec.blocks.length; j++) {
          const sentBlock = sentSec.blocks[j]
          const savedBlock = savedSec.blocks[j]
          if (!savedBlock) continue
          if (sentBlock.id !== savedBlock.id) {
            blockIdMap.set(sentBlock.id, savedBlock.id)
          }
          blockVersionMap.set(sentBlock.id, savedBlock.version)
        }
      }

      const patchList = (list: SectionDraft[]): SectionDraft[] =>
        list.map((sec) => {
          const newSecId = sectionIdMap.get(sec.id) ?? sec.id
          const isNew = sectionIdMap.has(sec.id) ? false : sec.isNew
          const newVersion = sectionVersionMap.get(sec.id) ?? sec.version
          const blocks = sec.blocks.map((b) => {
            const realId = blockIdMap.get(b.id)
            const newBlockVersion = blockVersionMap.get(b.id) ?? b.version
            if (!realId && newSecId === sec.id && newBlockVersion === b.version)
              return b
            return {
              ...b,
              id: realId ?? b.id,
              sectionId: newSecId,
              isNew: realId ? false : b.isNew,
              version: newBlockVersion,
            }
          })
          return {
            ...sec,
            id: newSecId,
            isNew,
            blocks,
            version: newVersion,
          }
        })

      const remapSelected = (sel: SidebarTarget): SidebarTarget => {
        if (!sel) return null
        const newSectionId =
          sectionIdMap.get(sel.sectionId) ?? sel.sectionId
        if (sel.kind === "section") {
          return { kind: "section", sectionId: newSectionId }
        }
        const newBlockId = blockIdMap.get(sel.blockId) ?? sel.blockId
        return {
          kind: "section-block",
          sectionId: newSectionId,
          blockId: newBlockId,
        }
      }

      return {
        [slotKey(group)]: patchList(s[slotKey(group)]),
        [dirtyKey(group)]: false,
        selected: remapSelected(s.selected),
      } as Partial<Store>
    })
  },

  select(target) {
    set({ selected: target })
  },

  addSection(group, type, defaultContent, defaultBlocks) {
    const themeId = get().themeId ?? ""
    const id = tmpId("s")
    const list = get()[slotKey(group)]
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
    set((s) => ({
      [slotKey(group)]: [...s[slotKey(group)], newSection],
      [dirtyKey(group)]: true,
    } as Partial<Store>))
    return id
  },

  removeSection(sectionId) {
    set((s) => {
      const owner = findGroupBySection(s, sectionId)
      if (!owner) return {}
      return {
        [slotKey(owner)]: s[slotKey(owner)].filter((x) => x.id !== sectionId),
        [dirtyKey(owner)]: true,
        selected:
          s.selected?.kind === "section" && s.selected.sectionId === sectionId
            ? null
            : s.selected,
      } as Partial<Store>
    })
  },

  reorderSections(group, orderedIds) {
    set((s) => {
      const list = s[slotKey(group)]
      const map = new Map(list.map((x) => [x.id, x]))
      const reordered = orderedIds
        .map((id, idx) => {
          const item = map.get(id)
          if (!item) return null
          return { ...item, position: idx, dirty: true }
        })
        .filter((x): x is SectionDraft => x !== null)
      return {
        [slotKey(group)]: reordered,
        [dirtyKey(group)]: true,
      } as Partial<Store>
    })
  },

  updateSectionContent(sectionId, content) {
    set((s) => {
      const owner = findGroupBySection(s, sectionId)
      if (!owner) return {}
      return {
        [slotKey(owner)]: s[slotKey(owner)].map((x) =>
          x.id === sectionId ? { ...x, content, dirty: true } : x,
        ),
        [dirtyKey(owner)]: true,
      } as Partial<Store>
    })
  },

  toggleSectionEnabled(sectionId) {
    set((s) => {
      const owner = findGroupBySection(s, sectionId)
      if (!owner) return {}
      return {
        [slotKey(owner)]: s[slotKey(owner)].map((x) =>
          x.id === sectionId ? { ...x, enabled: !x.enabled, dirty: true } : x,
        ),
        [dirtyKey(owner)]: true,
      } as Partial<Store>
    })
  },

  addBlock(sectionId, type, defaultContent) {
    const id = tmpId("b")
    set((s) => {
      const owner = findGroupBySection(s, sectionId)
      if (!owner) return {}
      const patched = s[slotKey(owner)].map((sec) => {
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
        [slotKey(owner)]: patched,
        [dirtyKey(owner)]: true,
      } as Partial<Store>
    })
    return id
  },

  removeBlock(blockId) {
    set((s) => {
      const owner = findGroupByBlock(s, blockId)
      if (!owner) return {}
      const patched = s[slotKey(owner)].map((sec) => ({
        ...sec,
        dirty: sec.blocks.some((b) => b.id === blockId) ? true : sec.dirty,
        blocks: sec.blocks.filter((b) => b.id !== blockId),
      }))
      return {
        [slotKey(owner)]: patched,
        [dirtyKey(owner)]: true,
        selected:
          s.selected?.kind === "section-block" && s.selected.blockId === blockId
            ? null
            : s.selected,
      } as Partial<Store>
    })
  },

  reorderBlocks(sectionId, orderedIds) {
    set((s) => {
      const owner = findGroupBySection(s, sectionId)
      if (!owner) return {}
      const patched = s[slotKey(owner)].map((sec) => {
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
        [slotKey(owner)]: patched,
        [dirtyKey(owner)]: true,
      } as Partial<Store>
    })
  },

  updateBlockContent(blockId, content) {
    set((s) => {
      const owner = findGroupByBlock(s, blockId)
      if (!owner) return {}
      const patched = s[slotKey(owner)].map((sec) => {
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
        [slotKey(owner)]: patched,
        [dirtyKey(owner)]: true,
      } as Partial<Store>
    })
  },

  toggleBlockEnabled(blockId) {
    set((s) => {
      const owner = findGroupByBlock(s, blockId)
      if (!owner) return {}
      const patched = s[slotKey(owner)].map((sec) => {
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
        [slotKey(owner)]: patched,
        [dirtyKey(owner)]: true,
      } as Partial<Store>
    })
  },

  getGroupSnapshot(group) {
    return get()[slotKey(group)]
  },
}))

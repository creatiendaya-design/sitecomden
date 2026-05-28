"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"
import { getCurrentUserIdOrNull } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import type { ThemeSectionGroup } from "@prisma/client"
import {
  getThemeSectionDefinition,
  getSectionBlockDefinition,
} from "@/lib/theme-sections/registry"
import {
  BatchRaceError,
  batchConflict,
  batchErrored,
  batchOk,
  batchUnauthorized,
  isBatchRaceError,
  precheckBatchConflicts,
  type BatchConflictEntry,
  type BatchSaveResult,
} from "@/lib/concurrency/batch"

/**
 * Plan 16 perf: tag-based invalidation. Section CRUD/save no longer calls
 * `revalidatePath("/")` because that nukes the layout-level caches
 * (site-settings, tracking-pixels, theme-meta) which don't change when
 * sections are edited — re-running them on every autosave is the main
 * driver of slow iframe refresh during the customizer.
 *
 * We also intentionally skip `revalidatePath` on the admin customize page:
 *   1. That page is `dynamic = "force-dynamic"`, so its cache isn't kept
 *      anyway — revalidation is a no-op for non-cached pages.
 *   2. In Next.js 15, calling `revalidatePath` from a Server Action while
 *      the user is on that route piggy-backs a client-side soft refresh.
 *      During the customizer's autosave that re-render races with our
 *      `replaceGroup` write — the right-sidebar select's controlled value
 *      momentarily reads stale store data on the in-flight render and
 *      collapses back to "Heredar del tema". The local Zustand store is
 *      authoritative during the editing session, so we don't need the
 *      server-driven refresh here.
 */
/**
 * Plan 17 — Neon serverless interactive transactions need a generous timeout.
 * The default 5s fires during cold starts + multi-row PRODUCT_MAIN saves
 * (1 section + 7+ sub-blocks → 8+ round-trips inside the transaction).
 * `maxWait` is how long Prisma can sit in the pool queue before opening the
 * transaction; bumped proportionally so it doesn't fail before timeout kicks in.
 *
 * Only applicable to the interactive-callback form (`$transaction(async tx =>
 * {...})`). The sequential-array form (`$transaction([op, op, ...])`) doesn't
 * accept these options — only `isolationLevel`.
 */
const NEON_TX_OPTS = { timeout: 30_000, maxWait: 10_000 }

function invalidateSectionGroup(themeId: string, group: ThemeSectionGroup) {
  updateTag(`theme-sections-${themeId}-${group}`)
  // Plan 17: PRODUCT-group sections drive every `/productos/[slug]` page,
  // which caches under the `products` tag (see app/(shop)/productos/[slug]/page.tsx).
  // Without this invalidation a customizer save would render stale until the
  // 60s revalidate window expires.
  if (group === "PRODUCT") {
    updateTag("products")
  }
}

// ---------- Row types ----------

export interface ThemeSectionRow {
  id: string
  themeId: string
  group: ThemeSectionGroup
  type: string
  position: number
  enabled: boolean
  content: unknown
  blocks: ThemeSectionBlockRow[]
  /** Plan 18 — optimistic-locking version of this section row. */
  version: number
}

export interface ThemeSectionBlockRow {
  id: string
  sectionId: string
  type: string
  position: number
  enabled: boolean
  content: unknown
  /** Plan 18 — optimistic-locking version of this block row. */
  version: number
}

// ---------- Add section ----------

const addThemeSectionSchema = z.object({
  themeId: z.string().min(1),
  group: z.enum(["HEADER", "FOOTER", "PRODUCT"]),
  type: z.string().min(1),
})

export async function addThemeSection(
  themeId: string,
  group: ThemeSectionGroup,
  type: string,
): Promise<ThemeSectionRow> {
  await protectRoute("themes:update")
  const input = addThemeSectionSchema.parse({ themeId, group, type })

  const def = getThemeSectionDefinition(input.type)
  if (!def) throw new Error(`Section type "${input.type}" not registered`)
  if (!def.groups.includes(input.group)) {
    throw new Error(`Section type "${input.type}" is not allowed in ${input.group}`)
  }

  if (def.maxPerGroup !== undefined) {
    const count = await prisma.themeSection.count({
      where: { themeId: input.themeId, group: input.group, type: input.type },
    })
    if (count >= def.maxPerGroup) {
      throw new Error(
        `Solo se permiten ${def.maxPerGroup} secciones de tipo ${def.label} en ${input.group}.`,
      )
    }
  }

  const last = await prisma.themeSection.findFirst({
    where: { themeId: input.themeId, group: input.group },
    orderBy: { position: "desc" },
    select: { position: true },
  })
  const position = (last?.position ?? -1) + 1

  const created = await prisma.themeSection.create({
    data: {
      themeId: input.themeId,
      group: input.group,
      type: input.type,
      position,
      content: def.defaultContent as object,
      enabled: true,
      blocks: def.defaultBlocks
        ? {
            create: def.defaultBlocks.map((b, i) => ({
              type: b.type,
              position: i,
              content: b.content as object,
              enabled: true,
            })),
          }
        : undefined,
    },
    include: { blocks: { orderBy: { position: "asc" } } },
  })

  invalidateSectionGroup(input.themeId, input.group)

  return {
    id: created.id,
    themeId: created.themeId,
    group: created.group,
    type: created.type,
    position: created.position,
    enabled: created.enabled,
    content: created.content,
    version: created.version,
    blocks: created.blocks.map((b) => ({
      id: b.id,
      sectionId: b.sectionId,
      type: b.type,
      position: b.position,
      enabled: b.enabled,
      content: b.content,
      version: b.version,
    })),
  }
}

// ---------- Remove section ----------

export async function removeThemeSection(sectionId: string): Promise<void> {
  await protectRoute("themes:update")
  const section = await prisma.themeSection.findUnique({
    where: { id: sectionId },
    select: { themeId: true, group: true },
  })
  if (!section) return

  await prisma.themeSection.delete({ where: { id: sectionId } })

  invalidateSectionGroup(section.themeId, section.group)
}

// ---------- Reorder sections ----------

const reorderSectionsSchema = z.object({
  themeId: z.string().min(1),
  group: z.enum(["HEADER", "FOOTER", "PRODUCT"]),
  orderedIds: z.array(z.string().min(1)),
})

export async function reorderThemeSections(
  themeId: string,
  group: ThemeSectionGroup,
  orderedIds: string[],
): Promise<void> {
  await protectRoute("themes:update")
  const input = reorderSectionsSchema.parse({ themeId, group, orderedIds })

  await prisma.$transaction(
    input.orderedIds.map((id, idx) =>
      prisma.themeSection.update({
        where: { id },
        data: { position: idx },
      }),
    ),
  )

  invalidateSectionGroup(input.themeId, input.group)
}

// ---------- Update section content ----------

const updateContentSchema = z.object({
  sectionId: z.string().min(1),
  content: z.record(z.string(), z.unknown()),
})

export async function updateThemeSectionContent(
  sectionId: string,
  content: Record<string, unknown>,
): Promise<void> {
  await protectRoute("themes:update")
  const input = updateContentSchema.parse({ sectionId, content })

  const section = await prisma.themeSection.update({
    where: { id: input.sectionId },
    data: { content: input.content as object },
    select: { themeId: true, group: true },
  })

  invalidateSectionGroup(section.themeId, section.group)
}

// ---------- Toggle enabled ----------

export async function toggleThemeSectionEnabled(
  sectionId: string,
  enabled: boolean,
): Promise<void> {
  await protectRoute("themes:update")
  const section = await prisma.themeSection.update({
    where: { id: sectionId },
    data: { enabled },
    select: { themeId: true, group: true },
  })
  invalidateSectionGroup(section.themeId, section.group)
}

// ---------- Sub-block CRUD ----------

const addBlockSchema = z.object({
  sectionId: z.string().min(1),
  type: z.string().min(1),
})

export async function addThemeSectionBlock(
  sectionId: string,
  type: string,
): Promise<ThemeSectionBlockRow> {
  await protectRoute("themes:update")
  const input = addBlockSchema.parse({ sectionId, type })

  const parent = await prisma.themeSection.findUniqueOrThrow({
    where: { id: input.sectionId },
    select: {
      type: true,
      themeId: true,
      group: true,
      blocks: { select: { type: true } },
    },
  })

  const def = getSectionBlockDefinition(parent.type, input.type)
  if (!def) throw new Error(`Block type "${input.type}" not allowed in ${parent.type}`)

  if (def.block.maxPerSection !== undefined) {
    const count = parent.blocks.filter((b) => b.type === input.type).length
    if (count >= def.block.maxPerSection) {
      throw new Error(
        `Solo se permiten ${def.block.maxPerSection} bloques de tipo ${def.block.label} en esta sección.`,
      )
    }
  }

  const last = await prisma.themeSectionBlock.findFirst({
    where: { sectionId: input.sectionId },
    orderBy: { position: "desc" },
    select: { position: true },
  })
  const position = (last?.position ?? -1) + 1

  const created = await prisma.themeSectionBlock.create({
    data: {
      sectionId: input.sectionId,
      type: input.type,
      position,
      content: def.block.defaultContent as object,
      enabled: true,
    },
  })

  invalidateSectionGroup(parent.themeId, parent.group)

  return {
    id: created.id,
    sectionId: created.sectionId,
    type: created.type,
    position: created.position,
    enabled: created.enabled,
    content: created.content,
    version: created.version,
  }
}

export async function removeThemeSectionBlock(blockId: string): Promise<void> {
  await protectRoute("themes:update")
  const block = await prisma.themeSectionBlock.findUnique({
    where: { id: blockId },
    select: { section: { select: { themeId: true, group: true } } },
  })
  if (!block) return
  await prisma.themeSectionBlock.delete({ where: { id: blockId } })
  invalidateSectionGroup(block.section.themeId, block.section.group)
}

const reorderBlocksSchema = z.object({
  sectionId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)),
})

export async function reorderThemeSectionBlocks(
  sectionId: string,
  orderedIds: string[],
): Promise<void> {
  await protectRoute("themes:update")
  const input = reorderBlocksSchema.parse({ sectionId, orderedIds })

  await prisma.$transaction(
    input.orderedIds.map((id, idx) =>
      prisma.themeSectionBlock.update({
        where: { id },
        data: { position: idx },
      }),
    ),
  )

  const section = await prisma.themeSection.findUnique({
    where: { id: input.sectionId },
    select: { themeId: true, group: true },
  })
  if (section) {
    invalidateSectionGroup(section.themeId, section.group)
  }
}

const updateBlockContentSchema = z.object({
  blockId: z.string().min(1),
  content: z.record(z.string(), z.unknown()),
})

export async function updateThemeSectionBlockContent(
  blockId: string,
  content: Record<string, unknown>,
): Promise<void> {
  await protectRoute("themes:update")
  const input = updateBlockContentSchema.parse({ blockId, content })

  const block = await prisma.themeSectionBlock.update({
    where: { id: input.blockId },
    data: { content: input.content as object },
    select: { section: { select: { themeId: true, group: true } } },
  })
  invalidateSectionGroup(block.section.themeId, block.section.group)
}

// ---------- Batch save (for autosave) ----------

const batchSectionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: z.number().int().nonnegative(),
  content: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
  blocks: z.array(
    z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      position: z.number().int().nonnegative(),
      content: z.record(z.string(), z.unknown()),
      enabled: z.boolean(),
    }),
  ),
})

const saveGroupSchema = z.object({
  themeId: z.string().min(1),
  group: z.enum(["HEADER", "FOOTER", "PRODUCT"]),
  sections: z.array(batchSectionSchema),
})

// Plan 18 — versioned variant of the batch schema. Each existing row
// carries its own `version`; new rows ("tmp-…" ids) omit it.
const batchSectionBlockSchemaVersioned = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: z.number().int().nonnegative(),
  content: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
  version: z.number().int().nonnegative().optional(),
})

const batchSectionSchemaVersioned = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: z.number().int().nonnegative(),
  content: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
  version: z.number().int().nonnegative().optional(),
  blocks: z.array(batchSectionBlockSchemaVersioned),
})

const saveGroupSchemaVersioned = z.object({
  themeId: z.string().min(1),
  group: z.enum(["HEADER", "FOOTER", "PRODUCT"]),
  sections: z.array(batchSectionSchemaVersioned),
})

/**
 * Batch save consumed by the customizer's autosave. Mirrors the shape of
 * savePageBlocks(). Performs a diff: deletes sections that disappeared,
 * upserts (by id) the ones that remained or are new (id starts with "tmp-").
 *
 * Returns the full persisted state of the group AS PART of the same write
 * transaction so the customizer can replace its local Zustand drafts
 * without a follow-up `router.refresh()` round-trip. This halves the
 * post-save latency (no second DB read) and lets the client preserve the
 * user's selected sidebar target across saves.
 */
export async function saveThemeSectionGroup(
  themeId: string,
  group: ThemeSectionGroup,
  sections: z.infer<typeof batchSectionSchema>[],
): Promise<{ success: true; sections: ThemeSectionRow[] }> {
  await protectRoute("themes:update")
  const input = saveGroupSchema.parse({ themeId, group, sections })

  const persisted = await prisma.$transaction(async (tx) => {
    const existing = await tx.themeSection.findMany({
      where: { themeId: input.themeId, group: input.group },
      select: { id: true, blocks: { select: { id: true } } },
    })
    const existingSectionIds = new Set(existing.map((s) => s.id))
    const incomingSectionIds = new Set(input.sections.map((s) => s.id))

    const sectionsToDelete = [...existingSectionIds].filter(
      (id) => !incomingSectionIds.has(id),
    )
    if (sectionsToDelete.length > 0) {
      await tx.themeSection.deleteMany({ where: { id: { in: sectionsToDelete } } })
    }

    for (const section of input.sections) {
      const isNew = section.id.startsWith("tmp-") || !existingSectionIds.has(section.id)

      if (isNew) {
        const created = await tx.themeSection.create({
          data: {
            themeId: input.themeId,
            group: input.group,
            type: section.type,
            position: section.position,
            content: section.content as object,
            enabled: section.enabled,
          },
        })
        for (const block of section.blocks) {
          await tx.themeSectionBlock.create({
            data: {
              sectionId: created.id,
              type: block.type,
              position: block.position,
              content: block.content as object,
              enabled: block.enabled,
            },
          })
        }
      } else {
        await tx.themeSection.update({
          where: { id: section.id },
          data: {
            type: section.type,
            position: section.position,
            content: section.content as object,
            enabled: section.enabled,
          },
        })

        const existingBlockIds = new Set(
          existing.find((s) => s.id === section.id)?.blocks.map((b) => b.id) ?? [],
        )
        const incomingBlockIds = new Set(section.blocks.map((b) => b.id))
        const blocksToDelete = [...existingBlockIds].filter((id) => !incomingBlockIds.has(id))
        if (blocksToDelete.length > 0) {
          await tx.themeSectionBlock.deleteMany({ where: { id: { in: blocksToDelete } } })
        }
        for (const block of section.blocks) {
          const blockIsNew =
            block.id.startsWith("tmp-") || !existingBlockIds.has(block.id)
          if (blockIsNew) {
            await tx.themeSectionBlock.create({
              data: {
                sectionId: section.id,
                type: block.type,
                position: block.position,
                content: block.content as object,
                enabled: block.enabled,
              },
            })
          } else {
            await tx.themeSectionBlock.update({
              where: { id: block.id },
              data: {
                type: block.type,
                position: block.position,
                content: block.content as object,
                enabled: block.enabled,
              },
            })
          }
        }
      }
    }

    // Return the freshly-persisted snapshot in the SAME transaction so
    // the client doesn't need a second round-trip to learn the new ids.
    return tx.themeSection.findMany({
      where: { themeId: input.themeId, group: input.group },
      orderBy: { position: "asc" },
      include: { blocks: { orderBy: { position: "asc" } } },
    })
  }, NEON_TX_OPTS)

  invalidateSectionGroup(input.themeId, input.group)

  return {
    success: true,
    sections: persisted.map((r) => ({
      id: r.id,
      themeId: r.themeId,
      group: r.group,
      type: r.type,
      position: r.position,
      enabled: r.enabled,
      content: r.content,
      version: r.version,
      blocks: r.blocks.map((b) => ({
        id: b.id,
        sectionId: b.sectionId,
        type: b.type,
        position: b.position,
        enabled: b.enabled,
        content: b.content,
        version: b.version,
      })),
    })),
  }
}

// ---------- Update section catalog (Phase F) ----------

const updateCatalogSchema = z.object({
  themeId: z.string().min(1),
  catalog: z.object({
    header: z.array(z.string()).optional(),
    footer: z.array(z.string()).optional(),
  }),
})

/**
 * Phase F — per-theme catalog management. Updates `Theme.sectionCatalog`
 * which the customizer's AddSectionPanel intersects with the global
 * registry to decide which section types are offered for each group.
 *
 * Empty `{}` (or missing arm) is the permissive default — all registry
 * types in that group are available. A non-empty array is an explicit
 * allowlist.
 *
 * No `updateTag` here: `sectionCatalog` is read only at the customizer
 * page-level data fetch (admin-only). The storefront does not consume
 * it. Revalidating the customize path is enough.
 */
export async function updateThemeSectionCatalog(
  themeId: string,
  catalog: { header?: string[]; footer?: string[] },
): Promise<void> {
  await protectRoute("themes:update")
  const input = updateCatalogSchema.parse({ themeId, catalog })
  await prisma.theme.update({
    where: { id: input.themeId },
    data: { sectionCatalog: input.catalog as object },
  })
  revalidatePath(`/admin/personalizar/temas/${input.themeId}/customize`)
}

// ---------- List (read for customizer) ----------

export async function listThemeSections(
  themeId: string,
  group: ThemeSectionGroup,
): Promise<ThemeSectionRow[]> {
  await protectRoute("themes:update")
  const rows = await prisma.themeSection.findMany({
    where: { themeId, group },
    orderBy: { position: "asc" },
    include: { blocks: { orderBy: { position: "asc" } } },
  })
  return rows.map((r) => ({
    id: r.id,
    themeId: r.themeId,
    group: r.group,
    type: r.type,
    position: r.position,
    enabled: r.enabled,
    content: r.content,
    version: r.version,
    blocks: r.blocks.map((b) => ({
      id: b.id,
      sectionId: b.sectionId,
      type: b.type,
      position: b.position,
      enabled: b.enabled,
      content: b.content,
      version: b.version,
    })),
  }))
}

// ---------- Versioned batch save (Plan 18) ----------

/**
 * Plan 18 — version-aware variant of `saveThemeSectionGroup`.
 *
 * For every existing section AND existing block, the client sends its
 * `version` (as last fetched). The server pre-checks all versions in a
 * single read, then writes inside a transaction with conditional updates.
 *
 * All-or-nothing: if ANY existing row's version disagrees, the whole batch
 * is rejected and `conflicts[]` lists every diverged row. The UI surfaces
 * a `BatchConflictDialog` so the user picks *Recargar* or *Forzar
 * guardado* once for the whole batch.
 *
 * On the success path, the function still returns the freshly-persisted
 * snapshot (with new `version` values) so the customizer's Zustand store
 * can adopt them without a second round-trip.
 */
export async function saveThemeSectionGroupVersioned(
  themeId: string,
  group: ThemeSectionGroup,
  sections: z.infer<typeof batchSectionSchemaVersioned>[],
): Promise<BatchSaveResult<{ sections: ThemeSectionRow[] }, ThemeSectionRow>> {
  const userId = await getCurrentUserIdOrNull()
  if (!userId) return batchUnauthorized()
  const allowed = await hasPermission(userId, "themes:update")
  if (!allowed) return batchUnauthorized()

  const input = saveGroupSchemaVersioned.parse({ themeId, group, sections })

  // Pre-check section versions in a single read. Sub-blocks are checked the
  // same way, but in a separate query for clarity (and to keep TS happy).
  const sectionConflicts = await precheckBatchConflicts({
    model: prisma.themeSection,
    rows: input.sections.map((s) => ({ id: s.id, version: s.version })),
    refetchForConflict: async (id) => {
      const fresh = await prisma.themeSection.findUnique({
        where: { id },
        include: { blocks: { orderBy: { position: "asc" } } },
      })
      if (!fresh) return null
      return {
        id: fresh.id,
        themeId: fresh.themeId,
        group: fresh.group,
        type: fresh.type,
        position: fresh.position,
        enabled: fresh.enabled,
        content: fresh.content,
        version: fresh.version,
        blocks: fresh.blocks.map((b) => ({
          id: b.id,
          sectionId: b.sectionId,
          type: b.type,
          position: b.position,
          enabled: b.enabled,
          content: b.content,
          version: b.version,
        })),
      } satisfies ThemeSectionRow
    },
  })

  // Flatten existing block rows for the pre-check.
  const allBlockRows = input.sections.flatMap((s) =>
    s.blocks.map((b) => ({ id: b.id, version: b.version })),
  )
  const blockConflictsRaw = await precheckBatchConflicts({
    model: prisma.themeSectionBlock,
    rows: allBlockRows,
    refetchForConflict: async (id) => {
      const fresh = await prisma.themeSectionBlock.findUnique({
        where: { id },
        include: {
          section: {
            include: { blocks: { orderBy: { position: "asc" } } },
          },
        },
      })
      if (!fresh) return null
      // Promote the parent section as the displayed "current" so the UI can
      // show the user which section owns the conflicted block.
      const s = fresh.section
      return {
        id: s.id,
        themeId: s.themeId,
        group: s.group,
        type: s.type,
        position: s.position,
        enabled: s.enabled,
        content: s.content,
        version: s.version,
        blocks: s.blocks.map((b) => ({
          id: b.id,
          sectionId: b.sectionId,
          type: b.type,
          position: b.position,
          enabled: b.enabled,
          content: b.content,
          version: b.version,
        })),
      } satisfies ThemeSectionRow
    },
  })

  const allConflicts: BatchConflictEntry<ThemeSectionRow>[] = [
    ...sectionConflicts,
    ...blockConflictsRaw,
  ]
  if (allConflicts.length > 0) {
    return batchConflict(allConflicts)
  }

  try {
    const persisted = await prisma.$transaction(async (tx) => {
      const existing = await tx.themeSection.findMany({
        where: { themeId: input.themeId, group: input.group },
        select: { id: true, blocks: { select: { id: true } } },
      })
      const existingSectionIds = new Set(existing.map((s) => s.id))
      const incomingSectionIds = new Set(input.sections.map((s) => s.id))

      const sectionsToDelete = [...existingSectionIds].filter(
        (id) => !incomingSectionIds.has(id),
      )
      if (sectionsToDelete.length > 0) {
        await tx.themeSection.deleteMany({
          where: { id: { in: sectionsToDelete } },
        })
      }

      for (const section of input.sections) {
        const isNew =
          section.id.startsWith("tmp-") || !existingSectionIds.has(section.id)

        if (isNew) {
          const created = await tx.themeSection.create({
            data: {
              themeId: input.themeId,
              group: input.group,
              type: section.type,
              position: section.position,
              content: section.content as object,
              enabled: section.enabled,
            },
          })
          for (const block of section.blocks) {
            await tx.themeSectionBlock.create({
              data: {
                sectionId: created.id,
                type: block.type,
                position: block.position,
                content: block.content as object,
                enabled: block.enabled,
              },
            })
          }
        } else {
          // Versioned conditional update. version must be present for
          // existing rows; reject otherwise.
          if (typeof section.version !== "number") {
            throw new BatchRaceError(section.id)
          }
          const upd = await tx.themeSection.updateMany({
            where: { id: section.id, version: section.version },
            data: {
              type: section.type,
              position: section.position,
              content: section.content as object,
              enabled: section.enabled,
              version: { increment: 1 },
            },
          })
          if (upd.count === 0) throw new BatchRaceError(section.id)

          const existingBlockIds = new Set(
            existing.find((s) => s.id === section.id)?.blocks.map((b) => b.id) ?? [],
          )
          const incomingBlockIds = new Set(section.blocks.map((b) => b.id))
          const blocksToDelete = [...existingBlockIds].filter(
            (id) => !incomingBlockIds.has(id),
          )
          if (blocksToDelete.length > 0) {
            await tx.themeSectionBlock.deleteMany({
              where: { id: { in: blocksToDelete } },
            })
          }
          for (const block of section.blocks) {
            const blockIsNew =
              block.id.startsWith("tmp-") || !existingBlockIds.has(block.id)
            if (blockIsNew) {
              await tx.themeSectionBlock.create({
                data: {
                  sectionId: section.id,
                  type: block.type,
                  position: block.position,
                  content: block.content as object,
                  enabled: block.enabled,
                },
              })
            } else {
              if (typeof block.version !== "number") {
                throw new BatchRaceError(block.id)
              }
              const bUpd = await tx.themeSectionBlock.updateMany({
                where: { id: block.id, version: block.version },
                data: {
                  type: block.type,
                  position: block.position,
                  content: block.content as object,
                  enabled: block.enabled,
                  version: { increment: 1 },
                },
              })
              if (bUpd.count === 0) throw new BatchRaceError(block.id)
            }
          }
        }
      }

      return tx.themeSection.findMany({
        where: { themeId: input.themeId, group: input.group },
        orderBy: { position: "asc" },
        include: { blocks: { orderBy: { position: "asc" } } },
      })
    }, NEON_TX_OPTS)

    invalidateSectionGroup(input.themeId, input.group)

    return batchOk<{ sections: ThemeSectionRow[] }, ThemeSectionRow>({
      sections: persisted.map((r) => ({
        id: r.id,
        themeId: r.themeId,
        group: r.group,
        type: r.type,
        position: r.position,
        enabled: r.enabled,
        content: r.content,
        version: r.version,
        blocks: r.blocks.map((b) => ({
          id: b.id,
          sectionId: b.sectionId,
          type: b.type,
          position: b.position,
          enabled: b.enabled,
          content: b.content,
          version: b.version,
        })),
      })),
    })
  } catch (err) {
    if (isBatchRaceError(err)) {
      // Race detected during the txn — fetch fresh state for the conflicting
      // row so the dialog has something concrete to show. The txn rolled
      // back already; this is a read-only refetch.
      const racingId = err.rowId
      const sectionFresh = await prisma.themeSection.findUnique({
        where: { id: racingId },
        include: { blocks: { orderBy: { position: "asc" } } },
      })
      if (sectionFresh) {
        return batchConflict<ThemeSectionRow>([
          {
            rowId: racingId,
            current: {
              id: sectionFresh.id,
              themeId: sectionFresh.themeId,
              group: sectionFresh.group,
              type: sectionFresh.type,
              position: sectionFresh.position,
              enabled: sectionFresh.enabled,
              content: sectionFresh.content,
              version: sectionFresh.version,
              blocks: sectionFresh.blocks.map((b) => ({
                id: b.id,
                sectionId: b.sectionId,
                type: b.type,
                position: b.position,
                enabled: b.enabled,
                content: b.content,
                version: b.version,
              })),
            },
            serverVersion: sectionFresh.version,
          },
        ])
      }
      const blockFresh = await prisma.themeSectionBlock.findUnique({
        where: { id: racingId },
        include: {
          section: { include: { blocks: { orderBy: { position: "asc" } } } },
        },
      })
      if (blockFresh) {
        const s = blockFresh.section
        return batchConflict<ThemeSectionRow>([
          {
            rowId: racingId,
            current: {
              id: s.id,
              themeId: s.themeId,
              group: s.group,
              type: s.type,
              position: s.position,
              enabled: s.enabled,
              content: s.content,
              version: s.version,
              blocks: s.blocks.map((b) => ({
                id: b.id,
                sectionId: b.sectionId,
                type: b.type,
                position: b.position,
                enabled: b.enabled,
                content: b.content,
                version: b.version,
              })),
            },
            serverVersion: blockFresh.version,
          },
        ])
      }
      return batchConflict<ThemeSectionRow>([
        { rowId: racingId, current: null, serverVersion: null },
      ])
    }
    return batchErrored(
      err instanceof Error ? err.message : "Error al guardar secciones",
    )
  }
}

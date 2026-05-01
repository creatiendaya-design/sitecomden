"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"
import type { ThemeSectionGroup } from "@prisma/client"
import {
  getThemeSectionDefinition,
  getSectionBlockDefinition,
} from "@/lib/theme-sections/registry"

/**
 * Plan 16 perf: tag-based invalidation. Section CRUD/save no longer calls
 * `revalidatePath("/")` because that nukes the layout-level caches
 * (site-settings, tracking-pixels, theme-meta) which don't change when
 * sections are edited — re-running them on every autosave is the main
 * driver of slow iframe refresh during the customizer. Instead we
 * invalidate only the per-(theme, group) tag that `getThemedSections`
 * uses, plus the admin customize path so the page-level data fetch picks
 * up the new state.
 */
function invalidateSectionGroup(themeId: string, group: ThemeSectionGroup) {
  updateTag(`theme-sections-${themeId}-${group}`)
  revalidatePath(`/admin/personalizar/temas/${themeId}/customize`)
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
}

export interface ThemeSectionBlockRow {
  id: string
  sectionId: string
  type: string
  position: number
  enabled: boolean
  content: unknown
}

// ---------- Add section ----------

const addThemeSectionSchema = z.object({
  themeId: z.string().min(1),
  group: z.enum(["HEADER", "FOOTER"]),
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
    blocks: created.blocks.map((b) => ({
      id: b.id,
      sectionId: b.sectionId,
      type: b.type,
      position: b.position,
      enabled: b.enabled,
      content: b.content,
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
  group: z.enum(["HEADER", "FOOTER"]),
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
  group: z.enum(["HEADER", "FOOTER"]),
  sections: z.array(batchSectionSchema),
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
  })

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
      blocks: r.blocks.map((b) => ({
        id: b.id,
        sectionId: b.sectionId,
        type: b.type,
        position: b.position,
        enabled: b.enabled,
        content: b.content,
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
    blocks: r.blocks.map((b) => ({
      id: b.id,
      sectionId: b.sectionId,
      type: b.type,
      position: b.position,
      enabled: b.enabled,
      content: b.content,
    })),
  }))
}

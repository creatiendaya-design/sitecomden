"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"
import { getCurrentUserIdOrNull } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { z } from "zod"
import { MAX_MENU_DEPTH } from "@/lib/menus/constants"
import { menuFormSchema } from "@/lib/validations/admin"
import { logAudit } from "@/lib/audit-log"
import { updateWithVersion } from "@/lib/concurrency/with-version"
import {
  conflict,
  errored,
  notFound,
  ok,
  unauthorized,
  validation,
  type SaveResult,
} from "@/lib/concurrency/types"
import {
  BatchRaceError,
  batchConflict,
  batchErrored,
  batchOk,
  batchUnauthorized,
  isBatchRaceError,
  precheckBatchConflicts,
  type BatchSaveResult,
} from "@/lib/concurrency/batch"

function flattenZodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join("; ")
}

export interface MenuRow {
  id: string
  slug: string
  title: string
  description: string | null
  active: boolean
  itemCount: number
  updatedAt: Date
  /** Plan 18 — optimistic-locking version. */
  version: number
}

export interface MenuItemRow {
  id: string
  parentId: string | null
  position: number
  label: string
  linkType: string
  targetId: string | null
  externalUrl: string | null
  openInNewTab: boolean
  /** Plan 18 — per-item optimistic-locking version. */
  version: number
}

export interface MenuWithItems extends MenuRow {
  items: MenuItemRow[]
}

export async function listMenus(): Promise<MenuRow[]> {
  await protectRoute("menus:view")
  const rows = await prisma.menu.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      active: true,
      updatedAt: true,
      version: true,
      _count: { select: { items: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    active: r.active,
    itemCount: r._count.items,
    updatedAt: r.updatedAt,
    version: r.version,
  }))
}

export async function getMenu(id: string): Promise<MenuWithItems | null> {
  await protectRoute("menus:view")
  const m = await prisma.menu.findUnique({
    where: { id },
    include: {
      items: { orderBy: [{ parentId: "asc" }, { position: "asc" }] },
      _count: { select: { items: true } },
    },
  })
  if (!m) return null
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    description: m.description,
    active: m.active,
    itemCount: m._count.items,
    updatedAt: m.updatedAt,
    version: m.version,
    items: m.items.map((it) => ({
      id: it.id,
      parentId: it.parentId,
      position: it.position,
      label: it.label,
      linkType: it.linkType,
      targetId: it.targetId,
      externalUrl: it.externalUrl,
      openInNewTab: it.openInNewTab,
      version: it.version,
    })),
  }
}

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function createMenu(input: {
  slug: string
  title: string
  description?: string
}): Promise<{ id: string }> {
  const userId = await protectRoute("menus:create")

  // Pre-normalize slug so the regex check sees the cleaned value.
  const parsed = menuFormSchema.safeParse({
    ...input,
    slug: normalizeSlug(input.slug),
  })
  if (!parsed.success) throw new Error(flattenZodError(parsed.error))

  const exists = await prisma.menu.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  })
  if (exists) throw new Error(`Ya existe un menú con el slug "${parsed.data.slug}".`)

  const m = await prisma.menu.create({
    data: {
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      createdBy: userId,
    },
  })
  revalidatePath("/admin/menus")

  await logAudit({
    action: "menu.created",
    userId,
    entityType: "Menu",
    entityId: m.id,
    after: { slug: m.slug, title: m.title },
  })

  return { id: m.id }
}

export async function updateMenuMetadata(
  id: string,
  input: {
    slug?: string
    title?: string
    description?: string | null
    active?: boolean
  },
): Promise<void> {
  await protectRoute("menus:update")

  let nextSlug: string | undefined
  if (input.slug !== undefined) {
    nextSlug = normalizeSlug(input.slug)
    if (!nextSlug) throw new Error("El slug es obligatorio")
    const existing = await prisma.menu.findUnique({
      where: { slug: nextSlug },
      select: { id: true },
    })
    if (existing && existing.id !== id) {
      throw new Error(`Ya existe otro menú con el slug "${nextSlug}".`)
    }
  }

  const previous = await prisma.menu.findUnique({
    where: { id },
    select: { slug: true },
  })

  await prisma.menu.update({
    where: { id },
    data: {
      ...(nextSlug !== undefined && { slug: nextSlug }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.active !== undefined && { active: input.active }),
    },
  })

  if (previous?.slug) updateTag(`menu:${previous.slug}`)
  if (nextSlug && nextSlug !== previous?.slug) updateTag(`menu:${nextSlug}`)
  // Plan 12: also bust the per-id cache (used when a theme references the
  // menu by id) and the umbrella tag the storefront uses.
  updateTag(`menu-id:${id}`)
  updateTag("active-theme-menus")
  revalidatePath("/admin/menus")
  revalidatePath(`/admin/menus/${id}`)
}

/**
 * Plan 18 — version-aware variant of `updateMenuMetadata`. Wires through
 * the menu edit form so two admins renaming the same menu collide cleanly.
 */
export async function updateMenuMetadataVersioned(
  id: string,
  expectedVersion: number,
  input: {
    slug?: string
    title?: string
    description?: string | null
    active?: boolean
  },
): Promise<SaveResult<MenuRow>> {
  const userId = await getCurrentUserIdOrNull()
  if (!userId) return unauthorized()
  const allowed = await hasPermission(userId, "menus:update")
  if (!allowed) return unauthorized()

  let nextSlug: string | undefined
  if (input.slug !== undefined) {
    nextSlug = normalizeSlug(input.slug)
    if (!nextSlug) return validation("El slug es obligatorio")
    const existing = await prisma.menu.findUnique({
      where: { slug: nextSlug },
      select: { id: true },
    })
    if (existing && existing.id !== id) {
      return validation(`Ya existe otro menú con el slug "${nextSlug}".`)
    }
  }

  const previous = await prisma.menu.findUnique({
    where: { id },
    select: { slug: true },
  })
  if (!previous) return notFound()

  const data: Record<string, unknown> = {}
  if (nextSlug !== undefined) data.slug = nextSlug
  if (input.title !== undefined) data.title = input.title.trim()
  if (input.description !== undefined)
    data.description = input.description?.trim() || null
  if (input.active !== undefined) data.active = input.active

  if (Object.keys(data).length === 0) {
    const fresh = await prisma.menu.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        active: true,
        updatedAt: true,
        version: true,
        _count: { select: { items: true } },
      },
    })
    if (!fresh) return notFound()
    return ok(
      {
        id: fresh.id,
        slug: fresh.slug,
        title: fresh.title,
        description: fresh.description,
        active: fresh.active,
        itemCount: fresh._count.items,
        updatedAt: fresh.updatedAt,
        version: fresh.version,
      },
      fresh.version,
    )
  }

  try {
    const result = await updateWithVersion<{
      id: string
      slug: string
      title: string
      description: string | null
      active: boolean
      updatedAt: Date
      version: number
    }>({
      model: prisma.menu,
      id,
      expectedVersion,
      data,
    })

    if (!result.ok) {
      if (result.reason === "conflict") {
        if (!result.current) return conflict(null, result.serverVersion)
        const counts = await prisma.menu.findUnique({
          where: { id },
          select: { _count: { select: { items: true } } },
        })
        const row: MenuRow = {
          id: result.current.id,
          slug: result.current.slug,
          title: result.current.title,
          description: result.current.description,
          active: result.current.active,
          itemCount: counts?._count.items ?? 0,
          updatedAt: result.current.updatedAt,
          version: result.current.version,
        }
        return conflict(row, result.serverVersion)
      }
      return result
    }

    if (previous.slug) updateTag(`menu:${previous.slug}`)
    if (nextSlug && nextSlug !== previous.slug) updateTag(`menu:${nextSlug}`)
    updateTag(`menu-id:${id}`)
    updateTag("active-theme-menus")
    revalidatePath("/admin/menus")
    revalidatePath(`/admin/menus/${id}`)

    const counts = await prisma.menu.findUnique({
      where: { id },
      select: { _count: { select: { items: true } } },
    })
    const row: MenuRow = {
      id: result.data.id,
      slug: result.data.slug,
      title: result.data.title,
      description: result.data.description,
      active: result.data.active,
      itemCount: counts?._count.items ?? 0,
      updatedAt: result.data.updatedAt,
      version: result.data.version,
    }
    return ok(row, result.data.version)
  } catch (err) {
    return errored(err instanceof Error ? err.message : "Error al guardar menú")
  }
}

interface IncomingItem {
  id: string
  parentId: string | null
  position: number
  label: string
  linkType: string
  targetId: string | null
  externalUrl: string | null
  openInNewTab: boolean
}

const linkTypeEnum = z.enum([
  "HOME",
  "PRODUCTS_INDEX",
  "COLLECTIONS_INDEX",
  "PAGE",
  "PRODUCT",
  "CATEGORY",
  "EXTERNAL_URL",
])

const incomingItemSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  position: z.number().int().min(0),
  label: z.string().trim().min(1).max(120),
  linkType: linkTypeEnum,
  targetId: z.string().nullable(),
  // externalUrl is stored as-is. URL well-formedness is enforced at the form
  // boundary (LinkPicker) and only matters when linkType === "EXTERNAL_URL".
  // Validating here would reject existing data with partial/malformed URLs.
  externalUrl: z
    .string()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  openInNewTab: z.boolean(),
})

const incomingItemsSchema = z.array(incomingItemSchema)

type ValidatedItem = z.infer<typeof incomingItemSchema>

/**
 * Walks the parent chain of `itemId` and returns its depth (root = 0).
 * Throws on cycles. Used to enforce MAX_MENU_DEPTH server-side.
 */
function computeDepth(
  itemId: string,
  byId: Map<string, ValidatedItem>,
  seen: Set<string> = new Set(),
): number {
  if (seen.has(itemId)) {
    throw new Error("Ciclo detectado en el árbol del menú")
  }
  // Early bail-out before recursing further: caps stack depth at MAX_MENU_DEPTH
  // regardless of payload size. assertDepthAndAcyclic still surfaces the
  // user-facing depth message — this throw protects against malicious payloads
  // (e.g. 10k-deep chains) reaching Node's recursion limit.
  if (seen.size >= MAX_MENU_DEPTH) {
    throw new Error(
      `El menú no puede tener más de ${MAX_MENU_DEPTH} niveles`,
    )
  }
  const it = byId.get(itemId)
  if (!it || it.parentId === null) return 0
  seen.add(itemId)
  return 1 + computeDepth(it.parentId, byId, seen)
}

/**
 * Throws if any item exceeds MAX_MENU_DEPTH or if the tree contains a cycle.
 */
function assertDepthAndAcyclic(items: ValidatedItem[]): void {
  const byId = new Map(items.map((i) => [i.id, i]))
  for (const it of items) {
    const depth = computeDepth(it.id, byId)
    if (depth >= MAX_MENU_DEPTH) {
      throw new Error(
        `El menú no puede tener más de ${MAX_MENU_DEPTH} niveles`,
      )
    }
  }
}

/**
 * Asserts that every non-tmp parentId reference points to an item that
 * already belongs to the same menu. Prevents cross-menu reparenting via
 * crafted payloads.
 */
async function assertParentsBelongToMenu(
  menuId: string,
  items: ValidatedItem[],
): Promise<void> {
  const incomingIds = new Set(items.map((i) => i.id))
  const externalParentIds = items
    .map((i) => i.parentId)
    .filter((p): p is string => p !== null && !p.startsWith("tmp-") && !incomingIds.has(p))
  if (externalParentIds.length === 0) return
  const found = await prisma.menuItem.findMany({
    where: { id: { in: externalParentIds } },
    select: { id: true, menuId: true },
  })
  for (const id of externalParentIds) {
    const row = found.find((f) => f.id === id)
    if (!row || row.menuId !== menuId) {
      throw new Error("parentId inválido: no pertenece a este menú")
    }
  }
}

export async function saveMenuItems(
  menuId: string,
  incoming: IncomingItem[],
): Promise<{ success: true }> {
  await protectRoute("menus:update")
  const items = incomingItemsSchema.parse(incoming)
  assertDepthAndAcyclic(items)
  await assertParentsBelongToMenu(menuId, items)

  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    select: { slug: true },
  })
  if (!menu) throw new Error("Menú no encontrado")

  // Two-pass id remapping for parents: tmp- ids must resolve to real ids
  // before children that reference them get inserted. We do this in a single
  // transaction by inserting parents first, capturing their real ids, then
  // inserting children with the remapped parentId.
  const tmpToReal = new Map<string, string>()

  await prisma.$transaction(async (tx) => {
    const existing = await tx.menuItem.findMany({
      where: { menuId },
      select: { id: true },
    })
    const existingIds = new Set(existing.map((b) => b.id))
    const incomingIds = new Set(items.map((b) => b.id))

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length > 0) {
      // Children get cascade-deleted by their parent's onDelete: Cascade.
      // But we need to be careful: if BOTH a parent and its child are
      // marked for deletion, deleting the parent first cascades the child,
      // then deleting the child errors. Sort: leaves first.
      const childOf = new Map<string, string[]>()
      for (const e of existing) {
        const parent = items.find((i) => i.id === e.id)?.parentId ?? null
        if (parent) {
          if (!childOf.has(parent)) childOf.set(parent, [])
          childOf.get(parent)!.push(e.id)
        }
      }
      // Delete in batches; Prisma will cascade where needed.
      await tx.menuItem.deleteMany({ where: { id: { in: toDelete } } })
    }

    // Topological insert: each pass inserts items whose parent is already
    // resolved (root, previously inserted in this transaction, or pre-existing).
    // Repeat until none remain. If a pass makes no progress, the payload has
    // a cycle or an unreachable parent — abort.
    let pending: ValidatedItem[] = [...items]
    let lastSize = -1

    while (pending.length > 0 && pending.length !== lastSize) {
      lastSize = pending.length
      const next: ValidatedItem[] = []

      for (const it of pending) {
        const parentResolved =
          it.parentId === null ||
          tmpToReal.has(it.parentId) ||
          existingIds.has(it.parentId)

        if (!parentResolved) {
          next.push(it)
          continue
        }

        const realParentId =
          it.parentId === null
            ? null
            : tmpToReal.get(it.parentId) ?? it.parentId

        const data = {
          menuId,
          parentId: realParentId,
          position: it.position,
          label: it.label,
          linkType: it.linkType,
          targetId: it.targetId,
          externalUrl: it.externalUrl,
          openInNewTab: it.openInNewTab,
        }

        const isNew = it.id.startsWith("tmp-") || !existingIds.has(it.id)
        if (isNew) {
          const created = await tx.menuItem.create({
            data,
            select: { id: true },
          })
          tmpToReal.set(it.id, created.id)
        } else {
          await tx.menuItem.update({ where: { id: it.id }, data })
          tmpToReal.set(it.id, it.id)
        }
      }

      pending = next
    }

    if (pending.length > 0) {
      throw new Error(
        "No se pudo guardar el menú: referencia inválida en parentId",
      )
    }

    await tx.menu.update({
      where: { id: menuId },
      data: { updatedAt: new Date() },
    })
  })

  updateTag(`menu:${menu.slug}`)
  // Plan 12: items changed → both per-slug and per-id caches need busting,
  // plus the umbrella tag the storefront uses.
  updateTag(`menu-id:${menuId}`)
  updateTag("active-theme-menus")
  revalidatePath(`/admin/menus/${menuId}`)
  return { success: true }
}

/**
 * Plan 18 — version-aware variant of `saveMenuItems`. Each existing item
 * carries its `version`; new "tmp-…" items omit it. All-or-nothing.
 *
 * Same topological-insert logic as `saveMenuItems` but each existing
 * row's update goes through `updateMany where: { id, version }`.
 */
interface IncomingItemVersioned extends IncomingItem {
  version?: number
}

const incomingItemVersionedSchema = incomingItemSchema.extend({
  version: z.number().int().nonnegative().optional(),
})

const incomingItemsVersionedSchema = z.array(incomingItemVersionedSchema)

export async function saveMenuItemsVersioned(
  menuId: string,
  incoming: IncomingItemVersioned[],
): Promise<
  BatchSaveResult<
    { items: MenuItemRow[]; tmpToReal: Record<string, string> },
    MenuItemRow
  >
> {
  const userId = await getCurrentUserIdOrNull()
  if (!userId) return batchUnauthorized()
  const allowed = await hasPermission(userId, "menus:update")
  if (!allowed) return batchUnauthorized()

  const items = incomingItemsVersionedSchema.parse(incoming)
  try {
    assertDepthAndAcyclic(items)
    await assertParentsBelongToMenu(menuId, items)
  } catch (err) {
    return batchErrored(err instanceof Error ? err.message : "Validation error")
  }

  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    select: { slug: true },
  })
  if (!menu) return { ok: false, reason: "not_found" }

  const conflicts = await precheckBatchConflicts({
    model: prisma.menuItem,
    rows: items.map((it) => ({ id: it.id, version: it.version })),
    refetchForConflict: async (id) => {
      const fresh = await prisma.menuItem.findUnique({ where: { id } })
      if (!fresh) return null
      return {
        id: fresh.id,
        parentId: fresh.parentId,
        position: fresh.position,
        label: fresh.label,
        linkType: fresh.linkType,
        targetId: fresh.targetId,
        externalUrl: fresh.externalUrl,
        openInNewTab: fresh.openInNewTab,
        version: fresh.version,
      } satisfies MenuItemRow
    },
  })
  if (conflicts.length > 0) return batchConflict(conflicts)

  const tmpToReal = new Map<string, string>()

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.menuItem.findMany({
        where: { menuId },
        select: { id: true },
      })
      const existingIds = new Set(existing.map((b) => b.id))
      const incomingIds = new Set(items.map((b) => b.id))

      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
      if (toDelete.length > 0) {
        await tx.menuItem.deleteMany({ where: { id: { in: toDelete } } })
      }

      let pending: typeof items = [...items]
      let lastSize = -1

      while (pending.length > 0 && pending.length !== lastSize) {
        lastSize = pending.length
        const next: typeof items = []

        for (const it of pending) {
          const parentResolved =
            it.parentId === null ||
            tmpToReal.has(it.parentId) ||
            existingIds.has(it.parentId)

          if (!parentResolved) {
            next.push(it)
            continue
          }

          const realParentId =
            it.parentId === null
              ? null
              : tmpToReal.get(it.parentId) ?? it.parentId

          const data = {
            menuId,
            parentId: realParentId,
            position: it.position,
            label: it.label,
            linkType: it.linkType,
            targetId: it.targetId,
            externalUrl: it.externalUrl,
            openInNewTab: it.openInNewTab,
          }

          const isNew = it.id.startsWith("tmp-") || !existingIds.has(it.id)
          if (isNew) {
            const created = await tx.menuItem.create({
              data,
              select: { id: true },
            })
            tmpToReal.set(it.id, created.id)
          } else {
            if (typeof it.version !== "number") {
              throw new BatchRaceError(it.id)
            }
            const upd = await tx.menuItem.updateMany({
              where: { id: it.id, version: it.version },
              data: { ...data, version: { increment: 1 } },
            })
            if (upd.count === 0) throw new BatchRaceError(it.id)
            tmpToReal.set(it.id, it.id)
          }
        }

        pending = next
      }

      if (pending.length > 0) {
        throw new Error("No se pudo guardar el menú: referencia inválida en parentId")
      }

      await tx.menu.update({
        where: { id: menuId },
        data: { updatedAt: new Date() },
      })
    })

    const persisted = await prisma.menuItem.findMany({
      where: { menuId },
      orderBy: [{ parentId: "asc" }, { position: "asc" }],
    })

    updateTag(`menu:${menu.slug}`)
    updateTag(`menu-id:${menuId}`)
    updateTag("active-theme-menus")
    revalidatePath(`/admin/menus/${menuId}`)

    return batchOk<
      { items: MenuItemRow[]; tmpToReal: Record<string, string> },
      MenuItemRow
    >({
      items: persisted.map((it) => ({
        id: it.id,
        parentId: it.parentId,
        position: it.position,
        label: it.label,
        linkType: it.linkType,
        targetId: it.targetId,
        externalUrl: it.externalUrl,
        openInNewTab: it.openInNewTab,
        version: it.version,
      })),
      tmpToReal: Object.fromEntries(tmpToReal),
    })
  } catch (err) {
    if (isBatchRaceError(err)) {
      const fresh = await prisma.menuItem.findUnique({
        where: { id: err.rowId },
      })
      return batchConflict<MenuItemRow>([
        {
          rowId: err.rowId,
          current: fresh
            ? {
                id: fresh.id,
                parentId: fresh.parentId,
                position: fresh.position,
                label: fresh.label,
                linkType: fresh.linkType,
                targetId: fresh.targetId,
                externalUrl: fresh.externalUrl,
                openInNewTab: fresh.openInNewTab,
                version: fresh.version,
              }
            : null,
          serverVersion: fresh?.version ?? null,
        },
      ])
    }
    return batchErrored(
      err instanceof Error ? err.message : "Error al guardar items",
    )
  }
}

export async function deleteMenu(id: string): Promise<void> {
  const userId = await protectRoute("menus:delete")
  if (typeof id !== "string" || !id) throw new Error("Menú inválido")

  const m = await prisma.menu.findUnique({
    where: { id },
    select: { slug: true, title: true },
  })
  if (!m) return
  await prisma.menu.delete({ where: { id } })
  updateTag(`menu:${m.slug}`)
  updateTag(`menu-id:${id}`)
  updateTag("active-theme-menus")
  revalidatePath("/admin/menus")

  await logAudit({
    action: "menu.deleted",
    userId,
    entityType: "Menu",
    entityId: id,
    before: { slug: m.slug, title: m.title },
  })
}

export async function toggleMenuActive(id: string): Promise<void> {
  const userId = await protectRoute("menus:update")
  if (typeof id !== "string" || !id) throw new Error("Menú inválido")

  const m = await prisma.menu.findUnique({
    where: { id },
    select: { active: true, slug: true },
  })
  if (!m) throw new Error("Menú no encontrado")
  await prisma.menu.update({
    where: { id },
    data: { active: !m.active },
  })
  updateTag(`menu:${m.slug}`)
  revalidatePath("/admin/menus")

  await logAudit({
    action: m.active ? "menu.deactivated" : "menu.activated",
    userId,
    entityType: "Menu",
    entityId: id,
    metadata: { active: !m.active },
  })
}

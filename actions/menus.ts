"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"

export interface MenuRow {
  id: string
  slug: string
  title: string
  description: string | null
  active: boolean
  itemCount: number
  updatedAt: Date
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
  }))
}

/**
 * Slim variant of `listMenus` for use inside the theme picker UI. Gated by
 * `themes:update` (not `menus:view`) so an admin who can edit themes but
 * not browse the full Menus section can still pick header/footer menus.
 */
export async function listMenusForThemePicker(): Promise<MenuRow[]> {
  await protectRoute("themes:update")
  const rows = await prisma.menu.findMany({
    where: { active: true },
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      active: true,
      updatedAt: true,
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
    items: m.items.map((it) => ({
      id: it.id,
      parentId: it.parentId,
      position: it.position,
      label: it.label,
      linkType: it.linkType,
      targetId: it.targetId,
      externalUrl: it.externalUrl,
      openInNewTab: it.openInNewTab,
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
  if (!input.title.trim()) throw new Error("El título es obligatorio")
  const slug = normalizeSlug(input.slug)
  if (!slug) throw new Error("El slug es obligatorio")

  const exists = await prisma.menu.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (exists) throw new Error(`Ya existe un menú con el slug "${slug}".`)

  const m = await prisma.menu.create({
    data: {
      slug,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      createdBy: userId,
    },
  })
  revalidatePath("/admin/menus")
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

export async function saveMenuItems(
  menuId: string,
  incoming: IncomingItem[],
): Promise<{ success: true }> {
  await protectRoute("menus:update")

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
    const incomingIds = new Set(incoming.map((b) => b.id))

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length > 0) {
      // Children get cascade-deleted by their parent's onDelete: Cascade.
      // But we need to be careful: if BOTH a parent and its child are
      // marked for deletion, deleting the parent first cascades the child,
      // then deleting the child errors. Sort: leaves first.
      const childOf = new Map<string, string[]>()
      for (const e of existing) {
        const parent = incoming.find((i) => i.id === e.id)?.parentId ?? null
        if (parent) {
          if (!childOf.has(parent)) childOf.set(parent, [])
          childOf.get(parent)!.push(e.id)
        }
      }
      // Delete in batches; Prisma will cascade where needed.
      await tx.menuItem.deleteMany({ where: { id: { in: toDelete } } })
    }

    // Pass 1 — items with no parent (or with parent that already has a real id).
    // Pass 2 — items whose parent was a tmp- id that we mapped in pass 1.
    const roots = incoming.filter((i) => i.parentId === null)
    const children = incoming.filter((i) => i.parentId !== null)

    for (const it of roots) {
      const data = {
        menuId,
        parentId: null,
        position: it.position,
        label: it.label,
        linkType: it.linkType,
        targetId: it.targetId,
        externalUrl: it.externalUrl,
        openInNewTab: it.openInNewTab,
      }
      if (it.id.startsWith("tmp-") || !existingIds.has(it.id)) {
        const created = await tx.menuItem.create({ data, select: { id: true } })
        tmpToReal.set(it.id, created.id)
      } else {
        await tx.menuItem.update({ where: { id: it.id }, data })
        tmpToReal.set(it.id, it.id)
      }
    }

    for (const it of children) {
      const realParentId = tmpToReal.get(it.parentId!) ?? it.parentId!
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
      if (it.id.startsWith("tmp-") || !existingIds.has(it.id)) {
        await tx.menuItem.create({ data })
      } else {
        await tx.menuItem.update({ where: { id: it.id }, data })
      }
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

export async function deleteMenu(id: string): Promise<void> {
  await protectRoute("menus:delete")
  const m = await prisma.menu.findUnique({
    where: { id },
    select: { slug: true },
  })
  if (!m) return
  await prisma.menu.delete({ where: { id } })
  updateTag(`menu:${m.slug}`)
  updateTag(`menu-id:${id}`)
  updateTag("active-theme-menus")
  revalidatePath("/admin/menus")
}

export async function toggleMenuActive(id: string): Promise<void> {
  await protectRoute("menus:update")
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
}

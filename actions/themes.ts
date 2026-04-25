"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"

export interface ThemeRow {
  id: string
  name: string
  description: string | null
  active: boolean
  defaultProductLandingTemplateId: string | null
  /** Joined name of the default landing template, for UI display. */
  defaultProductLandingTemplateName: string | null
  updatedAt: Date
}

export async function listThemes(): Promise<ThemeRow[]> {
  await protectRoute("themes:view")
  const rows = await prisma.theme.findMany({
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    include: {
      defaultProductLandingTemplate: { select: { id: true, name: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    active: r.active,
    defaultProductLandingTemplateId: r.defaultProductLandingTemplateId,
    defaultProductLandingTemplateName: r.defaultProductLandingTemplate?.name ?? null,
    updatedAt: r.updatedAt,
  }))
}

export async function getActiveTheme(): Promise<ThemeRow | null> {
  await protectRoute("themes:view")
  const t = await prisma.theme.findFirst({
    where: { active: true },
    include: { defaultProductLandingTemplate: { select: { id: true, name: true } } },
  })
  if (!t) return null
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    active: t.active,
    defaultProductLandingTemplateId: t.defaultProductLandingTemplateId,
    defaultProductLandingTemplateName: t.defaultProductLandingTemplate?.name ?? null,
    updatedAt: t.updatedAt,
  }
}

export async function getTheme(id: string): Promise<ThemeRow | null> {
  await protectRoute("themes:view")
  const t = await prisma.theme.findUnique({
    where: { id },
    include: { defaultProductLandingTemplate: { select: { id: true, name: true } } },
  })
  if (!t) return null
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    active: t.active,
    defaultProductLandingTemplateId: t.defaultProductLandingTemplateId,
    defaultProductLandingTemplateName: t.defaultProductLandingTemplate?.name ?? null,
    updatedAt: t.updatedAt,
  }
}

export async function createTheme(input: {
  name: string
  description?: string
}): Promise<{ id: string }> {
  const userId = await protectRoute("themes:create")
  if (!input.name.trim()) throw new Error("El nombre es obligatorio")

  // First theme created in the system becomes active automatically — there
  // must always be exactly one active theme once any exist.
  const existingActive = await prisma.theme.count({ where: { active: true } })

  const theme = await prisma.theme.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      active: existingActive === 0,
      createdBy: userId,
    },
  })
  revalidatePath("/admin/personalizar")
  revalidatePath("/admin/personalizar/temas")
  if (existingActive === 0) updateTag("active-theme")
  return { id: theme.id }
}

export async function updateThemeMetadata(
  id: string,
  input: {
    name?: string
    description?: string | null
    defaultProductLandingTemplateId?: string | null
  },
): Promise<void> {
  await protectRoute("themes:update")

  const t = await prisma.theme.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.defaultProductLandingTemplateId !== undefined && {
        defaultProductLandingTemplateId: input.defaultProductLandingTemplateId,
      }),
    },
    select: { active: true },
  })

  updateTag(`theme:${id}`)
  // If we touched the active theme's default landing, every product without
  // its own landingTemplateId on the storefront needs to refresh. Bump a
  // global tag (storefront fetchers will be wired to it in subsequent plans).
  if (t.active) updateTag("active-theme")
  revalidatePath("/admin/personalizar")
  revalidatePath(`/admin/personalizar/temas/${id}/editar`)
}

export async function setActiveTheme(id: string): Promise<void> {
  await protectRoute("themes:activate")

  await prisma.$transaction(async (tx) => {
    const exists = await tx.theme.findUnique({ where: { id }, select: { id: true } })
    if (!exists) throw new Error("Tema no encontrado")
    await tx.theme.updateMany({ where: { active: true }, data: { active: false } })
    await tx.theme.update({ where: { id }, data: { active: true } })
  })

  updateTag("active-theme")
  revalidatePath("/admin/personalizar")
  revalidatePath("/admin/personalizar/temas")
}

export async function deleteTheme(id: string): Promise<void> {
  await protectRoute("themes:delete")
  const t = await prisma.theme.findUnique({ where: { id }, select: { active: true } })
  if (!t) throw new Error("Tema no encontrado")
  if (t.active) {
    throw new Error("No podés eliminar el tema activo. Activá otro primero.")
  }
  await prisma.theme.delete({ where: { id } })
  revalidatePath("/admin/personalizar/temas")
}

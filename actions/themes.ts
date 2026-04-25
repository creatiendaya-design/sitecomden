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
  /** Page rendered at "/" when this theme is active. Null = legacy hardcoded home. */
  homePageId: string | null
  /** Joined title of the home page, for UI display. */
  homePageTitle: string | null
  /** Joined slug of the home page, for UI display + redirect handling. */
  homePageSlug: string | null
  updatedAt: Date
}

const themeIncludes = {
  defaultProductLandingTemplate: { select: { id: true, name: true } },
  homePage: { select: { id: true, title: true, slug: true } },
} as const

type ThemeWithJoins = {
  id: string
  name: string
  description: string | null
  active: boolean
  defaultProductLandingTemplateId: string | null
  defaultProductLandingTemplate: { id: string; name: string } | null
  homePageId: string | null
  homePage: { id: string; title: string; slug: string } | null
  updatedAt: Date
}

function toThemeRow(t: ThemeWithJoins): ThemeRow {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    active: t.active,
    defaultProductLandingTemplateId: t.defaultProductLandingTemplateId,
    defaultProductLandingTemplateName: t.defaultProductLandingTemplate?.name ?? null,
    homePageId: t.homePageId,
    homePageTitle: t.homePage?.title ?? null,
    homePageSlug: t.homePage?.slug ?? null,
    updatedAt: t.updatedAt,
  }
}

export async function listThemes(): Promise<ThemeRow[]> {
  await protectRoute("themes:view")
  const rows = await prisma.theme.findMany({
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    include: themeIncludes,
  })
  return rows.map(toThemeRow)
}

export async function getActiveTheme(): Promise<ThemeRow | null> {
  await protectRoute("themes:view")
  const t = await prisma.theme.findFirst({
    where: { active: true },
    include: themeIncludes,
  })
  return t ? toThemeRow(t) : null
}

export async function getTheme(id: string): Promise<ThemeRow | null> {
  await protectRoute("themes:view")
  const t = await prisma.theme.findUnique({
    where: { id },
    include: themeIncludes,
  })
  return t ? toThemeRow(t) : null
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
    homePageId?: string | null
  },
): Promise<void> {
  await protectRoute("themes:update")

  // Validate the new home page exists + is active. Picking an inactive page
  // as home would silently break "/" until reactivated, so we reject upfront.
  if (input.homePageId) {
    const page = await prisma.page.findUnique({
      where: { id: input.homePageId },
      select: { active: true },
    })
    if (!page) throw new Error("La página seleccionada no existe.")
    if (!page.active) {
      throw new Error("La página seleccionada está oculta. Activala antes de asignarla como home.")
    }
  }

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
      ...(input.homePageId !== undefined && {
        homePageId: input.homePageId,
      }),
    },
    select: { active: true },
  })

  updateTag(`theme:${id}`)
  // If we touched the active theme, the storefront home + any product without
  // its own landingTemplateId need to refresh. Bump both global tags.
  if (t.active) {
    updateTag("active-theme")
    updateTag("active-theme-home")
    revalidatePath("/")
  }
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
  updateTag("active-theme-home")
  revalidatePath("/")
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

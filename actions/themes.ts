"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"
import { getCurrentUserIdOrNull } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import type { ThemeTokens } from "@/lib/themes/tokens"
import {
  resolveColorSchemes,
  type ColorSchemeArray,
} from "@/lib/themes/color-schemes"
import type { ThemeSectionCatalog } from "@/lib/theme-sections/types"
import { z } from "zod"
import { createThemeSchema } from "@/lib/validations/admin"
import { logAudit } from "@/lib/audit-log"
import { updateWithVersionAndRefetch } from "@/lib/concurrency/with-version"
import {
  conflict,
  errored,
  notFound,
  ok,
  unauthorized,
  validation,
  type SaveResult,
} from "@/lib/concurrency/types"

function flattenZodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join("; ")
}

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
  /** Page whose blocks render above the cart UI. Null = no blocks. */
  cartPageId: string | null
  cartPageTitle: string | null
  cartPageSlug: string | null
  /** Visual design tokens (Plan 11). May be partial or empty {}; consumers
   *  call `resolveTokens()` to merge with system defaults. */
  tokens: ThemeTokens
  /** Plan 13.1 — named color schemes the admin can author and any block
   *  can pick via `style.colorSchemeId`. The first scheme is the theme
   *  default. Always at least one entry: when the DB column is `[]`, the
   *  resolver synthesizes a scheme from `tokens.colors`. */
  colorSchemes: ColorSchemeArray
  /** Plan 16 — per-theme catalog of allowed section types per group. Empty
   *  `{}` means permissive (all registry types available). */
  sectionCatalog: ThemeSectionCatalog
  updatedAt: Date
  /** Plan 18 — optimistic-locking version. Pass back as `expectedVersion`
   *  on every versioned save so we can detect concurrent edits. */
  version: number
}

const themeIncludes = {
  defaultProductLandingTemplate: { select: { id: true, name: true } },
  homePage: { select: { id: true, title: true, slug: true } },
  cartPage: { select: { id: true, title: true, slug: true } },
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
  cartPageId: string | null
  cartPage: { id: string; title: string; slug: string } | null
  tokens: unknown
  colorSchemes: unknown
  sectionCatalog: unknown
  updatedAt: Date
  version: number
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
    cartPageId: t.cartPageId,
    cartPageTitle: t.cartPage?.title ?? null,
    cartPageSlug: t.cartPage?.slug ?? null,
    tokens: (t.tokens as ThemeTokens) ?? {},
    colorSchemes: resolveColorSchemes(
      t.colorSchemes,
      t.tokens as ThemeTokens | null,
    ),
    sectionCatalog: (t.sectionCatalog as ThemeSectionCatalog | null) ?? {},
    updatedAt: t.updatedAt,
    version: t.version,
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

  const parsed = createThemeSchema.safeParse(input)
  if (!parsed.success) throw new Error(flattenZodError(parsed.error))

  // First theme created in the system becomes active automatically — there
  // must always be exactly one active theme once any exist.
  const existingActive = await prisma.theme.count({ where: { active: true } })

  const theme = await prisma.theme.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      active: existingActive === 0,
      createdBy: userId,
    },
  })
  revalidatePath("/admin/personalizar")
  revalidatePath("/admin/personalizar/temas")
  if (existingActive === 0) updateTag("active-theme")

  await logAudit({
    action: "theme.created",
    userId,
    entityType: "Theme",
    entityId: theme.id,
    after: { name: theme.name, active: theme.active },
  })

  return { id: theme.id }
}

export async function updateThemeMetadata(
  id: string,
  input: {
    name?: string
    description?: string | null
    defaultProductLandingTemplateId?: string | null
    homePageId?: string | null
    cartPageId?: string | null
    tokens?: ThemeTokens
    colorSchemes?: ColorSchemeArray
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

  // Same validation for the cart page.
  if (input.cartPageId) {
    const page = await prisma.page.findUnique({
      where: { id: input.cartPageId },
      select: { active: true },
    })
    if (!page) throw new Error("La página seleccionada no existe.")
    if (!page.active) {
      throw new Error("La página seleccionada está oculta. Activala antes de asignarla al carrito.")
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
      ...(input.cartPageId !== undefined && {
        cartPageId: input.cartPageId,
      }),
      ...(input.tokens !== undefined && {
        tokens: input.tokens as object,
      }),
      ...(input.colorSchemes !== undefined && {
        colorSchemes: input.colorSchemes as unknown as object,
      }),
    },
    select: { active: true },
  })

  updateTag(`theme:${id}`)
  // If we touched the active theme, the storefront home + any product without
  // its own landingTemplateId + header/footer menus need to refresh.
  if (t.active) {
    updateTag("active-theme")
    updateTag("active-theme-home")
    updateTag("active-theme-cart")
    updateTag("active-theme-menus")
    updateTag("active-theme-tokens")
    revalidatePath("/")
    revalidatePath("/carrito")
  }
  revalidatePath("/admin/personalizar")
  revalidatePath(`/admin/personalizar/temas/${id}/editar`)
}

/**
 * Plan 18 — version-aware variant of `updateThemeMetadata`.
 *
 * Returns a `SaveResult<ThemeRow>` instead of throwing:
 *   - `ok: true`  → save applied, new `version` returned for the next call.
 *   - `reason: "conflict"` → another admin updated the theme since the
 *     caller's fetch; `current` is the fresh server row for the conflict UI.
 *   - `reason: "validation"` → linked page is missing/inactive.
 *   - `reason: "unauthorized"` / `"not_found"` → self-explanatory.
 *
 * The customizer's auto-save path uses this. Other callers (admin theme
 * edit form) can keep using `updateThemeMetadata` for last-write-wins until
 * they migrate.
 */
export async function updateThemeMetadataVersioned(
  id: string,
  expectedVersion: number,
  input: {
    name?: string
    description?: string | null
    defaultProductLandingTemplateId?: string | null
    homePageId?: string | null
    cartPageId?: string | null
    tokens?: ThemeTokens
    colorSchemes?: ColorSchemeArray
    sectionCatalog?: ThemeSectionCatalog
  },
): Promise<SaveResult<ThemeRow>> {
  // Auth check without redirect — auto-save needs a JSON result, not a 302.
  const userId = await getCurrentUserIdOrNull()
  if (!userId) return unauthorized()
  const allowed = await hasPermission(userId, "themes:update")
  if (!allowed) return unauthorized()

  // Validate the new home page exists + is active.
  if (input.homePageId) {
    const page = await prisma.page.findUnique({
      where: { id: input.homePageId },
      select: { active: true },
    })
    if (!page) return validation("La página seleccionada no existe.")
    if (!page.active) {
      return validation(
        "La página seleccionada está oculta. Activala antes de asignarla como home.",
      )
    }
  }

  if (input.cartPageId) {
    const page = await prisma.page.findUnique({
      where: { id: input.cartPageId },
      select: { active: true },
    })
    if (!page) return validation("La página seleccionada no existe.")
    if (!page.active) {
      return validation(
        "La página seleccionada está oculta. Activala antes de asignarla al carrito.",
      )
    }
  }

  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.description !== undefined)
    data.description = input.description?.trim() || null
  if (input.defaultProductLandingTemplateId !== undefined)
    data.defaultProductLandingTemplateId = input.defaultProductLandingTemplateId
  if (input.homePageId !== undefined) data.homePageId = input.homePageId
  if (input.cartPageId !== undefined) data.cartPageId = input.cartPageId
  if (input.tokens !== undefined) data.tokens = input.tokens as object
  if (input.colorSchemes !== undefined)
    data.colorSchemes = input.colorSchemes as unknown as object
  if (input.sectionCatalog !== undefined)
    data.sectionCatalog = input.sectionCatalog as unknown as object

  // Fast path: empty update should not bump version or hit DB.
  if (Object.keys(data).length === 0) {
    const fresh = await prisma.theme.findUnique({
      where: { id },
      include: themeIncludes,
    })
    if (!fresh) return notFound()
    return ok(toThemeRow(fresh), fresh.version)
  }

  try {
    const result = await updateWithVersionAndRefetch<
      { version: number },
      ThemeWithJoins
    >({
      model: prisma.theme,
      id,
      expectedVersion,
      data,
      refetch: (rowId) =>
        prisma.theme.findUnique({
          where: { id: rowId },
          include: themeIncludes,
        }) as Promise<ThemeWithJoins | null>,
    })

    if (!result.ok) {
      if (result.reason === "conflict") {
        const current = result.current ? toThemeRow(result.current) : null
        return conflict(current, result.serverVersion)
      }
      return result
    }

    const row = toThemeRow(result.data)

    updateTag(`theme:${id}`)
    if (row.active) {
      updateTag("active-theme")
      updateTag("active-theme-home")
      updateTag("active-theme-cart")
      updateTag("active-theme-menus")
      updateTag("active-theme-tokens")
      revalidatePath("/")
      revalidatePath("/carrito")
    }
    revalidatePath("/admin/personalizar")
    revalidatePath(`/admin/personalizar/temas/${id}/editar`)

    return ok(row, row.version)
  } catch (err) {
    return errored(err instanceof Error ? err.message : "Error al guardar tema")
  }
}

export async function setActiveTheme(id: string): Promise<void> {
  const userId = await protectRoute("themes:activate")

  if (typeof id !== "string" || !id) throw new Error("Tema inválido")

  await prisma.$transaction(async (tx) => {
    const exists = await tx.theme.findUnique({ where: { id }, select: { id: true } })
    if (!exists) throw new Error("Tema no encontrado")
    await tx.theme.updateMany({ where: { active: true }, data: { active: false } })
    await tx.theme.update({ where: { id }, data: { active: true } })
  })

  updateTag("active-theme")
  updateTag("active-theme-home")
  updateTag("active-theme-cart")
  updateTag("active-theme-menus")
  revalidatePath("/")
  revalidatePath("/carrito")
  revalidatePath("/admin/personalizar")
  revalidatePath("/admin/personalizar/temas")

  await logAudit({
    action: "theme.activated",
    userId,
    entityType: "Theme",
    entityId: id,
  })
}

export async function deleteTheme(id: string): Promise<void> {
  const userId = await protectRoute("themes:delete")

  if (typeof id !== "string" || !id) throw new Error("Tema inválido")

  const t = await prisma.theme.findUnique({
    where: { id },
    select: { active: true, name: true },
  })
  if (!t) throw new Error("Tema no encontrado")
  if (t.active) {
    throw new Error("No podés eliminar el tema activo. Activá otro primero.")
  }
  await prisma.theme.delete({ where: { id } })
  revalidatePath("/admin/personalizar/temas")

  await logAudit({
    action: "theme.deleted",
    userId,
    entityType: "Theme",
    entityId: id,
    before: { name: t.name },
  })
}

/**
 * Plan 13 — auto-creates a Page for the theme's Home section when none
 * exists, then returns its id. Used by the Customizer so the admin sees
 * an "Editar contenido" path directly (no dropdown picker, mirroring
 * Shopify's UX where Home is conceptually a fixed surface).
 *
 * If the theme already has a homePageId, returns it unchanged.
 */
export async function ensureHomePageForTheme(
  themeId: string,
): Promise<{ pageId: string; created: boolean }> {
  await protectRoute("themes:update")
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    select: { id: true, name: true, homePageId: true, active: true },
  })
  if (!theme) throw new Error("Tema no encontrado")

  if (theme.homePageId) {
    return { pageId: theme.homePageId, created: false }
  }

  const slug = await uniqueSlug(`home-${themeId.slice(0, 8)}`)

  const page = await prisma.page.create({
    data: {
      slug,
      title: `Home — ${theme.name}`,
      description: "Página de inicio de la tienda. Editala desde el Customizer.",
      active: true,
    },
    select: { id: true },
  })

  await prisma.theme.update({
    where: { id: themeId },
    data: { homePageId: page.id },
  })

  if (theme.active) {
    updateTag("active-theme")
    updateTag("active-theme-home")
    revalidatePath("/")
  }
  updateTag(`theme:${themeId}`)
  revalidatePath(`/admin/personalizar/temas/${themeId}/customize`)
  return { pageId: page.id, created: true }
}

/**
 * Same idea as ensureHomePageForTheme but for the Cart blocks page.
 */
export async function ensureCartPageForTheme(
  themeId: string,
): Promise<{ pageId: string; created: boolean }> {
  await protectRoute("themes:update")
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    select: { id: true, name: true, cartPageId: true, active: true },
  })
  if (!theme) throw new Error("Tema no encontrado")

  if (theme.cartPageId) {
    return { pageId: theme.cartPageId, created: false }
  }

  const slug = await uniqueSlug(`cart-${themeId.slice(0, 8)}`)

  const page = await prisma.page.create({
    data: {
      slug,
      title: `Carrito — ${theme.name}`,
      description:
        "Bloques que se renderizan arriba del UI del carrito. Editala desde el Customizer.",
      active: true,
    },
    select: { id: true },
  })

  await prisma.theme.update({
    where: { id: themeId },
    data: { cartPageId: page.id },
  })

  if (theme.active) {
    updateTag("active-theme")
    updateTag("active-theme-cart")
    revalidatePath("/carrito")
  }
  updateTag(`theme:${themeId}`)
  revalidatePath(`/admin/personalizar/temas/${themeId}/customize`)
  return { pageId: page.id, created: true }
}

/**
 * Tries the desired slug first; on collision appends `-2`, `-3`, ... until
 * unique. Pages are unique by slug across the whole DB, so we need to
 * disambiguate when admins have multiple themes that auto-created homes.
 */
async function uniqueSlug(desired: string): Promise<string> {
  let candidate = desired
  let n = 2
  // Bounded iteration just in case — 50 is far beyond any realistic case.
  for (let i = 0; i < 50; i++) {
    const exists = await prisma.page.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!exists) return candidate
    candidate = `${desired}-${n}`
    n += 1
  }
  // Defensive fallback — extremely unlikely.
  return `${desired}-${Date.now().toString(36)}`
}

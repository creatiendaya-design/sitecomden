import { notFound } from "next/navigation"
import { protectRoute } from "@/lib/protect-route"
import { prisma } from "@/lib/db"
import { getTheme } from "@/actions/themes"
import { listLandingTemplates } from "@/actions/landing-templates"
import { listPagesForThemePicker } from "@/actions/pages"
import { listMenusForThemePicker } from "@/actions/menus"
import {
  CustomizerShell,
  type EditableSurface,
} from "@/components/admin/customizer/CustomizerShell"
import type {
  BlockContentV2,
  BlockInstance,
  LandingBlockType as LandingBlockTypeUnion,
} from "@/lib/blocks/types"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: Promise<{ themeId: string }>
  searchParams: Promise<{ target?: string }>
}

/**
 * Plan 13/14 — Theme Customizer (Shopify-style split screen).
 *
 * The `?target=<key>` query controls which surface is being edited AND
 * which path the iframe loads. Defaults to "home". Switching the picker
 * in the toolbar reloads this server component with a new target so
 * block fetching stays server-side.
 *
 * Supported target kinds:
 *   - home / cart       → underlying Page in `Theme.homePageId/cartPageId`
 *   - page:<id>         → a specific static Page
 *   - category:<id>     → a Category landing — Plan 14 wired editing
 *   - other             → iframe-only preview (no left-side editor)
 */
export default async function CustomizeThemePage({
  params,
  searchParams,
}: RouteParams) {
  await protectRoute("themes:update")
  const [{ themeId }, { target }] = await Promise.all([params, searchParams])
  const targetKey = target ?? "home"

  const [
    theme,
    landingTemplates,
    pages,
    menus,
    sampleProduct,
    sampleCategory,
    activeCategories,
  ] = await Promise.all([
    getTheme(themeId),
    listLandingTemplates({ active: true }),
    listPagesForThemePicker(),
    listMenusForThemePicker(),
    prisma.product.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      select: { slug: true },
    }),
    prisma.category.findFirst({
      where: { active: true, parentId: null },
      orderBy: { order: "asc" },
      select: { slug: true },
    }),
    // Plan 14 — list all active root-level categories for the page picker.
    // We surface only top-level ones; sub-categories rarely have their
    // own landing blocks, and listing them all would clutter the dropdown.
    prisma.category.findMany({
      where: { active: true, parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
  ])

  if (!theme) notFound()

  // ---------- Resolve which surface (Page or Category) the target maps to ----------
  let editableSurface: EditableSurface | null = null
  let initialBlocks: BlockInstance[] = []

  const pageId = resolveEditablePageId(targetKey, theme)
  if (pageId) {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      include: { pageBlocks: { orderBy: { position: "asc" } } },
    })
    if (page) {
      editableSurface = {
        kind: "page",
        id: page.id,
        title: page.title,
      }
      initialBlocks = page.pageBlocks.map((b) => ({
        id: b.id,
        type: b.type as LandingBlockTypeUnion,
        position: b.position,
        content: b.content as unknown as BlockContentV2,
      }))
    }
  } else if (targetKey.startsWith("category:")) {
    const categoryId = targetKey.slice("category:".length)
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { categoryBlocks: { orderBy: { position: "asc" } } },
    })
    if (category) {
      editableSurface = {
        kind: "category",
        id: category.id,
        title: category.name,
      }
      initialBlocks = category.categoryBlocks.map((b) => ({
        id: b.id,
        type: b.type as LandingBlockTypeUnion,
        position: b.position,
        content: b.content as unknown as BlockContentV2,
      }))
    }
  }

  return (
    <CustomizerShell
      theme={theme}
      landingTemplates={landingTemplates}
      pages={pages}
      menus={menus}
      categoryTargets={activeCategories}
      sampleProductSlug={sampleProduct?.slug ?? null}
      sampleCategorySlug={sampleCategory?.slug ?? null}
      targetKey={targetKey}
      editableSurface={editableSurface}
      initialBlocks={initialBlocks}
    />
  )
}

/**
 * Maps a target key to the Page id whose blocks the editor should
 * manipulate. Returns null when the target doesn't map to a Page.
 * Category targets are handled separately by the caller.
 */
function resolveEditablePageId(
  targetKey: string,
  theme: { homePageId: string | null; cartPageId: string | null },
): string | null {
  if (targetKey === "home") return theme.homePageId
  if (targetKey === "cart") return theme.cartPageId
  if (targetKey.startsWith("page:")) return targetKey.slice("page:".length)
  return null
}

import { notFound } from "next/navigation"
import { protectRoute } from "@/lib/protect-route"
import { prisma } from "@/lib/db"
import { getTheme } from "@/actions/themes"
import { listLandingTemplates } from "@/actions/landing-templates"
import { listPagesForThemePicker } from "@/actions/pages"
import {
  listThemeSections,
  listProductSectionsForEditor,
} from "@/actions/theme-sections"
import { listProductTemplates } from "@/actions/theme-product-templates"
import { ensureCartMainBlock } from "@/lib/themes/ensure-cart-main-block"
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
  searchParams: Promise<{
    target?: string
    productTemplate?: string
    productId?: string
  }>
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
  const [{ themeId }, { target, productTemplate, productId }] =
    await Promise.all([params, searchParams])
  // Fase 3 — a productId forces the PRODUCT target (per-product override mode).
  const targetKey = productId ? "product" : (target ?? "home")

  const [
    theme,
    landingTemplates,
    pages,
    sampleProduct,
    sampleCategory,
    activeCategories,
  ] = await Promise.all([
    getTheme(themeId),
    listLandingTemplates({ active: true }),
    listPagesForThemePicker(),
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

  // Plan 19 — product templates: resolve which one the customizer edits.
  // `?productTemplate=<id>` selects a named template; default is the theme's
  // isDefault template. PRODUCT sections are then fetched scoped to it.
  const productTemplates = await listProductTemplates(theme.id)
  const activeProductTemplateId =
    (productTemplate &&
      productTemplates.find((t) => t.id === productTemplate)?.id) ||
    productTemplates.find((t) => t.isDefault)?.id ||
    productTemplates[0]?.id ||
    null

  // Fase 3 — per-product override mode: when `?productId=<id>` is present we
  // edit one product's section overrides (merged inherited + detached rows)
  // and preview that product. Otherwise we edit a shared template.
  let productOverride: { productId: string; productSlug: string } | null = null
  let overrideSections: Awaited<
    ReturnType<typeof listProductSectionsForEditor>
  >["sections"] | null = null
  if (productId) {
    const overrideProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    })
    if (overrideProduct) {
      const data = await listProductSectionsForEditor(productId)
      overrideSections = data.sections
      productOverride = { productId, productSlug: overrideProduct.slug }
    }
  }

  // Plan 16 — Fetch the ordered HEADER / FOOTER theme sections + the
  // per-theme section catalog. The customizer hydrates its zustand store
  // from these on mount; autosave round-trips replace tmp- ids on next
  // server render via router.refresh().
  const [headerSections, footerSections, templateProductSections, collectionSections] =
    await Promise.all([
      listThemeSections(theme.id, "HEADER"),
      listThemeSections(theme.id, "FOOTER"),
      listThemeSections(theme.id, "PRODUCT", activeProductTemplateId),
      listThemeSections(theme.id, "COLLECTION"),
    ])
  // In override mode the PRODUCT zone shows the product's merged sections.
  const productSections = overrideSections ?? templateProductSections
  const sectionCatalog = theme.sectionCatalog

  // ---------- Resolve which surface (Page or Category) the target maps to ----------
  let editableSurface: EditableSurface | null = null
  let initialBlocks: BlockInstance[] = []

  const pageId = resolveEditablePageId(targetKey, theme)
  if (pageId) {
    // Cart pages created before CART_MAIN existed have no skeleton block —
    // appending one here lets the customizer's sidebar surface it on the
    // very same render. The helper is idempotent, so this is a no-op when
    // the block is already there.
    if (targetKey === "cart") {
      await ensureCartMainBlock(pageId)
    }
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
        version: b.version,
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
        version: b.version,
      }))
    }
  }

  return (
    <CustomizerShell
      theme={theme}
      landingTemplates={landingTemplates}
      pages={pages}
      categoryTargets={activeCategories}
      sampleProductSlug={sampleProduct?.slug ?? null}
      sampleCategorySlug={sampleCategory?.slug ?? null}
      targetKey={targetKey}
      editableSurface={editableSurface}
      initialBlocks={initialBlocks}
      headerSections={headerSections}
      footerSections={footerSections}
      productSections={productSections}
      collectionSections={collectionSections}
      productTemplates={productTemplates}
      activeProductTemplateId={activeProductTemplateId}
      productOverride={productOverride}
      sectionCatalog={sectionCatalog}
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

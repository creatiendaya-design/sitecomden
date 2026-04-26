import { notFound } from "next/navigation"
import { protectRoute } from "@/lib/protect-route"
import { prisma } from "@/lib/db"
import { getTheme } from "@/actions/themes"
import { listLandingTemplates } from "@/actions/landing-templates"
import { listPagesForThemePicker } from "@/actions/pages"
import { listMenusForThemePicker } from "@/actions/menus"
import { CustomizerShell } from "@/components/admin/customizer/CustomizerShell"
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
 * Plan 13 — Theme Customizer (Shopify-style split screen).
 *
 * The `?target=<key>` query controls which page's blocks are being edited
 * AND which path the iframe loads. Defaults to "home". Switching the
 * picker in the toolbar reloads this server component with a new target,
 * so block fetching stays server-side and the iframe URL updates in sync.
 */
export default async function CustomizeThemePage({
  params,
  searchParams,
}: RouteParams) {
  await protectRoute("themes:update")
  const [{ themeId }, { target }] = await Promise.all([params, searchParams])
  const targetKey = target ?? "home"

  const [theme, landingTemplates, pages, menus, sampleProduct, sampleCategory] =
    await Promise.all([
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
    ])

  if (!theme) notFound()

  // Resolve which Page (if any) is the target's underlying record. Only
  // certain targets map to an editable Page in our data model:
  //   - home → theme.homePageId
  //   - cart → theme.cartPageId
  //   - page:<id> → that specific Page
  // Other targets (products, category) don't have block-level editing in
  // v1 — the customizer for those just shows the iframe, no left editor.
  const editablePageId = resolveEditablePageId(targetKey, theme)
  const editablePage = editablePageId
    ? await prisma.page.findUnique({
        where: { id: editablePageId },
        include: { pageBlocks: { orderBy: { position: "asc" } } },
      })
    : null

  const initialBlocks: BlockInstance[] = editablePage
    ? editablePage.pageBlocks.map((b) => ({
        id: b.id,
        type: b.type as LandingBlockTypeUnion,
        position: b.position,
        // Stored Json doesn't statically overlap BlockContentV2; pass
        // through unknown for the cast. Runtime shape is enforced by the
        // saver, which writes via SchemaForm-validated content.
        content: b.content as unknown as BlockContentV2,
      }))
    : []

  return (
    <CustomizerShell
      theme={theme}
      landingTemplates={landingTemplates}
      pages={pages}
      menus={menus}
      sampleProductSlug={sampleProduct?.slug ?? null}
      sampleCategorySlug={sampleCategory?.slug ?? null}
      targetKey={targetKey}
      editablePageId={editablePageId}
      editablePageTitle={editablePage?.title ?? null}
      initialBlocks={initialBlocks}
    />
  )
}

/**
 * Maps a target key to the Page id whose blocks the editor should
 * manipulate. Returns null when the target doesn't map to a Page (e.g.
 * "products-index" — that's a system route, not a page-builder page).
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

import { getMenuById } from "@/lib/menus/get-menu-by-id"
import type { ResolvedMenu } from "@/lib/menus/resolve-menu"
import { SectionWrapper } from "../_helpers"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import { LinkColumnBlock, type LinkColumnContent } from "./blocks/LinkColumnBlock"
import { TextColumnBlock } from "./blocks/TextColumnBlock"
import { NewsletterBlock } from "./blocks/NewsletterBlock"
import { ImageBlock } from "./blocks/ImageBlock"
import { SocialBlock } from "./blocks/SocialBlock"
import { RichTextBlock } from "./blocks/RichTextBlock"
import { PaymentIconsBlock } from "./blocks/PaymentIconsBlock"
import { CopyrightBlock } from "./blocks/CopyrightBlock"

interface Props {
  section: ResolvedThemeSection
}

/**
 * Footer layout setting. Drives both the parent grid template AND the
 * per-block span (NEWSLETTER, RICH_TEXT_BLOCK choose how many cells
 * they consume based on this value).
 */
export type FooterLayout = "auto" | "2" | "3" | "4" | "5"

interface FooterRootContent {
  /** "auto" → responsive grid (1 → 2 → 4 cols by breakpoint).
   *  Numeric → that many columns on desktop (still collapses on mobile). */
  layout?: FooterLayout
}

/**
 * "Column"-style blocks: rendered inside the grid at the top of the
 * footer (each one becomes a grid cell).
 */
const COLUMN_TYPES = new Set([
  "LINK_COLUMN",
  "TEXT_COLUMN",
  "NEWSLETTER",
  "RICH_TEXT_BLOCK",
  "IMAGE",
])

/**
 * "Bar"-style blocks: rendered full-width below the column grid, in
 * order, separated by a thin divider.
 */
const BAR_TYPES = new Set(["SOCIAL", "PAYMENT_ICONS", "COPYRIGHT"])

const LAYOUT_GRID_CLASS: Record<FooterLayout, string> = {
  auto: "grid gap-8 sm:grid-cols-2 lg:grid-cols-4",
  "2": "grid gap-8 sm:grid-cols-2",
  "3": "grid gap-8 sm:grid-cols-2 lg:grid-cols-3",
  "4": "grid gap-8 sm:grid-cols-2 lg:grid-cols-4",
  "5": "grid gap-8 sm:grid-cols-2 lg:grid-cols-5",
}

/**
 * Phase 3 of the Shopify-style footer refactor — the single parent
 * footer renderer. Reads its children from `section.blocks` and
 * dispatches each one to the right sub-block component, splitting them
 * into two visual rows:
 *
 *   - Columns (LINK_COLUMN / TEXT_COLUMN / NEWSLETTER / RICH_TEXT_BLOCK):
 *     inside a responsive grid at the top.
 *   - Bars (SOCIAL / PAYMENT_ICONS / COPYRIGHT): stacked below the grid,
 *     each one full-width.
 *
 * Menu lookups for every LINK_COLUMN are deduped and parallelized so we
 * never N+1 the DB.
 */
export async function FooterRoot({ section }: Props) {
  const data = section.content as FooterRootContent
  const layout = data.layout ?? "auto"

  const columnBlocks = section.blocks.filter((b) => COLUMN_TYPES.has(b.type))
  const barBlocks = section.blocks.filter((b) => BAR_TYPES.has(b.type))

  // Parallel + deduped menu resolution for every LINK_COLUMN.
  const menuIds = columnBlocks
    .filter((b) => b.type === "LINK_COLUMN")
    .map((b) => (b.content as LinkColumnContent).menuId)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
  const uniqueIds = Array.from(new Set(menuIds))
  const resolved = await Promise.all(
    uniqueIds.map((id) => getMenuById(id)),
  )
  const menuById = new Map<string, ResolvedMenu>(
    resolved
      .filter((m): m is ResolvedMenu => m !== null)
      .map((m) => [m.id, m]),
  )

  return (
    <SectionWrapper section={section} as="div">
      {/* The SectionWrapper paints the section's bg/scheme full-width
       *  (block element with no width constraint). The inner container
       *  centers the content and adds horizontal padding so text /
       *  columns never touch the viewport edges. Splitting them this
       *  way is what makes the color scheme reach the page laterals,
       *  matching Shopify's "section background" behavior. */}
      <div className="container mx-auto px-4 py-8">
        {columnBlocks.length > 0 && (
          <div className={LAYOUT_GRID_CLASS[layout]}>
            {columnBlocks.map((block) => {
              if (block.type === "LINK_COLUMN") {
                const c = block.content as LinkColumnContent
                const menu = c.menuId ? (menuById.get(c.menuId) ?? null) : null
                return <LinkColumnBlock key={block.id} block={block} menu={menu} />
              }
              if (block.type === "TEXT_COLUMN") {
                return <TextColumnBlock key={block.id} block={block} />
              }
              if (block.type === "NEWSLETTER") {
                return <NewsletterBlock key={block.id} block={block} />
              }
              if (block.type === "RICH_TEXT_BLOCK") {
                return <RichTextBlock key={block.id} block={block} />
              }
              if (block.type === "IMAGE") {
                return <ImageBlock key={block.id} block={block} />
              }
              return null
            })}
          </div>
        )}

        {barBlocks.length > 0 && (
          <div
            className={
              columnBlocks.length > 0
                ? "mt-8 pt-6 border-t border-current/10 space-y-4"
                : "space-y-4"
            }
          >
            {barBlocks.map((block) => {
              if (block.type === "SOCIAL") {
                return <SocialBlock key={block.id} block={block} />
              }
              if (block.type === "PAYMENT_ICONS") {
                return <PaymentIconsBlock key={block.id} block={block} />
              }
              if (block.type === "COPYRIGHT") {
                return <CopyrightBlock key={block.id} block={block} />
              }
              return null
            })}
          </div>
        )}
      </div>
    </SectionWrapper>
  )
}

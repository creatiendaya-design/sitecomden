import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

/**
 * Wrappers that bake in the customizer live-preview conventions so a
 * developer writing a new theme section / sub-block doesn't have to
 * remember the `data-preview-target`, `data-color-scheme`,
 * `data-content-array`, and `data-content-index` attributes. Forgetting
 * any of those breaks live preview silently — the renderer still works
 * on the storefront, but the customizer iframe stays stale until the
 * autosave round-trip.
 *
 * Use these wrappers in every new theme section. They are intentionally
 * thin — they only inject the attributes the live-preview hook in
 * `components/admin/customizer/useLivePreviewOverrides.ts` looks for,
 * plus the same className/style that `applyThemeSectionStyle` returns.
 * Nothing else.
 */

type SectionTag = "div" | "nav" | "footer" | "aside" | "header" | "section"

interface SectionWrapperProps {
  section: ResolvedThemeSection
  /** Defaults to "div" — pick the right semantic tag for the section
   *  (e.g. "nav" for MegaMenu, "footer" for footer-level sections). */
  as?: SectionTag
  /** Extra classes merged AFTER the resolved style classes so the
   *  caller can layer layout / spacing without losing the style zone's
   *  output. */
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * Outer wrapper for every theme section renderer. Auto-emits:
 *  - `data-preview-target={`section:${section.id}`}`
 *  - `data-color-scheme={<scheme>}` (when set)
 *  - `className` / `style` derived from `section.content.style`
 *
 * Usage:
 *   <SectionWrapper section={section} as="nav" className="border-t">
 *     ...
 *   </SectionWrapper>
 */
export function SectionWrapper({
  section,
  as = "div",
  className,
  style,
  children,
}: SectionWrapperProps) {
  const {
    className: styleClass,
    style: resolvedStyle,
    dataColorScheme,
  } = applyThemeSectionStyle(section.content.style)
  const Tag = as
  return (
    <Tag
      className={cn(className, styleClass)}
      style={{ ...resolvedStyle, ...style }}
      data-color-scheme={dataColorScheme}
      data-preview-target={`section:${section.id}`}
    >
      {children}
    </Tag>
  )
}

interface SubBlockWrapperProps {
  block: { id: string }
  as?: SectionTag
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * Wrapper for each sub-block inside a theme section (e.g. a MegaMenu
 * panel, a FooterColumns link column). Auto-emits
 * `data-preview-target={`subblock:${block.id}`}` so the live-preview
 * hook can sync the sub-block's own content fields independently of
 * the parent section.
 *
 * Usage:
 *   {section.blocks.map((block) => (
 *     <SubBlockWrapper key={block.id} block={block} className="...">
 *       ...
 *     </SubBlockWrapper>
 *   ))}
 */
export function SubBlockWrapper({
  block,
  as = "div",
  className,
  style,
  children,
}: SubBlockWrapperProps) {
  const Tag = as
  return (
    <Tag
      className={className}
      style={style}
      data-preview-target={`subblock:${block.id}`}
    >
      {children}
    </Tag>
  )
}

type ArrayItemTag = "div" | "li" | "article" | "section"

interface ArrayItemProps {
  /** The field name on the parent content where the array lives
   *  (e.g. "items" for `data.items`, "links" for `panel.links`). */
  array: string
  index: number
  as?: ArrayItemTag
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * Wrapper for each item in a repeatable field (testimonials, badges,
 * links, columns, etc.). Auto-emits
 * `data-content-array="<arrayKey>"` and `data-content-index="<i>"` so
 * the live-preview hook resolves any `data-content-field` descendants
 * against `data[arrayKey][i]` instead of the top-level data.
 *
 * Usage:
 *   {items.map((item, i) => (
 *     <ArrayItem key={item.id} array="items" index={i} as="article">
 *       <span data-content-field="title">{item.title}</span>
 *     </ArrayItem>
 *   ))}
 */
export function ArrayItem({
  array,
  index,
  as = "div",
  className,
  style,
  children,
}: ArrayItemProps) {
  const Tag = as
  return (
    <Tag
      className={className}
      style={style}
      data-content-array={array}
      data-content-index={index}
    >
      {children}
    </Tag>
  )
}

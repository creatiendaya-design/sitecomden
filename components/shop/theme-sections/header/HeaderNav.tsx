import { HeaderNavMenu } from "@/components/shop/HeaderNavMenu"
import { getMenuBySlug } from "@/lib/menus/get-menu-by-slug"
import { getMenuById } from "@/lib/menus/get-menu-by-id"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface HeaderNavContent {
  menuId?: string | null
}

export async function HeaderNav({ section }: Props) {
  const data = section.content as HeaderNavContent
  const menu = data.menuId
    ? ((await getMenuById(data.menuId)) ?? (await getMenuBySlug("main")))
    : await getMenuBySlug("main")
  const items = menu?.items ?? []
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  return (
    <div
      className={`hidden md:block border-t ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
    >
      <div className="container mx-auto px-4">
        {items.length > 0 ? <HeaderNavMenu items={items} /> : null}
      </div>
    </div>
  )
}

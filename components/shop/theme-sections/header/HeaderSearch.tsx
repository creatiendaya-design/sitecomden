import SearchBar from "@/components/shop/SearchBar"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

export function HeaderSearch({ section }: Props) {
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  return (
    <div
      className={`container mx-auto px-4 py-2 ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
    >
      <SearchBar />
    </div>
  )
}

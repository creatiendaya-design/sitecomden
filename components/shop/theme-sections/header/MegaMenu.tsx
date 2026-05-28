import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import { MegaPanel, type MegaPanelContent } from "./MegaPanel"

interface Props {
  section: ResolvedThemeSection
}

export function MegaMenu({ section }: Props) {
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  return (
    <nav
      className={`hidden md:flex border-t justify-center gap-8 ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
      data-preview-target={`section:${section.id}`}
    >
      {section.blocks.map((block) => (
        <MegaPanel
          key={block.id}
          blockId={block.id}
          panel={block.content as MegaPanelContent}
        />
      ))}
    </nav>
  )
}

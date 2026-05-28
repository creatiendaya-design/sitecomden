import { getSiteSettings } from "@/lib/site-settings"
import { SubBlockWrapper } from "../../_helpers"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"

interface Props {
  block: ResolvedThemeSectionBlock
}

interface CopyrightContent {
  text?: string
}

export async function CopyrightBlock({ block }: Props) {
  const settings = await getSiteSettings()
  const data = block.content as CopyrightContent
  const text = (
    data.text ?? "© {{year}} {{siteName}}. Todos los derechos reservados."
  )
    .replace("{{year}}", String(new Date().getFullYear()))
    .replace("{{siteName}}", settings.site_name)
  return (
    <SubBlockWrapper block={block} className="text-center text-xs">
      {text}
    </SubBlockWrapper>
  )
}

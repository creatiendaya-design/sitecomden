import {
  Info,
  Truck,
  ShieldCheck,
  RotateCcw,
  Ruler,
  Package,
  Leaf,
  ChevronDown,
  type LucideIcon,
} from "lucide-react"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import RichTextContent from "@/components/RichTextContent"
import { SubBlockWrapper } from "../_helpers"

interface ProductCollapseRowProps {
  block: ResolvedThemeSectionBlock
}

interface ProductCollapseRowContent {
  icon?: string
  title?: string
  body?: string
  defaultOpen?: boolean
}

const ICON_MAP: Record<string, LucideIcon> = {
  info: Info,
  truck: Truck,
  "shield-check": ShieldCheck,
  "rotate-ccw": RotateCcw,
  ruler: Ruler,
  package: Package,
  leaf: Leaf,
}

/**
 * A single collapsible row — title + rich-text body. Multiple of these can
 * stack inside PRODUCT_MAIN to surface specifications, shipping/return
 * policies, materials, etc. Uses the native HTML <details> element so we
 * don't need to ship JS for the toggle.
 */
export function ProductCollapseRow({ block }: ProductCollapseRowProps) {
  const content = block.content as ProductCollapseRowContent
  const iconKey = content.icon?.trim() ?? ""
  const title = content.title?.trim() ?? ""
  const body = content.body?.trim() ?? ""
  const defaultOpen = content.defaultOpen ?? false
  const Icon = iconKey ? ICON_MAP[iconKey] : undefined

  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )

  if (!title && !body) return null

  return (
    <SubBlockWrapper
      block={block}
      className={className}
      style={style}
      colorScheme={dataColorScheme}
    >
      <details
        open={defaultOpen}
        className="group border-t border-current/10 last:border-b py-3"
      >
        <summary className="flex items-center gap-2 cursor-pointer list-none select-none">
          {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
          <span
            className="text-sm font-medium flex-1"
            data-content-field="title"
          >
            {title}
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        {body && (
          <div className="mt-3 text-sm leading-relaxed opacity-90">
            <RichTextContent content={body} />
          </div>
        )}
      </details>
    </SubBlockWrapper>
  )
}

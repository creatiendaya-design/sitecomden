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
import type { ProductForRender } from "./types"

interface ProductCollapseRowProps {
  block: ResolvedThemeSectionBlock
  product: ProductForRender
}

interface ProductCollapseRowContent {
  icon?: string
  title?: string
  body?: string
  /** When set to "product-description", the row pulls its body from the
   *  current product's long description instead of the manual `body`
   *  field. Default (or absent) is "manual" — preserves the original
   *  behavior for legacy rows persisted before this field existed. */
  bodySource?: "manual" | "product-description"
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
export function ProductCollapseRow({
  block,
  product,
}: ProductCollapseRowProps) {
  const content = block.content as ProductCollapseRowContent
  const iconKey = content.icon?.trim() ?? ""
  const title = content.title?.trim() ?? ""
  // `bodySource` chooses between the row's own manual rich-text and the
  // product's long description. Defaulting to "manual" keeps every
  // legacy row (persisted before the field existed) painting exactly
  // the same content as before.
  const bodySource = content.bodySource ?? "manual"
  const manualBody = content.body?.trim() ?? ""
  const body =
    bodySource === "product-description"
      ? (product.description?.trim() ?? "")
      : manualBody
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

import {
  Truck,
  ShieldCheck,
  RotateCcw,
  CreditCard,
  Award,
  Clock,
  Headphones,
  Lock,
  Package,
  Leaf,
  type LucideIcon,
} from "lucide-react"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { SubBlockWrapper, ArrayItem } from "../_helpers"

interface ProductTrustBadgesProps {
  block: ResolvedThemeSectionBlock
}

interface TrustBadgeItem {
  icon?: string
  label?: string
  helpText?: string
}

interface ProductTrustBadgesContent {
  layout?: "horizontal" | "vertical" | "grid"
  items?: TrustBadgeItem[]
}

const ICON_MAP: Record<string, LucideIcon> = {
  truck: Truck,
  "shield-check": ShieldCheck,
  "rotate-ccw": RotateCcw,
  "credit-card": CreditCard,
  award: Award,
  clock: Clock,
  headphones: Headphones,
  lock: Lock,
  package: Package,
  leaf: Leaf,
}

export function ProductTrustBadges({ block }: ProductTrustBadgesProps) {
  const content = block.content as ProductTrustBadgesContent
  const layout = content.layout ?? "horizontal"
  const items = (content.items ?? []).filter((it) => it.label?.trim())
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )

  if (items.length === 0) return null

  const containerClass =
    layout === "vertical"
      ? "flex flex-col gap-3"
      : layout === "grid"
        ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
        : "flex flex-wrap gap-4"

  return (
    <SubBlockWrapper
      block={block}
      className={className}
      style={style}
      colorScheme={dataColorScheme}
    >
      <ul className={containerClass}>
        {items.map((item, i) => {
          const Icon = item.icon ? ICON_MAP[item.icon] : undefined
          return (
            <ArrayItem
              key={i}
              array="items"
              index={i}
              as="li"
              className="flex items-start gap-3"
            >
              {Icon && (
                <span className="shrink-0 mt-0.5">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
              <div className="flex flex-col">
                <span
                  className="text-sm font-medium leading-tight"
                  data-content-field="label"
                >
                  {item.label}
                </span>
                {item.helpText && (
                  <span
                    className="text-xs opacity-70 leading-tight mt-0.5"
                    data-content-field="helpText"
                  >
                    {item.helpText}
                  </span>
                )}
              </div>
            </ArrayItem>
          )
        })}
      </ul>
    </SubBlockWrapper>
  )
}

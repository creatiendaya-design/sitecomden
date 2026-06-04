"use client"

import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import { SubBlockWrapper } from "../_helpers"
import { useProductContext } from "./ProductContext"

interface ProductPriceProps {
  block: ResolvedThemeSectionBlock
}

interface ProductPriceContent {
  showCompareAt?: boolean
  showSavingsBadge?: boolean
  currencyPosition?: "before" | "after"
}

export function ProductPrice({ block }: ProductPriceProps) {
  const { currentPrice, currentComparePrice } = useProductContext()
  const content = block.content as ProductPriceContent
  const showCompareAt = content.showCompareAt ?? true
  const showSavings = content.showSavingsBadge ?? true
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )

  const hasCompare =
    showCompareAt &&
    currentComparePrice !== null &&
    currentComparePrice > currentPrice
  const discountPct = hasCompare
    ? Math.round(
        ((currentComparePrice - currentPrice) / currentComparePrice) * 100,
      )
    : 0

  return (
    <SubBlockWrapper
      block={block}
      className={className}
      style={style}
      colorScheme={dataColorScheme}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="text-3xl font-bold product-price-current"
          style={{ color: "var(--theme-regular-price, inherit)" }}
        >
          {formatPrice(currentPrice)}
        </span>
        {hasCompare && (
          <>
            <span
              className="text-xl line-through opacity-60 product-price-compare"
              style={{ color: "var(--theme-compare-price, inherit)" }}
            >
              {formatPrice(currentComparePrice)}
            </span>
            {showSavings && discountPct > 0 && (
              <Badge
                className="border-transparent"
                style={{
                  backgroundColor: "var(--theme-badge-bg, #dc2626)",
                  color: "var(--theme-badge-text, #ffffff)",
                }}
              >
                {discountPct}% OFF
              </Badge>
            )}
          </>
        )}
      </div>
    </SubBlockWrapper>
  )
}

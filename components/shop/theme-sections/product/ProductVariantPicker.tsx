"use client"

import { useEffect } from "react"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import ProductOptions from "@/components/shop/ProductOptions"
import { SubBlockWrapper } from "../_helpers"
import { useProductContext } from "./ProductContext"

interface ProductVariantPickerProps {
  block: ResolvedThemeSectionBlock
}

interface ProductVariantPickerContent {
  swatchSize?: "sm" | "md" | "lg"
  showLabels?: boolean
  outOfStockBehavior?: "disable" | "hide" | "badge"
}

/**
 * Renders the option (color/size/etc.) selectors and keeps the selected
 * variant in ProductContext in sync with the chosen options. Falls back
 * to reusing the existing `ProductOptions` component so the swatch UX
 * is identical to the legacy product page.
 */
export function ProductVariantPicker({ block }: ProductVariantPickerProps) {
  const {
    options,
    variants,
    selectedOptions,
    setSelectedOptions,
    setSelectedVariant,
    hasVariants,
  } = useProductContext()

  const _content = block.content as ProductVariantPickerContent
  // swatchSize / showLabels / outOfStockBehavior reserved for a future
  // pass — ProductOptions today renders one fixed style.
  void _content

  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )

  // Whenever the chosen options form a complete combination, find the
  // matching variant and push it into context. Other sub-blocks (Price,
  // BuyButton) react via their own consumers.
  useEffect(() => {
    if (!hasVariants) return
    const allChosen =
      options.length > 0 &&
      options.every((o) => Boolean(selectedOptions[o.name]))
    if (!allChosen) {
      setSelectedVariant(null)
      return
    }
    const match = variants.find((v) =>
      Object.entries(selectedOptions).every(
        ([key, value]) => v.options[key] === value,
      ),
    )
    setSelectedVariant(match ?? null)
  }, [selectedOptions, options, variants, hasVariants, setSelectedVariant])

  if (!hasVariants || options.length === 0) return null

  const handleOptionChange = (optionId: string, valueId: string) => {
    // ProductOptions stores by optionId/valueId, but variants match by
    // option.name → value.value. Translate both sides.
    const option = options.find((o) => o.id === optionId)
    const value = option?.values.find((v) => v.id === valueId)
    if (!option || !value) return
    setSelectedOptions({ ...selectedOptions, [option.name]: value.value })
  }

  // Translate value-based selectedOptions back to id-based for ProductOptions.
  const selectedOptionsById: Record<string, string> = {}
  for (const option of options) {
    const chosenValueString = selectedOptions[option.name]
    if (!chosenValueString) continue
    const match = option.values.find((v) => v.value === chosenValueString)
    if (match) selectedOptionsById[option.id] = match.id
  }

  return (
    <SubBlockWrapper
      block={block}
      className={className}
      style={style}
      colorScheme={dataColorScheme}
    >
      <ProductOptions
        options={options}
        selectedOptions={selectedOptionsById}
        onOptionChange={handleOptionChange}
      />
    </SubBlockWrapper>
  )
}

import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { SubBlockWrapper } from "../_helpers"
import type { ProductForRender } from "./types"

interface ProductMetaProps {
  block: ResolvedThemeSectionBlock
  product: ProductForRender
}

interface ProductMetaContent {
  heading?: string
  showSku?: boolean
  showWeight?: boolean
  showAvailability?: boolean
  showBrand?: boolean
  showCategories?: boolean
}

/**
 * Replaces the `<div className="rounded-lg bg-slate-50 ...">` block of the
 * legacy `ProductStandardView`. No hardcoded colors — visuals come from
 * the active color scheme (via `data-color-scheme`) so the admin can
 * recolor this box without touching code.
 */
export function ProductMeta({ block, product }: ProductMetaProps) {
  const content = block.content as ProductMetaContent
  const heading = content.heading?.trim() || "Información del producto"
  const showSku = content.showSku ?? true
  const showWeight = content.showWeight ?? true
  const showAvailability = content.showAvailability ?? true
  const showBrand = content.showBrand ?? false
  const showCategories = content.showCategories ?? false
  const inStock = product.stock > 0

  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )

  const rows: Array<{ key: string; label: string; value: string }> = []
  if (showSku && product.sku) {
    rows.push({ key: "sku", label: "SKU", value: product.sku })
  }
  if (showWeight && product.weight) {
    rows.push({
      key: "weight",
      label: "Peso",
      value: `${Number(product.weight)} kg`,
    })
  }
  if (showAvailability) {
    rows.push({
      key: "availability",
      label: "Disponibilidad",
      value: inStock ? "En stock" : "Agotado",
    })
  }
  if (showCategories && product.categories.length > 0) {
    rows.push({
      key: "categories",
      label: "Categorías",
      value: product.categories.map((pc) => pc.category.name).join(", "),
    })
  }

  if (rows.length === 0) return null

  return (
    <SubBlockWrapper
      block={block}
      className={className}
      style={style}
      colorScheme={dataColorScheme}
    >
      <div className="rounded-lg p-4 sm:p-6 space-y-3 product-meta-box">
        <h3
          className="font-semibold text-base sm:text-lg"
          data-content-field="heading"
        >
          {heading}
        </h3>
        <dl className="space-y-2 text-sm sm:text-base">
          {rows.map((r) => (
            <div key={r.key} className="flex justify-between gap-4">
              <dt className="opacity-70">{r.label}:</dt>
              <dd className="font-medium text-right break-all">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {/* Note: showBrand is reserved for future use when Product.brand exists. */}
      {showBrand && null}
    </SubBlockWrapper>
  )
}

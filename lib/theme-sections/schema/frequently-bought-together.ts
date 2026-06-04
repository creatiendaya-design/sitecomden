import { ShoppingBasket } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

/**
 * PRODUCT-group section that shows products frequently bought together with
 * the current one. Like PRODUCT_REVIEWS, the CONTENT is not authored in the
 * customizer — it comes from the hybrid recommender (manual curation →
 * co-purchase → same-category). The fields below only control presentation.
 *
 * Combo discounts are intentionally NOT a field here: they belong to the
 * BUNDLE promotion engine (server-validated). See /admin/promociones.
 */
export const frequentlyBoughtTogetherDefinition: ThemeSectionDefinition = {
  type: "FREQUENTLY_BOUGHT_TOGETHER",
  groups: ["PRODUCT"],
  label: "Comprados juntos",
  description:
    "Muestra productos que suelen comprarse junto al actual. El contenido se llena solo (selección manual del producto, o automáticamente por compras reales y categoría). Acá controlás cómo se ve.",
  icon: ShoppingBasket,
  fields: [
    {
      type: "text",
      key: "heading",
      label: "Título",
      placeholder: "Comprados juntos",
    },
    {
      type: "select",
      key: "mode",
      label: "Cómo se agregan",
      options: [
        { value: "add_all", label: "Combo: agregar todos" },
        { value: "individual", label: "Botón por producto" },
      ],
    },
    {
      type: "number",
      key: "limit",
      label: "Productos a mostrar",
      helpText: "Cuántas recomendaciones traer (sin contar el producto actual).",
      min: 1,
      max: 8,
    },
  ],
  defaultContent: {
    heading: "Comprados juntos",
    mode: "add_all",
    limit: 3,
  },
}

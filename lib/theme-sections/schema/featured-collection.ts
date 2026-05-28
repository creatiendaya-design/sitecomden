import { Boxes } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const featuredCollectionDefinition: ThemeSectionDefinition = {
  type: "FEATURED_COLLECTION",
  groups: ["PRODUCT"],
  label: "Colección destacada",
  description:
    "Lista de productos relacionados o destacados (misma categoría, elección manual, más vendidos, vistos recientemente).",
  icon: Boxes,
  fields: [
    {
      type: "text",
      key: "heading",
      label: "Título",
      placeholder: "También te puede interesar",
    },
    {
      type: "select",
      key: "source",
      label: "Origen de los productos",
      options: [
        { value: "same_category", label: "Misma categoría" },
        { value: "manual_picks", label: "Selección manual" },
        { value: "best_sellers", label: "Más vendidos" },
        { value: "recently_viewed", label: "Vistos recientemente" },
      ],
    },
    {
      type: "product-picker",
      key: "productIds",
      label: "Productos a mostrar",
      multiple: true,
      showWhen: { field: "source", equals: "manual_picks" },
      helpText: "Hasta 12 productos seleccionados manualmente.",
    },
    {
      type: "number",
      key: "limit",
      label: "Cantidad máxima",
      min: 1,
      max: 24,
    },
    {
      type: "select",
      key: "layout",
      label: "Diseño",
      options: [
        { value: "grid", label: "Cuadrícula" },
        { value: "carousel", label: "Carrusel" },
      ],
    },
  ],
  defaultContent: {
    heading: "También te puede interesar",
    source: "same_category",
    productIds: [],
    limit: 8,
    layout: "grid",
  },
}

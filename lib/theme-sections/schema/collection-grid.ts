import { LayoutGrid } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

/**
 * Plan 19 — COLLECTION_GRID is the backbone section of the products-index
 * template (`/productos`). It renders the heading, the optional category
 * sidebar + sort toolbar, and the actual product grid (the data is supplied
 * by the page, not the section — the section only carries presentation
 * choices). Obligatory + unique per theme (maxPerGroup 1); the customizer
 * locks it against deletion (but allows reordering so banners can sit above
 * or below it).
 */
export const collectionGridDefinition: ThemeSectionDefinition = {
  type: "COLLECTION_GRID",
  groups: ["COLLECTION"],
  label: "Cuadrícula de productos",
  description:
    "Listado de productos con barra de categorías y ordenamiento. Sección principal del índice de productos.",
  icon: LayoutGrid,
  maxPerGroup: 1,
  fields: [
    {
      type: "text",
      key: "heading",
      label: "Título",
      placeholder: "Productos",
    },
    {
      type: "switch",
      key: "showCount",
      label: "Mostrar contador de productos",
    },
    {
      type: "switch",
      key: "showSidebar",
      label: "Mostrar barra de categorías",
    },
    {
      type: "switch",
      key: "showSort",
      label: "Mostrar ordenamiento",
    },
    {
      type: "range",
      key: "columnsDesktop",
      label: "Columnas (escritorio)",
      min: 2,
      max: 5,
      step: 1,
      defaultValue: 3,
      unit: "col",
    },
    {
      type: "select",
      key: "columnsMobile",
      label: "Columnas (móvil)",
      options: [
        { value: 1, label: "1 columna" },
        { value: 2, label: "2 columnas" },
      ],
    },
  ],
  defaultContent: {
    heading: "Productos",
    showCount: true,
    showSidebar: true,
    showSort: true,
    columnsDesktop: 3,
    columnsMobile: 2,
    style: {},
  },
}

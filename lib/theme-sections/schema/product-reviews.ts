import { Star } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

/**
 * PRODUCT-group section that renders the current product's approved reviews
 * (rating summary + distribution bars + review list). Unlike TESTIMONIALS,
 * the content is NOT authored in the customizer — it comes from the
 * `ProductReview` rows for the product being viewed. The schema fields below
 * only control presentation (heading, which parts to show, how many to list).
 */
export const productReviewsDefinition: ThemeSectionDefinition = {
  type: "PRODUCT_REVIEWS",
  groups: ["PRODUCT"],
  label: "Reseñas del producto",
  description:
    "Muestra las reseñas aprobadas del producto actual: promedio de estrellas, desglose por puntuación y la lista de opiniones. El contenido se llena solo con las reseñas reales — acá controlás cómo se ve.",
  icon: Star,
  fields: [
    {
      type: "text",
      key: "heading",
      label: "Título",
      placeholder: "Reseñas de clientes",
    },
    {
      type: "switch",
      key: "showSummary",
      label: "Mostrar resumen (promedio + estrellas)",
    },
    {
      type: "switch",
      key: "showDistribution",
      label: "Mostrar desglose por puntuación (barras)",
      helpText:
        "Muestra cuántas reseñas hay de 5, 4, 3, 2 y 1 estrella con una barra de proporción.",
    },
    {
      type: "switch",
      key: "showWriteButton",
      label: "Mostrar botón “Escribir una reseña”",
    },
    {
      type: "text",
      key: "writeButtonText",
      label: "Texto del botón",
      placeholder: "Escribir una reseña",
      showWhen: { field: "showWriteButton", equals: true },
    },
    {
      type: "number",
      key: "limit",
      label: "Reseñas a mostrar",
      helpText: "Cuántas reseñas listar antes del botón “Ver más”.",
      min: 1,
      max: 50,
    },
    {
      type: "text",
      key: "emptyText",
      label: "Texto cuando no hay reseñas",
      placeholder: "Todavía no hay reseñas. ¡Sé el primero en opinar!",
    },
  ],
  defaultContent: {
    heading: "Reseñas de clientes",
    showSummary: true,
    showDistribution: true,
    showWriteButton: true,
    writeButtonText: "Escribir una reseña",
    limit: 5,
    emptyText: "Todavía no hay reseñas. ¡Sé el primero en opinar!",
  },
}

import { Image as ImageIcon } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

/**
 * "Footer banner" peer section — a full-width image+text CTA banner
 * that can sit above or below the unified FOOTER section. Common
 * Shopify use case: a "free shipping" or "follow us on Instagram"
 * banner separated from the structured footer content.
 */
export const footerBannerDefinition: ThemeSectionDefinition = {
  type: "FOOTER_BANNER",
  groups: ["FOOTER"],
  label: "Banner",
  description: "Imagen + texto + CTA en una franja de ancho completo.",
  icon: ImageIcon,
  maxPerGroup: 3,
  fields: [
    { type: "image", key: "image", label: "Imagen", deviceOverride: false },
    {
      type: "select",
      key: "imagePosition",
      label: "Posición de la imagen",
      options: [
        { value: "left", label: "Izquierda" },
        { value: "right", label: "Derecha" },
        { value: "background", label: "Fondo (con overlay)" },
      ],
    },
    {
      type: "text",
      key: "heading",
      label: "Título",
      placeholder: "Envíos gratis a todo Perú",
    },
    {
      type: "richtext",
      key: "body",
      label: "Texto",
    },
    {
      type: "text",
      key: "ctaLabel",
      label: "Texto del botón (CTA)",
      placeholder: "Ver más",
      helpText: "Dejá vacío para no mostrar botón.",
    },
    {
      type: "text",
      key: "ctaHref",
      label: "Enlace del botón",
      placeholder: "/productos",
    },
  ],
  defaultContent: {
    image: "",
    imagePosition: "left",
    heading: "",
    body: "",
    ctaLabel: "",
    ctaHref: "",
  },
}

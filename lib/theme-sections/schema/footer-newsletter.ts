import { Mail } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const footerNewsletterDefinition: ThemeSectionDefinition = {
  type: "FOOTER_NEWSLETTER",
  groups: ["FOOTER"],
  label: "Newsletter",
  description: "Captura de email con confirmación.",
  icon: Mail,
  maxPerGroup: 1,
  fields: [
    { type: "text", key: "title", label: "Título" },
    { type: "richtext", key: "description", label: "Descripción" },
    { type: "text", key: "buttonLabel", label: "Etiqueta del botón" },
    { type: "text", key: "successMessage", label: "Mensaje de éxito" },
  ],
  defaultContent: {
    title: "Suscribite a nuestro newsletter",
    description: "Enterate de novedades y promociones.",
    buttonLabel: "Suscribirme",
    successMessage: "¡Gracias por suscribirte!",
  },
}

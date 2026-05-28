import { Mail } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

/**
 * Standalone "Email signup" section for the FOOTER group.
 *
 * Different from the NEWSLETTER block that lives INSIDE the unified
 * FOOTER section: this one is its own peer section, full-width by
 * default, meant for sites that want a strong newsletter banner
 * separated from the footer's columns/links. Mirrors Shopify's
 * "Email signup" section.
 */
export const emailSignupDefinition: ThemeSectionDefinition = {
  type: "EMAIL_SIGNUP",
  groups: ["FOOTER"],
  label: "Email signup",
  description: "Banner de captura de email a todo lo ancho.",
  icon: Mail,
  maxPerGroup: 2,
  fields: [
    {
      type: "text",
      key: "heading",
      label: "Título",
      placeholder: "Suscribite a nuestro newsletter",
    },
    {
      type: "richtext",
      key: "description",
      label: "Descripción",
    },
    {
      type: "text",
      key: "placeholder",
      label: "Placeholder del email",
      placeholder: "tu@email.com",
    },
    {
      type: "text",
      key: "buttonLabel",
      label: "Etiqueta del botón",
      placeholder: "Suscribirme",
    },
    {
      type: "text",
      key: "successMessage",
      label: "Mensaje de éxito",
      placeholder: "¡Gracias por suscribirte!",
    },
    {
      type: "select",
      key: "alignment",
      label: "Alineación",
      options: [
        { value: "left", label: "Izquierda" },
        { value: "center", label: "Centro" },
      ],
    },
  ],
  defaultContent: {
    heading: "Suscribite a nuestro newsletter",
    description: "Enterate de novedades y promociones.",
    placeholder: "tu@email.com",
    buttonLabel: "Suscribirme",
    successMessage: "¡Gracias por suscribirte!",
    alignment: "center",
  },
}

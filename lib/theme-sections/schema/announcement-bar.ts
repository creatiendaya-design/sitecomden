import { Megaphone } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const announcementBarDefinition: ThemeSectionDefinition = {
  type: "ANNOUNCEMENT_BAR",
  groups: ["HEADER"],
  label: "Barra de anuncios",
  description: "Mensaje breve sobre el encabezado, opcionalmente clickeable.",
  icon: Megaphone,
  maxPerGroup: 3,
  fields: [
    { type: "text", key: "message", label: "Mensaje" },
    {
      type: "text",
      key: "linkHref",
      label: "Enlace (opcional)",
      helpText: "Si está presente, toda la barra se vuelve un link.",
    },
    { type: "switch", key: "openInNewTab", label: "Abrir en nueva pestaña" },
  ],
  defaultContent: {
    message: "Envío gratis a todo el Perú",
    linkHref: "",
    openInNewTab: false,
  },
}

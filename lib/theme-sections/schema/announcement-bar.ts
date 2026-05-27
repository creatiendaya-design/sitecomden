import { Megaphone } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"
import { LinkUrlField } from "@/components/admin/page-builder/forms/custom/LinkUrlField"

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
      type: "custom",
      key: "linkHref",
      label: "Enlace (opcional)",
      component: LinkUrlField,
      helpText: "Si está presente, toda la barra se vuelve un link.",
    },
    { type: "switch", key: "openInNewTab", label: "Abrir en nueva pestaña" },
  ],
  defaultContent: {
    message: "Envío gratis a todo el Perú",
    linkHref: "",
    openInNewTab: false,
  },
  // Full-width bar across the very top — alignment / corner radius /
  // border / shadow don't produce a useful visual effect on the wrapper.
  styleSupport: {
    alignment: false,
    cornerRadius: false,
    border: false,
    shadow: false,
  },
}

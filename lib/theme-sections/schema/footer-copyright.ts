import { Copyright } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const footerCopyrightDefinition: ThemeSectionDefinition = {
  type: "FOOTER_COPYRIGHT",
  groups: ["FOOTER"],
  label: "Copyright",
  icon: Copyright,
  maxPerGroup: 1,
  fields: [
    {
      type: "text",
      key: "text",
      label: "Texto",
      helpText:
        "Usá {{year}} para el año actual y {{siteName}} para el nombre de la tienda.",
    },
  ],
  defaultContent: {
    text: "© {{year}} {{siteName}}. Todos los derechos reservados.",
  },
}

import { Share2 } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const footerSocialDefinition: ThemeSectionDefinition = {
  type: "FOOTER_SOCIAL",
  groups: ["FOOTER"],
  label: "Redes sociales",
  description: "Iconos de redes sociales (lee de Site Settings).",
  icon: Share2,
  maxPerGroup: 1,
  fields: [{ type: "text", key: "title", label: "Título" }],
  defaultContent: { title: "Síguenos" },
}

import { Image as ImageIcon } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const headerLogoDefinition: ThemeSectionDefinition = {
  type: "HEADER_LOGO",
  groups: ["HEADER"],
  label: "Logo",
  description: "Solo el logo de la tienda. Útil cuando el nav va en su propia fila.",
  icon: ImageIcon,
  maxPerGroup: 1,
  fields: [],
  defaultContent: {},
}

import { Menu } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const headerNavDefinition: ThemeSectionDefinition = {
  type: "HEADER_NAV",
  groups: ["HEADER"],
  label: "Menú de navegación",
  icon: Menu,
  maxPerGroup: 1,
  fields: [{ type: "menu-picker", key: "menuId", label: "Menú a mostrar" }],
  defaultContent: {},
}

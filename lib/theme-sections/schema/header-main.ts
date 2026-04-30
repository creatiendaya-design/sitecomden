import { LayoutGrid } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const headerMainDefinition: ThemeSectionDefinition = {
  type: "HEADER_MAIN",
  groups: ["HEADER"],
  label: "Encabezado principal",
  description: "Logo, menú, buscador, sesión y carrito en una sola fila.",
  icon: LayoutGrid,
  maxPerGroup: 1,
  fields: [
    {
      type: "menu-picker",
      key: "menuId",
      label: "Menú a mostrar",
      helpText: "Si está vacío, usa el menú con slug 'main'.",
    },
    { type: "switch", key: "showSearch", label: "Mostrar buscador" },
    { type: "switch", key: "showAuth", label: "Mostrar acceso de cliente" },
    { type: "switch", key: "showCart", label: "Mostrar carrito" },
  ],
  defaultContent: {
    showSearch: true,
    showAuth: true,
    showCart: true,
  },
}

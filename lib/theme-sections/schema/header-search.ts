import { Search } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const headerSearchDefinition: ThemeSectionDefinition = {
  type: "HEADER_SEARCH",
  groups: ["HEADER"],
  label: "Buscador",
  icon: Search,
  maxPerGroup: 1,
  fields: [{ type: "text", key: "placeholder", label: "Placeholder" }],
  defaultContent: { placeholder: "Buscar productos…" },
}

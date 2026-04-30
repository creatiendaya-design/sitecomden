import { Columns, List, Type } from "lucide-react"
import type { ThemeSectionDefinition, ThemeSectionBlockDefinition } from "../types"

const linkColumnDefinition: ThemeSectionBlockDefinition = {
  type: "LINK_COLUMN",
  label: "Columna de enlaces",
  icon: List,
  maxPerSection: 6,
  fields: [
    { type: "text", key: "title", label: "Título de la columna" },
    { type: "menu-item-list", key: "links", label: "Enlaces", maxLinks: 15 },
  ],
  defaultContent: { title: "Tienda", links: [] },
}

const textColumnDefinition: ThemeSectionBlockDefinition = {
  type: "TEXT_COLUMN",
  label: "Columna de texto",
  icon: Type,
  maxPerSection: 3,
  fields: [
    { type: "text", key: "title", label: "Título" },
    { type: "richtext", key: "body", label: "Texto" },
  ],
  defaultContent: { title: "Sobre nosotros", body: "" },
}

export const footerColumnsDefinition: ThemeSectionDefinition = {
  type: "FOOTER_COLUMNS",
  groups: ["FOOTER"],
  label: "Columnas de enlaces",
  description: "Columnas de navegación y texto para el pie de página.",
  icon: Columns,
  maxPerGroup: 1,
  acceptedBlockTypes: [linkColumnDefinition, textColumnDefinition],
  fields: [
    { type: "text", key: "aboutTitle", label: "Título 'Sobre nosotros'" },
    { type: "richtext", key: "aboutText", label: "Texto descriptivo" },
  ],
  defaultContent: { aboutTitle: "", aboutText: "" },
  defaultBlocks: [
    { type: "TEXT_COLUMN", content: { title: "Sobre nosotros", body: "" } },
  ],
}

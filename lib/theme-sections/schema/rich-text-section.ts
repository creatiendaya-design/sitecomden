import { FileText } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const richTextSectionDefinition: ThemeSectionDefinition = {
  type: "RICH_TEXT_SECTION",
  groups: ["PRODUCT", "FOOTER", "COLLECTION"],
  label: "Texto enriquecido",
  description: "Bloque libre con Tiptap (encabezados, listas, enlaces).",
  icon: FileText,
  fields: [
    {
      type: "text",
      key: "heading",
      label: "Título (opcional)",
      placeholder: "",
    },
    { type: "richtext", key: "body", label: "Contenido" },
  ],
  defaultContent: { heading: "", body: "" },
}

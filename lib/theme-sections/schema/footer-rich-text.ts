import { FileText } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const footerRichTextDefinition: ThemeSectionDefinition = {
  type: "FOOTER_RICH_TEXT",
  groups: ["FOOTER"],
  label: "Texto enriquecido",
  description: "Bloque libre con Tiptap.",
  icon: FileText,
  fields: [{ type: "richtext", key: "body", label: "Contenido" }],
  defaultContent: { body: "" },
}

import { HelpCircle, MessageCircleQuestion } from "lucide-react"
import type {
  ThemeSectionDefinition,
  ThemeSectionBlockDefinition,
} from "../types"

const faqItemDefinition: ThemeSectionBlockDefinition = {
  type: "FAQ_ITEM",
  label: "Pregunta y respuesta",
  icon: MessageCircleQuestion,
  maxPerSection: 30,
  fields: [
    { type: "text", key: "question", label: "Pregunta" },
    { type: "richtext", key: "answer", label: "Respuesta" },
  ],
  defaultContent: { question: "", answer: "" },
}

export const faqSectionDefinition: ThemeSectionDefinition = {
  type: "FAQ_SECTION",
  groups: ["PRODUCT", "COLLECTION"],
  label: "Preguntas frecuentes",
  description: "Lista colapsable de preguntas y respuestas.",
  icon: HelpCircle,
  acceptedBlockTypes: [faqItemDefinition],
  fields: [
    {
      type: "text",
      key: "heading",
      label: "Título",
      placeholder: "Preguntas frecuentes",
    },
    {
      type: "switch",
      key: "allowMultipleOpen",
      label: "Permitir varias respuestas abiertas a la vez",
    },
    {
      type: "switch",
      key: "openFirstByDefault",
      label: "Iniciar con la primera respuesta abierta",
    },
  ],
  defaultContent: {
    heading: "Preguntas frecuentes",
    allowMultipleOpen: false,
    openFirstByDefault: false,
  },
  defaultBlocks: [
    { type: "FAQ_ITEM", content: { question: "", answer: "" } },
  ],
}

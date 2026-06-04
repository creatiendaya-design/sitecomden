import { MessageSquareQuote, Quote } from "lucide-react"
import type {
  ThemeSectionDefinition,
  ThemeSectionBlockDefinition,
} from "../types"

const testimonialItemDefinition: ThemeSectionBlockDefinition = {
  type: "TESTIMONIAL_ITEM",
  label: "Testimonio",
  icon: Quote,
  maxPerSection: 12,
  fields: [
    {
      type: "text",
      key: "name",
      label: "Nombre",
      placeholder: "María Pérez",
    },
    {
      type: "text",
      key: "role",
      label: "Cargo / Detalle (opcional)",
      placeholder: "Clienta verificada",
    },
    {
      type: "textarea",
      key: "quote",
      label: "Testimonio",
      rows: 3,
    },
    {
      type: "image",
      key: "avatar",
      label: "Foto / Avatar (opcional)",
      deviceOverride: false,
    },
  ],
  defaultContent: {
    name: "",
    role: "",
    quote: "",
    avatar: "",
  },
}

export const testimonialsDefinition: ThemeSectionDefinition = {
  type: "TESTIMONIALS",
  groups: ["PRODUCT", "COLLECTION"],
  label: "Testimonios",
  description: "Citas de clientes con foto opcional.",
  icon: MessageSquareQuote,
  acceptedBlockTypes: [testimonialItemDefinition],
  fields: [
    {
      type: "text",
      key: "heading",
      label: "Título",
      placeholder: "Lo que dicen nuestros clientes",
    },
    {
      type: "select",
      key: "layout",
      label: "Diseño",
      options: [
        { value: "grid", label: "Cuadrícula" },
        { value: "carousel", label: "Carrusel" },
        { value: "stacked", label: "Apilado" },
      ],
    },
  ],
  defaultContent: {
    heading: "Lo que dicen nuestros clientes",
    layout: "grid",
  },
  defaultBlocks: [
    {
      type: "TESTIMONIAL_ITEM",
      content: { name: "", role: "", quote: "", avatar: "" },
    },
  ],
}

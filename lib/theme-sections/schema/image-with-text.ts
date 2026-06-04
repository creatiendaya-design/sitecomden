import { Image as ImageIcon } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const imageWithTextDefinition: ThemeSectionDefinition = {
  type: "IMAGE_WITH_TEXT",
  groups: ["PRODUCT", "COLLECTION"],
  label: "Imagen con texto",
  description: "Imagen a un lado y texto al otro, con CTA opcional.",
  icon: ImageIcon,
  fields: [
    { type: "image", key: "image", label: "Imagen", deviceOverride: false },
    {
      type: "select",
      key: "imagePosition",
      label: "Posición de la imagen",
      options: [
        { value: "left", label: "Izquierda" },
        { value: "right", label: "Derecha" },
      ],
    },
    { type: "text", key: "heading", label: "Título", placeholder: "" },
    { type: "richtext", key: "body", label: "Texto" },
    {
      type: "text",
      key: "ctaLabel",
      label: "Texto del botón (CTA)",
      placeholder: "",
      helpText: "Dejá vacío para no mostrar botón.",
    },
    {
      type: "text",
      key: "ctaHref",
      label: "Enlace del botón",
      placeholder: "/productos",
      showWhen: { field: "ctaLabel", equals: undefined },
    },
  ],
  defaultContent: {
    image: "",
    imagePosition: "left",
    heading: "",
    body: "",
    ctaLabel: "",
    ctaHref: "",
  },
}

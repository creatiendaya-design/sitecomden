import { Image as ImageIcon } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const headerPromoBannerDefinition: ThemeSectionDefinition = {
  type: "HEADER_PROMO_BANNER",
  groups: ["HEADER"],
  label: "Banner promocional",
  description: "Banner de imagen full-width sobre el resto del encabezado.",
  icon: ImageIcon,
  maxPerGroup: 2,
  fields: [
    { type: "image", key: "image", label: "Imagen", deviceOverride: false },
    { type: "text", key: "linkHref", label: "Enlace (opcional)" },
    { type: "text", key: "altText", label: "Texto alternativo" },
  ],
  defaultContent: { image: "", linkHref: "", altText: "" },
}

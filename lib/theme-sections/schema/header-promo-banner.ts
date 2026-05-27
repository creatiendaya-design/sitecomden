import { Image as ImageIcon } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"
import { LinkUrlField } from "@/components/admin/page-builder/forms/custom/LinkUrlField"

export const headerPromoBannerDefinition: ThemeSectionDefinition = {
  type: "HEADER_PROMO_BANNER",
  groups: ["HEADER"],
  label: "Banner promocional",
  description: "Banner de imagen full-width sobre el resto del encabezado.",
  icon: ImageIcon,
  maxPerGroup: 2,
  fields: [
    { type: "image", key: "image", label: "Imagen", deviceOverride: false },
    {
      type: "custom",
      key: "linkHref",
      label: "Enlace (opcional)",
      component: LinkUrlField,
    },
    { type: "text", key: "altText", label: "Texto alternativo" },
  ],
  defaultContent: { image: "", linkHref: "", altText: "" },
  // Full-width image banner inside the sticky header — alignment doesn't
  // apply (no text), and the wrapper's own border / radius / shadow
  // would clip the image edge oddly, so we hide them.
  styleSupport: {
    alignment: false,
    cornerRadius: false,
    border: false,
    shadow: false,
  },
}

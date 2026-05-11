import { LayoutDashboard, ImagePlus } from "lucide-react"
import type { ThemeSectionDefinition, ThemeSectionBlockDefinition } from "../types"

const megaMenuPanelDefinition: ThemeSectionBlockDefinition = {
  type: "MEGA_MENU_PANEL",
  label: "Panel de mega menú",
  icon: ImagePlus,
  maxPerSection: 8,
  fields: [
    { type: "text", key: "trigger", label: "Texto del trigger" },
    {
      type: "image",
      key: "featuredImage",
      label: "Imagen destacada",
      deviceOverride: false,
    },
    { type: "text", key: "featuredImageHref", label: "Link de la imagen" },
    { type: "menu-item-list", key: "links", label: "Enlaces", maxLinks: 12 },
  ],
  defaultContent: {
    trigger: "Categorías",
    featuredImage: "",
    featuredImageHref: "",
    links: [],
  },
}

export const megaMenuDefinition: ThemeSectionDefinition = {
  type: "MEGA_MENU",
  groups: ["HEADER"],
  label: "Mega menú",
  description: "Menú con paneles e imágenes destacadas, estilo premium.",
  icon: LayoutDashboard,
  maxPerGroup: 1,
  acceptedBlockTypes: [megaMenuPanelDefinition],
  fields: [],
  defaultContent: {},
  defaultBlocks: [
    {
      type: "MEGA_MENU_PANEL",
      content: {
        trigger: "Productos",
        featuredImage: "",
        featuredImageHref: "",
        links: [],
      },
    },
  ],
}

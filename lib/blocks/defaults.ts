import type { BlockContentV2, BlockStyle, LandingBlockType } from "./types"

/**
 * Default Level 2 style values applied to every new block.
 * Admins can override any of these in the Style tab of the right panel.
 */
export const DEFAULT_STYLE: BlockStyle = {
  backgroundColor: undefined,          // transparent / theme default
  textColor: undefined,
  paddingY: "md",
  alignment: "center",
  containerWidth: "normal",
  cornerRadius: "none",
  border: "none",
  shadow: "none",
  visibility: "always",
}

/**
 * Default content shape for each block type. Used when the admin clicks
 * "Add block" to create a new instance. Content is v2 shape with
 * `data`, `style`, and `media` zones.
 *
 * Note: block types added in Plan 2 (RICH_TEXT, FAQ, IMAGE_TEXT,
 * RELATED_PRODUCTS, TRUST_BADGES) are defined there. Plan 1 only covers
 * the 7 existing types.
 */
export const DEFAULT_CONTENT_V2: Record<LandingBlockType, BlockContentV2> = {
  HERO: {
    data: {
      title: "Título del hero",
      subtitle: "",
      ctaText: "Comprar ahora",
    },
    style: { ...DEFAULT_STYLE, paddingY: "xl" },
    media: {
      bgImage: { desktop: "", mobile: "" },
      bgOverlay: { desktop: "rgba(0,0,0,0.3)", mobile: "rgba(0,0,0,0.3)" },
    },
  },
  BENEFITS: {
    data: {
      cards: [{ icon: "✅", title: "Beneficio", description: "Descripción del beneficio" }],
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },
  GALLERY: {
    data: {
      displayType: "slider",
      images: [] as string[],
      showBuyButton: false,
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },
  TESTIMONIALS: {
    data: {
      items: [{ name: "Cliente", text: "Excelente producto", rating: 5 }],
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },
  VIDEO: {
    data: {
      displayType: "slider",
      videos: [] as unknown[],
      showBuyButton: false,
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },
  COLORS: {
    data: {
      primary: "#3b82f6",
      background: "#ffffff",
      cta: "#dc2626",
      text: "#111827",
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },
  TICKER: {
    data: {
      mode: "scrolling",
      sticky: false,
      scrollingText: "🔥 Oferta especial • Envío gratis •",
      speed: 30,
      bgColor: "#dc2626",
      textColor: "#ffffff",
    },
    style: { ...DEFAULT_STYLE, paddingY: "sm" },
    media: {},
  },
  // Block types added in Plan 2 — placeholder defaults so the enum is exhaustive.
  // These will NOT be registered as addable in the AddBlockPanel (registry filter).
  RICH_TEXT: { data: {}, style: { ...DEFAULT_STYLE }, media: {} },
  FAQ: { data: {}, style: { ...DEFAULT_STYLE }, media: {} },
  IMAGE_TEXT: { data: {}, style: { ...DEFAULT_STYLE }, media: {} },
  RELATED_PRODUCTS: { data: {}, style: { ...DEFAULT_STYLE }, media: {} },
  TRUST_BADGES: { data: {}, style: { ...DEFAULT_STYLE }, media: {} },
}

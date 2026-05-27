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
      // Overlay defaults — visible darken pass with subtle gradient so text
      // stays legible on bright photos. Admin can disable per block.
      overlayEnabled: true,
      overlayColor: "#000000",
      overlayOpacity: 45,
      overlayStyle: "gradient-bottom",
      // Image presentation
      imageFit: "cover",
      imagePosition: "center",
      // Layout
      minHeight: "md",
      cornerRadius: "none",
      contentAlignment: "center",
      ctaVariant: "solid",
    },
    style: { ...DEFAULT_STYLE, paddingY: "xl" },
    media: {
      bgImage: { desktop: "", mobile: "" },
    },
  },
  GALLERY: {
    data: {
      displayType: "slider",
      // Schema-driven shape: each item has { id, url }. Renderer is
      // backward-compatible with legacy `string[]`.
      images: [] as { id: string; url: string }[],
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
  RICH_TEXT: {
    data: {
      caption: "",
      heading: "Habla sobre tu marca",
      headingSize: "medium",
      html: "<p>Comparte detalles sobre tu marca con tus clientes. Describe un producto, anuncia una promoción o cuenta tu historia.</p>",
      button1: { label: "", href: "", style: "primary" },
      button2: { label: "", href: "", style: "secondary" },
      maxWidth: "prose",
    },
    style: { ...DEFAULT_STYLE, alignment: "center" },
    media: {},
  },

  FAQ: {
    data: {
      title: "Preguntas frecuentes",
      items: [
        { id: crypto.randomUUID(), question: "¿Cuánto demora el envío?", answer: "<p>Entre 24 y 72 horas en Lima Metropolitana.</p>" },
        { id: crypto.randomUUID(), question: "¿Puedo devolver el producto?", answer: "<p>Sí, tienes 30 días calendario para devoluciones.</p>" },
      ],
      allowMultipleOpen: false,
      defaultOpenFirst: false,
    },
    style: { ...DEFAULT_STYLE, alignment: "left" },
    media: {},
  },

  IMAGE_TEXT: {
    data: {
      title: "Característica destacada",
      description: "<p>Describe la característica en un par de oraciones.</p>",
      imagePosition: "left",
      imageAlt: "Característica del producto",
      ctaText: "",
      ctaUrl: "",
      ratioImageToText: "50-50",
    },
    style: { ...DEFAULT_STYLE, alignment: "left" },
    media: {
      image: { desktop: "", mobile: "" },
    },
  },

  ICON_TEXT: {
    data: {
      cards: [
        {
          id: crypto.randomUUID(),
          image: "",
          imageAlt: "",
          html: "<p><strong>Sinergia</strong> de 4 módulos clínicamente probados para máxima efectividad.</p>",
          imageWidthDesktop: 96,
          imageWidthMobile: 72,
        },
        {
          id: crypto.randomUUID(),
          image: "",
          imageAlt: "",
          html: "<p><strong>Rápido y eficiente</strong> — tratamientos de 15 minutos o menos.</p>",
          imageWidthDesktop: 96,
          imageWidthMobile: 72,
        },
        {
          id: crypto.randomUUID(),
          image: "",
          imageAlt: "",
          html: "<p><strong>Conveniente</strong> — disfrútalo desde la comodidad de tu hogar.</p>",
          imageWidthDesktop: 96,
          imageWidthMobile: 72,
        },
        {
          id: crypto.randomUUID(),
          image: "",
          imageAlt: "",
          html: "<p><strong>Ahorra dinero</strong> reemplazando tratamientos clínicos con resultados similares o mejores.</p>",
          imageWidthDesktop: 96,
          imageWidthMobile: 72,
        },
      ],
      columnsDesktop: 4,
      columnsMobile: 2,
      cardPadding: "md",
      cardCornerRadius: "lg",
      cardGap: "md",
      defaultCardBgColor: "#f5f5f5",
      defaultCardTextColor: "",
    },
    style: { ...DEFAULT_STYLE, alignment: "center" },
    media: {},
  },

  RELATED_PRODUCTS: {
    data: {
      title: "También te puede gustar",
      mode: "auto",
      autoFilters: {
        source: "same-category",
        limit: 4,
        excludeCurrentProduct: true,
      },
      displayType: "carousel",
      columnsDesktop: 4,
      columnsMobile: 2,
      showPrice: true,
      showRating: false,
      showAddToCart: false,
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },

  TRUST_BADGES: {
    data: {
      badges: [
        { id: crypto.randomUUID(), icon: "ShieldCheck", title: "Pago seguro", subtitle: "SSL y tarjeta cifrada" },
        { id: crypto.randomUUID(), icon: "Truck", title: "Envío gratis", subtitle: "En compras mayores a S/150" },
        { id: crypto.randomUUID(), icon: "RefreshCw", title: "Devoluciones", subtitle: "30 días" },
        { id: crypto.randomUUID(), icon: "BadgeCheck", title: "Garantía", subtitle: "Productos originales" },
      ],
      layout: "horizontal",
      columns: 4,
      iconSize: "md",
      iconStyle: "outline",
    },
    style: { ...DEFAULT_STYLE },
    media: {},
  },

  PRODUCT_GRID: {
    data: {
      title: "",
      columnsDesktop: 4,
      columnsMobile: 2,
      maxItems: 12,
      sort: "manual",
    },
    style: { ...DEFAULT_STYLE, paddingY: "md" },
    media: {},
  },

  COMPARISON: {
    data: {
      title: "BENEFICIOS INIGUALABLES",
      description:
        "Un método probado, pero ahora actualizado: mejor experiencia, mayor garantía y mejor precio que la competencia.",
      yoursLabel: "",
      othersLabel: "Otros",
      rows: [
        { id: crypto.randomUUID(), label: "Auto aplicación", yours: true, theirs: false },
        { id: crypto.randomUUID(), label: "1 año de garantía", yours: true, theirs: false },
        { id: crypto.randomUUID(), label: "Rápido y eficiente", yours: true, theirs: false },
        { id: crypto.randomUUID(), label: "Costo $$$", yours: false, theirs: true },
      ],
      accentColor: "#dc2626",
      accentTextColor: "#ffffff",
    },
    style: { ...DEFAULT_STYLE, paddingY: "xl", alignment: "left" },
    media: {},
  },
}

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
      scrollingText: "Oferta especial • Envío gratis •",
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
      caption: "FAQ",
      title: "Frequently Asked Questions",
      description: "",
      headingSize: "lg",
      items: [
        { id: crypto.randomUUID(), question: "¿Cuánto demora el envío?", answer: "<p>Entre 24 y 72 horas en Lima Metropolitana.</p>" },
        { id: crypto.randomUUID(), question: "¿Puedo devolver el producto?", answer: "<p>Sí, tienes 30 días calendario para devoluciones.</p>" },
      ],
      allowMultipleOpen: false,
      defaultOpenFirst: true,
      itemBgColor: "#dc2626",
      itemOpenBgColor: "",
      itemTextColor: "#ffffff",
      chevronColor: "",
      itemRadius: "full",
      itemGap: "normal",
    },
    style: { ...DEFAULT_STYLE, alignment: "center", paddingY: "xl" },
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

  CAROUSEL: {
    data: {
      caption: "",
      heading: "Trusted By Experts",
      description: "",
      slides: [
        {
          id: crypto.randomUUID(),
          type: "image",
          imageUrl: "",
          alt: "Slide 1",
        },
        {
          id: crypto.randomUUID(),
          type: "image",
          imageUrl: "",
          alt: "Slide 2",
        },
        {
          id: crypto.randomUUID(),
          type: "image",
          imageUrl: "",
          alt: "Slide 3",
        },
        {
          id: crypto.randomUUID(),
          type: "image",
          imageUrl: "",
          alt: "Slide 4",
        },
        {
          id: crypto.randomUUID(),
          type: "image",
          imageUrl: "",
          alt: "Slide 5",
        },
      ],
      slidesPerViewDesktop: 5,
      slidesPerViewTablet: 3,
      slidesPerViewMobile: 2,
      autoplayMs: 0,
      pauseOnHover: true,
      loop: true,
      transition: "slide",
      showArrows: true,
      arrowStyle: "circle",
      dotStyle: "dots",
      aspectRatio: "square",
      gap: 12,
      slideRadius: "lg",
      textOverlayEnabled: false,
      arrowBgColor: "#dc2626",
      arrowColor: "#ffffff",
      dotActiveColor: "#6b7280",
      dotInactiveColor: "#d1d5db",
    },
    style: { ...DEFAULT_STYLE, paddingY: "lg", alignment: "center" },
    media: {},
  },

  FRIENDLY: {
    data: {
      caption: "",
      heading: "",
      description: "",
      features: [
        {
          id: crypto.randomUUID(),
          title: "Increase blood flow",
          description:
            "Mejora la circulación de tu cuerpo de forma natural y promueve un flujo sanguíneo más saludable.",
        },
        {
          id: crypto.randomUUID(),
          title: "Release toxins",
          description:
            "Libera toxinas acumuladas con facilidad y siente cómo tu cuerpo se regenera día a día.",
        },
        {
          id: crypto.randomUUID(),
          title: "Prevent injuries",
          description:
            "Reduce la inflamación y protege tu salud con un paso proactivo en la prevención de lesiones.",
        },
        {
          id: crypto.randomUUID(),
          title: "Easy to use",
          description:
            "Compacto, intuitivo y diseñado para acompañarte a donde vayas, sin complicaciones.",
        },
      ],
      imagePosition: "right",
      imageAlt: "Beneficios del producto",
      columnsDesktop: 2,
      iconBgColor: "#dc2626",
      iconColor: "#ffffff",
      featureTitleColor: "",
      featureDescriptionColor: "",
    },
    style: { ...DEFAULT_STYLE, paddingY: "xl", alignment: "left" },
    media: {
      image: { desktop: "", mobile: "" },
    },
  },

  BANNER_TOP_TEXT: {
    data: {
      caption: "",
      heading: "Sooo many benefits",
      description:
        "Experimenta el diseño y los beneficios sin igual con un único pago — sin suscripciones ni costos ocultos.",
      ctaLabel: "I want it now!",
      ctaHref: "",
      ctaVariant: "solid",
      mediaType: "image",
      mediaAlt: "Banner",
      videoAutoplay: true,
      mediaPosition: "left",
      height: "lg",
      cornerRadius: "none",
      overlayStyle: "gradient-bottom",
      overlayColor: "#000000",
      overlayOpacity: 35,
      scrollItems: [
        { id: crypto.randomUUID(), text: "High quality" },
        { id: crypto.randomUUID(), text: "Self application" },
        { id: crypto.randomUUID(), text: "Knot & pain relief" },
        { id: crypto.randomUUID(), text: "30 day guarantee" },
        { id: crypto.randomUUID(), text: "Improved circulation" },
      ],
      scrollDirection: "up",
      scrollDurationSec: 18,
      pauseOnHover: true,
      scrollBgColor: "#dc2626",
      scrollTextColor: "#ffffff",
      scrollGhostTextColor: "rgba(255,255,255,0.35)",
      scrollGhostOutline: false,
      scrollItalic: true,
      scrollUppercase: true,
    },
    style: { ...DEFAULT_STYLE, paddingY: "none", alignment: "left" },
    media: {
      image: { desktop: "", mobile: "" },
    },
  },

  PORCENTAJE_UNO: {
    data: {
      caption: "",
      heading: "Human Performance Analytics",
      imageAlt: "Producto",
      stats: [
        {
          id: crypto.randomUUID(),
          value: 88,
          suffix: "%",
          highlight: "of participants experienced",
          description:
            "a significant increase in peak muscular endurance during high-intensity training.*",
        },
        {
          id: crypto.randomUUID(),
          value: 92,
          suffix: "%",
          highlight: "of our customers said",
          description:
            "they felt a noticeable improvement in overall energy levels and physical recovery within 30 days.*",
        },
        {
          id: crypto.randomUUID(),
          value: 74,
          suffix: "%",
          highlight: "of users found",
          description:
            "a measurable reduction in cellular markers associated with biological aging and muscle fatigue.*",
        },
      ],
      footnote:
        "Based on a 16-week double-blind clinical study monitoring 120 participants aged 35–65 on a daily 500mg Urolith-X™ regimen.",
      hotspots: [
        {
          id: crypto.randomUUID(),
          x: 62,
          y: 48,
          title: "Clinically Verified",
          description:
            "Every batch undergoes rigorous third-party molecular analysis to ensure the absolute purity of our compound.",
        },
        {
          id: crypto.randomUUID(),
          x: 48,
          y: 72,
          title: "Premium Sourcing",
          description:
            "Sourced from peer-reviewed suppliers with full traceability from raw material to final dose.",
        },
      ],
      mediaPosition: "left",
      curveStrength: "normal",
      countDurationMs: 1800,
      numberColor: "#9eb4d4",
      numberWeight: "bold",
      statTextColor: "#ffffff",
      dividerColor: "rgba(255,255,255,0.12)",
      hotspotColor: "rgba(255,255,255,0.92)",
      hotspotRingColor: "rgba(255,255,255,0.35)",
    },
    style: {
      ...DEFAULT_STYLE,
      paddingY: "xl",
      alignment: "left",
      backgroundColor: "#262626",
      textColor: "#ffffff",
    },
    media: {
      image: { desktop: "", mobile: "" },
    },
  },

  FAQ_TWO: {
    data: {
      caption: "",
      title: "We are serious about nutrition, ask away",
      headingSize: "lg",
      description:
        "Transparency is the foundation of longevity. We have compiled the most common inquiries regarding the science of Urolith-X™ and the biological mechanics of the CORE protocol.",
      expertsLabelTop: "Formulated by our expert in-house",
      expertsLabelBottom: "Biologists & Clinical Researchers",
      experts: [
        { id: crypto.randomUUID(), imageUrl: "", alt: "Researcher 1", verified: true },
        { id: crypto.randomUUID(), imageUrl: "", alt: "Researcher 2", verified: true },
        { id: crypto.randomUUID(), imageUrl: "", alt: "Researcher 3", verified: true },
      ],
      items: [
        {
          id: crypto.randomUUID(),
          question: "What exactly is Urolith-X™?",
          answer:
            "Urolith-X™ is our proprietary, clinically formulated compound designed to support cellular performance and longevity at the molecular level.",
        },
        {
          id: crypto.randomUUID(),
          question: "How soon will I notice the effects of the CORE?",
          answer:
            "Most users report measurable improvements in energy and recovery within the first 14 to 30 days of consistent use.",
        },
        {
          id: crypto.randomUUID(),
          question: "Do I need to exercise for Aeon Lift to work?",
          answer:
            "While Aeon Lift is highly effective on its own, regular movement and balanced nutrition amplify its long-term benefits.",
        },
        {
          id: crypto.randomUUID(),
          question: "Is there a \"loading phase\" required?",
          answer:
            "No loading phase is required. A single daily dose is enough to maintain optimal plasma concentration of the active compound.",
        },
      ],
      allowMultipleOpen: false,
      defaultOpenFirst: false,
      curveStrength: "normal",
      itemGap: "normal",
      sectionBgColor: "#f1f1f0",
      titleColor: "#1f1f1f",
      textColor: "#3a3a3a",
      expertsBadgeBgColor: "#ffffff",
      verifiedBadgeColor: "#3b82f6",
      itemTextColor: "#1f1f1f",
      dividerColor: "rgba(0,0,0,0.12)",
      iconColor: "#1f1f1f",
    },
    style: { ...DEFAULT_STYLE, paddingY: "none", alignment: "left" },
    media: {},
  },
}

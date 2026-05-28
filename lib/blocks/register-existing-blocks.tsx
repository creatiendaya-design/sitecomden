import dynamic from "next/dynamic"
import { registerBlock } from "./registry"
import { DEFAULT_CONTENT_V2 } from "./defaults"
import type { BlockDefinition } from "./registry"

// Storefront renderers are the same components used in ProductLandingView.
// We reuse them unchanged in the editor canvas — they already accept
// v1 or v2 content via the bilingual reader added in Task 7.

const HeroBlock = dynamic(() => import("@/components/shop/templates/blocks/HeroBlock"))
const GalleryBlock = dynamic(() => import("@/components/shop/templates/blocks/GalleryBlock"))
const TestimonialsBlock = dynamic(() => import("@/components/shop/templates/blocks/TestimonialsBlock"))
const VideoBlock = dynamic(() => import("@/components/shop/templates/blocks/VideoBlock"))
// ColorsBlock intentionally not imported — block is deprecated from the picker
const TickerBlock = dynamic(() => import("@/components/shop/templates/blocks/TickerBlock"))
const TrustBadgesBlock = dynamic(() => import("@/components/shop/templates/blocks/TrustBadgesBlock"))
const RichTextBlock = dynamic(() => import("@/components/shop/templates/blocks/RichTextBlock"))
const FaqBlock = dynamic(() => import("@/components/shop/templates/blocks/FaqBlock"))
const ImageTextBlock = dynamic(() => import("@/components/shop/templates/blocks/ImageTextBlock"))
const IconTextBlock = dynamic(() => import("@/components/shop/templates/blocks/IconTextBlock"))
const RelatedProductsBlockEditorWrapper = dynamic(() => import("@/components/shop/templates/blocks/RelatedProductsBlockEditorWrapper"))
const ProductGridBlockEditor = dynamic(() => import("@/components/shop/templates/blocks/ProductGridBlockEditor"))
const ComparisonBlock = dynamic(() => import("@/components/shop/templates/blocks/ComparisonBlock"))
const FriendlyBlock = dynamic(() => import("@/components/shop/templates/blocks/FriendlyBlock"))
const CarouselBlock = dynamic(() => import("@/components/shop/templates/blocks/CarouselBlock"))
const BannerTopTextBlock = dynamic(() => import("@/components/shop/templates/blocks/BannerTopTextBlock"))
const PorcentajeUnoBlock = dynamic(() => import("@/components/shop/templates/blocks/PorcentajeUnoBlock"))
const FaqTwoBlock = dynamic(() => import("@/components/shop/templates/blocks/FaqTwoBlock"))

// ColorsContentForm intentionally not imported — block is deprecated from the picker
import { ImageTextMediaField } from "@/components/admin/page-builder/forms/custom/ImageTextMediaField"
import { LinkUrlField } from "@/components/admin/page-builder/forms/custom/LinkUrlField"

const existing: BlockDefinition[] = [
  {
    type: "HERO",
    label: "Hero / Cabecera",
    icon: "Megaphone",
    description: "Imagen grande con título y CTA para abrir la landing",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.HERO,
    renderer: HeroBlock as any,
    contentSchema: [
      { type: "text", key: "title", label: "Título" },
      { type: "text", key: "subtitle", label: "Subtítulo" },
      {
        type: "custom",
        key: "sectionHref",
        label: "Enlace de toda la sección",
        component: LinkUrlField,
        helpText:
          "Opcional. Si lo defines, hacer clic en cualquier parte del hero (fondo, título, subtítulo) redirige a esta URL. El botón CTA mantiene su propio enlace.",
      },
      { type: "text", key: "ctaText", label: "Texto del botón" },
      {
        type: "custom",
        key: "ctaHref",
        label: "Enlace del botón",
        component: LinkUrlField,
        helpText:
          "Opcional. Si lo dejas vacío y el bloque vive en una landing de producto, el CTA abre el flujo normal.",
      },

      // ─── Imagen ────────────────────────────────────────────────────────
      {
        type: "select",
        key: "imageFit",
        label: "Adaptar imagen",
        deviceOverride: true,
        options: [
          { value: "cover", label: "Cubrir (recorta)" },
          { value: "contain", label: "Contener (sin recorte)" },
          { value: "fill", label: "Estirar" },
          { value: "none", label: "Tamaño original" },
        ],
        helpText:
          "Cómo encaja la imagen en el área del hero. ‘Cubrir’ es lo más común.",
      },
      {
        type: "select",
        key: "imagePosition",
        label: "Posición de la imagen",
        deviceOverride: true,
        options: [
          { value: "center", label: "Centro" },
          { value: "top", label: "Arriba" },
          { value: "bottom", label: "Abajo" },
          { value: "left", label: "Izquierda" },
          { value: "right", label: "Derecha" },
          { value: "top-left", label: "Arriba izquierda" },
          { value: "top-right", label: "Arriba derecha" },
          { value: "bottom-left", label: "Abajo izquierda" },
          { value: "bottom-right", label: "Abajo derecha" },
        ],
      },

      // ─── Overlay ───────────────────────────────────────────────────────
      {
        type: "switch",
        key: "overlayEnabled",
        label: "Activar overlay",
        helpText:
          "Capa de color sobre la imagen para mejorar la legibilidad del texto.",
      },
      {
        type: "select",
        key: "overlayStyle",
        label: "Estilo del overlay",
        options: [
          { value: "solid", label: "Color sólido" },
          { value: "gradient-bottom", label: "Degradado (abajo)" },
          { value: "gradient-top", label: "Degradado (arriba)" },
          { value: "gradient-radial", label: "Degradado radial" },
        ],
        showWhen: { field: "overlayEnabled", equals: true },
      },
      {
        type: "color",
        key: "overlayColor",
        label: "Color del overlay",
        showWhen: { field: "overlayEnabled", equals: true },
        showInStyleTab: true,
      },
      {
        type: "number",
        key: "overlayOpacity",
        label: "Opacidad del overlay (%)",
        min: 0,
        max: 100,
        step: 5,
        showWhen: { field: "overlayEnabled", equals: true },
      },

      // ─── Forma y tamaño ───────────────────────────────────────────────
      {
        type: "select",
        key: "minHeight",
        label: "Altura del hero",
        deviceOverride: true,
        options: [
          { value: "adapt", label: "Adaptar a la imagen" },
          { value: "sm", label: "Pequeño" },
          { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" },
          { value: "xl", label: "Extra grande" },
          { value: "screen", label: "Pantalla completa" },
        ],
        helpText:
          "‘Adaptar’: el hero toma la proporción natural de la imagen al ancho de pantalla (estilo Shopify). El resto son alturas fijas en % del viewport.",
      },
      {
        type: "select",
        key: "cornerRadius",
        label: "Bordes redondeados",
        options: [
          { value: "none", label: "Sin redondear" },
          { value: "sm", label: "Pequeño" },
          { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" },
          { value: "xl", label: "Extra grande" },
          { value: "full", label: "Completo" },
        ],
      },
      {
        type: "select",
        key: "contentAlignment",
        label: "Alineación del contenido",
        deviceOverride: true,
        options: [
          { value: "left", label: "Izquierda" },
          { value: "center", label: "Centro" },
          { value: "right", label: "Derecha" },
        ],
      },
      {
        type: "select",
        key: "ctaVariant",
        label: "Estilo del botón",
        options: [
          { value: "solid", label: "Sólido" },
          { value: "outline", label: "Contorno" },
          { value: "glass", label: "Cristal (glassmorphism)" },
        ],
      },
    ],
    styleSupport: {
      bgImage: true,
      gradient: true,
      // The Hero's heading, subtitle and CTA all hardcode their own text
      // color and alignment to keep the design coherent against any bg
      // image, so the matching controls are hidden from the Style tab.
      textColor: false,
      alignment: false,
    },
  },
  {
    type: "GALLERY",
    label: "Galería",
    icon: "Image",
    description: "Slider o stack de imágenes del producto",
    scope: "universal",
    category: "media",
    defaultContent: DEFAULT_CONTENT_V2.GALLERY,
    renderer: GalleryBlock as any,
    contentSchema: [
      {
        type: "select",
        key: "displayType",
        label: "Tipo de display",
        options: [
          { value: "slider", label: "Slider" },
          { value: "stacked", label: "Apilado" },
        ],
      },
      { type: "switch", key: "showBuyButton", label: "Mostrar botón de compra" },
      { type: "text", key: "buyButtonText", label: "Texto del botón", placeholder: "Comprar ahora" },
      {
        type: "array",
        key: "images",
        label: "Imágenes",
        addButtonText: "+ Agregar imagen",
        newItem: () => ({ id: crypto.randomUUID(), url: "" }),
        itemLabel: (_it, i) => `Imagen ${i + 1}`,
        itemSchema: [
          { type: "image", key: "url", label: "Imagen", deviceOverride: false },
        ],
      },
    ],
    styleSupport: { textColor: false, alignment: false },
  },
  {
    type: "TESTIMONIALS",
    label: "Testimonios",
    icon: "MessageSquare",
    description: "Reseñas con nombre, foto y calificación",
    scope: "universal",
    category: "social-proof",
    defaultContent: DEFAULT_CONTENT_V2.TESTIMONIALS,
    renderer: TestimonialsBlock as any,
    contentSchema: [
      {
        type: "array",
        key: "items",
        label: "Testimonios",
        addButtonText: "+ Agregar testimonio",
        newItem: () => ({
          id: crypto.randomUUID(),
          name: "Cliente",
          text: "Excelente producto",
          rating: 5,
        }),
        itemLabel: (it) => (it.name as string) || "Sin nombre",
        itemSchema: [
          { type: "text", key: "name", label: "Nombre" },
          { type: "text", key: "photo", label: "URL de foto (opcional)" },
          { type: "textarea", key: "text", label: "Testimonio", rows: 3 },
          {
            type: "select",
            key: "rating",
            label: "Calificación",
            options: [
              { value: 1, label: "★" },
              { value: 2, label: "★★" },
              { value: 3, label: "★★★" },
              { value: 4, label: "★★★★" },
              { value: 5, label: "★★★★★" },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "VIDEO",
    label: "Video",
    icon: "PlayCircle",
    description: "Video de YouTube, Vimeo o subido",
    scope: "universal",
    category: "media",
    defaultContent: DEFAULT_CONTENT_V2.VIDEO,
    renderer: VideoBlock as any,
    contentSchema: [
      {
        type: "select",
        key: "displayType",
        label: "Tipo de display",
        options: [
          { value: "slider", label: "Slider" },
          { value: "stacked", label: "Apilado" },
        ],
      },
      { type: "switch", key: "showBuyButton", label: "Mostrar botón de compra" },
      { type: "text", key: "buyButtonText", label: "Texto del botón", placeholder: "Comprar ahora" },
      {
        type: "array",
        key: "videos",
        label: "Videos",
        addButtonText: "+ Agregar video",
        newItem: () => ({ id: crypto.randomUUID(), url: "", title: "", provider: "youtube" }),
        itemLabel: (it) => (it.title as string) || (it.url as string) || "Video",
        itemSchema: [
          { type: "text", key: "url", label: "URL del video" },
          { type: "text", key: "title", label: "Título (opcional)" },
          {
            type: "select",
            key: "provider",
            label: "Proveedor",
            options: [
              { value: "youtube", label: "YouTube" },
              { value: "vimeo", label: "Vimeo" },
              { value: "upload", label: "Subido" },
            ],
          },
        ],
      },
    ],
    styleSupport: { textColor: false, alignment: false },
  },
  // COLORS block intentionally not registered in the AddBlockPanel — it was
  // deprecated as a standalone block. The renderer still exists for any
  // existing COLORS blocks in the DB (they render correctly via the storefront's
  // LandingBlockRenderer switch) but admins can no longer add new ones.
  {
    type: "TICKER",
    label: "Ticker / Contador",
    icon: "Megaphone",
    description: "Mensaje animado o countdown para ofertas",
    scope: "universal",
    category: "visual",
    defaultContent: DEFAULT_CONTENT_V2.TICKER,
    renderer: TickerBlock as any,
    contentSchema: [
      {
        type: "select",
        key: "mode",
        label: "Modo",
        options: [
          { value: "scrolling", label: "Solo texto scrolling" },
          { value: "countdown", label: "Solo contador regresivo" },
          { value: "both", label: "Scrolling + contador" },
        ],
      },
      { type: "switch", key: "sticky", label: "Sticky (fijo arriba)" },
      { type: "text", key: "scrollingText", label: "Texto scrolling", placeholder: "Oferta • Envío gratis •" },
      { type: "number", key: "speed", label: "Velocidad (px/s)", min: 10, max: 100 },
      { type: "text", key: "countdownLabel", label: "Etiqueta del contador" },
      { type: "text", key: "endsAt", label: "Fecha fin (ISO datetime)", placeholder: "2026-12-31T23:59:59" },
      { type: "color", key: "bgColor", label: "Color de fondo", showInStyleTab: true },
      { type: "color", key: "textColor", label: "Color de texto", showInStyleTab: true },
    ],
    styleSupport: {
      backgroundColor: false,
      textColor: false,
      alignment: false,
      containerWidth: false,
      cornerRadius: false,
      border: false,
      shadow: false,
    },
  },
  {
    type: "TRUST_BADGES",
    label: "Badges de confianza",
    icon: "ShieldCheck",
    description: "Íconos con señales de confianza (pago seguro, envío gratis, etc.)",
    scope: "universal",
    category: "social-proof",
    defaultContent: DEFAULT_CONTENT_V2.TRUST_BADGES,
    renderer: TrustBadgesBlock as any,
    contentSchema: [
      {
        type: "select",
        key: "layout",
        label: "Layout",
        options: [
          { value: "horizontal", label: "Horizontal (grid)" },
          { value: "vertical", label: "Vertical (lista)" },
        ],
      },
      {
        type: "select",
        key: "columns",
        label: "Columnas",
        options: [
          { value: 2, label: "2" },
          { value: 3, label: "3" },
          { value: 4, label: "4" },
          { value: 5, label: "5" },
        ],
      },
      {
        type: "select",
        key: "iconSize",
        label: "Tamaño de íconos",
        options: [
          { value: "sm", label: "Pequeño" },
          { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" },
        ],
      },
      {
        type: "array",
        key: "badges",
        label: "Badges",
        addButtonText: "+ Agregar badge",
        newItem: () => ({
          id: crypto.randomUUID(),
          icon: "Shield",
          title: "Nuevo badge",
          subtitle: "",
        }),
        itemLabel: (it) => (it.title as string) || "Sin título",
        itemSchema: [
          {
            type: "icon",
            key: "icon",
            label: "Ícono (Lucide)",
            curated: [
              "Shield", "ShieldCheck", "Lock", "Truck", "Package", "RefreshCw",
              "Award", "Star", "Heart", "Gift", "Clock", "BadgeCheck",
              "CreditCard", "Headphones", "Phone", "Globe",
            ],
          },
          { type: "text", key: "title", label: "Título" },
          { type: "text", key: "subtitle", label: "Subtítulo (opcional)" },
        ],
      },
    ],
  },
  {
    type: "RICH_TEXT",
    label: "Texto con formato",
    icon: "Type",
    description: "Sección con caption, título, texto y hasta dos botones — al estilo Shopify Dawn",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.RICH_TEXT,
    renderer: RichTextBlock as any,
    contentSchema: [
      {
        type: "text",
        key: "caption",
        label: "Caption (opcional)",
        placeholder: "Texto breve sobre el título",
        helpText: "Etiqueta corta en mayúsculas que aparece sobre el título.",
      },
      {
        type: "text",
        key: "heading",
        label: "Título",
        placeholder: "Habla sobre tu marca",
      },
      {
        type: "select",
        key: "headingSize",
        label: "Tamaño del título",
        options: [
          { value: "small", label: "Pequeño" },
          { value: "medium", label: "Mediano" },
          { value: "large", label: "Grande" },
        ],
      },
      {
        type: "richtext",
        key: "html",
        label: "Texto",
        placeholder: "Comparte detalles de tu marca con tus clientes.",
      },
      {
        type: "group",
        key: "button1",
        label: "Botón 1",
        collapsible: true,
        defaultOpen: false,
        schema: [
          { type: "text", key: "label", label: "Texto del botón", placeholder: "Comprar ahora" },
          { type: "custom", key: "href", label: "Enlace", component: LinkUrlField },
          {
            type: "select",
            key: "style",
            label: "Estilo",
            options: [
              { value: "primary", label: "Primario (sólido)" },
              { value: "secondary", label: "Secundario (contorno)" },
            ],
          },
        ],
      },
      {
        type: "group",
        key: "button2",
        label: "Botón 2",
        collapsible: true,
        defaultOpen: false,
        schema: [
          { type: "text", key: "label", label: "Texto del botón" },
          { type: "custom", key: "href", label: "Enlace", component: LinkUrlField },
          {
            type: "select",
            key: "style",
            label: "Estilo",
            options: [
              { value: "primary", label: "Primario (sólido)" },
              { value: "secondary", label: "Secundario (contorno)" },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "FAQ",
    label: "Preguntas frecuentes",
    icon: "HelpCircle",
    description: "Acordeón de preguntas y respuestas con SEO structured data (FAQPage schema.org)",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.FAQ,
    renderer: FaqBlock as any,
    contentSchema: [
      // ─── Encabezado ──────────────────────────────────────────────────
      {
        type: "text",
        key: "caption",
        label: "Caption (opcional)",
        placeholder: "FAQ",
        helpText: "Etiqueta corta en mayúsculas sobre el título.",
      },
      {
        type: "text",
        key: "title",
        label: "Título",
        placeholder: "Frequently Asked Questions",
      },
      {
        type: "textarea",
        key: "description",
        label: "Descripción (opcional)",
        rows: 2,
        placeholder: "Texto corto bajo el título",
      },
      {
        type: "select",
        key: "headingSize",
        label: "Tamaño del título",
        options: [
          { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" },
          { value: "xl", label: "Extra grande" },
        ],
      },

      // ─── Comportamiento ──────────────────────────────────────────────
      { type: "switch", key: "allowMultipleOpen", label: "Permitir varias abiertas" },
      { type: "switch", key: "defaultOpenFirst", label: "Abrir la primera por defecto" },

      // ─── Estilo de las cards ────────────────────────────────────────
      {
        type: "select",
        key: "itemRadius",
        label: "Bordes de las cards",
        options: [
          { value: "md", label: "Pequeño" },
          { value: "lg", label: "Mediano" },
          { value: "xl", label: "Grande" },
          { value: "2xl", label: "Extra grande" },
          { value: "full", label: "Píldora (estadio)" },
        ],
      },
      {
        type: "select",
        key: "itemGap",
        label: "Separación entre cards",
        options: [
          { value: "tight", label: "Ajustada" },
          { value: "normal", label: "Normal" },
          { value: "relaxed", label: "Amplia" },
        ],
      },
      {
        type: "color",
        key: "itemBgColor",
        label: "Color de fondo (cerrada)",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "itemOpenBgColor",
        label: "Color de fondo (abierta)",
        showInStyleTab: true,
        helpText: "Opcional. Si lo dejas vacío usa el mismo color que cerrada.",
      },
      {
        type: "color",
        key: "itemTextColor",
        label: "Color del texto",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "chevronColor",
        label: "Color del chevron (flecha)",
        showInStyleTab: true,
        helpText: "Opcional. Hereda el color del texto si lo dejas vacío.",
      },

      // ─── Preguntas ──────────────────────────────────────────────────
      {
        type: "array",
        key: "items",
        label: "Preguntas",
        addButtonText: "+ Agregar pregunta",
        newItem: () => ({
          id: crypto.randomUUID(),
          question: "Nueva pregunta",
          answer: "<p>Respuesta</p>",
        }),
        itemLabel: (it) => (it.question as string) || "Sin pregunta",
        itemSchema: [
          { type: "text", key: "question", label: "Pregunta" },
          { type: "richtext", key: "answer", label: "Respuesta" },
        ],
      },
    ],
    styleSupport: {
      gradient: true,
    },
    liveContentVars: {
      itemBgColor: "--faq-item-bg",
      itemOpenBgColor: "--faq-item-bg-open",
      itemTextColor: "--faq-item-text",
      chevronColor: "--faq-chevron",
    },
  },
  {
    type: "IMAGE_TEXT",
    label: "Imagen + Texto",
    icon: "Image",
    description: "Imagen y texto lado a lado (o apilados en mobile)",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.IMAGE_TEXT,
    renderer: ImageTextBlock as any,
    contentSchema: [
      { type: "text", key: "title", label: "Título" },
      { type: "richtext", key: "description", label: "Descripción" },
      {
        type: "custom",
        key: "__imageMedia",
        label: "Imagen",
        component: ImageTextMediaField,
      },
      {
        type: "select",
        key: "imagePosition",
        label: "Posición imagen (desktop)",
        options: [
          { value: "left", label: "Izquierda" },
          { value: "right", label: "Derecha" },
        ],
      },
      {
        type: "select",
        key: "ratioImageToText",
        label: "Proporción",
        options: [
          { value: "40-60", label: "40 / 60" },
          { value: "50-50", label: "50 / 50" },
          { value: "60-40", label: "60 / 40" },
        ],
      },
      { type: "text", key: "imageAlt", label: "Alt text", placeholder: "Descripción para lectores" },
      { type: "text", key: "ctaText", label: "Texto del botón (opcional)" },
      {
        type: "custom",
        key: "ctaUrl",
        label: "URL del botón (opcional)",
        component: LinkUrlField,
      },
    ],
    styleSupport: { gradient: true },
  },
  {
    type: "ICON_TEXT",
    label: "Icono + Texto (cards)",
    icon: "Sparkles",
    description:
      "Grid de tarjetas con ícono/imagen y texto enriquecido — ideal para listas de beneficios",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.ICON_TEXT,
    renderer: IconTextBlock as any,
    contentSchema: [
      {
        type: "select",
        key: "columnsDesktop",
        label: "Columnas desktop",
        options: [
          { value: 2, label: "2" },
          { value: 3, label: "3" },
          { value: 4, label: "4" },
          { value: 5, label: "5" },
        ],
      },
      {
        type: "select",
        key: "columnsMobile",
        label: "Columnas mobile",
        options: [
          { value: 1, label: "1" },
          { value: 2, label: "2" },
        ],
      },
      {
        type: "select",
        key: "cardGap",
        label: "Separación entre cards",
        options: [
          { value: "sm", label: "Pequeña" },
          { value: "md", label: "Mediana" },
          { value: "lg", label: "Grande" },
        ],
      },
      {
        type: "select",
        key: "cardPadding",
        label: "Padding interno de cada card",
        options: [
          { value: "sm", label: "Pequeño" },
          { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" },
        ],
      },
      {
        type: "select",
        key: "cardCornerRadius",
        label: "Bordes redondeados de cards",
        options: [
          { value: "none", label: "Sin redondear" },
          { value: "sm", label: "Pequeño" },
          { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" },
          { value: "xl", label: "Extra grande" },
        ],
      },
      {
        type: "color",
        key: "defaultCardBgColor",
        label: "Fondo de cards (por defecto)",
        showInStyleTab: true,
        helpText:
          "Se aplica a todas las cards que no tengan un fondo propio. Si lo dejas vacío, las cards heredan el fondo de la sección.",
      },
      {
        type: "color",
        key: "defaultCardTextColor",
        label: "Texto de cards (por defecto)",
        showInStyleTab: true,
        helpText: "Color de texto compartido por las cards sin color propio.",
      },
      {
        type: "array",
        key: "cards",
        label: "Cards",
        addButtonText: "+ Agregar card",
        newItem: () => ({
          id: crypto.randomUUID(),
          image: "",
          imageAlt: "",
          html: "<p><strong>Nuevo beneficio</strong> descrito en una frase.</p>",
          bgColor: "",
          textColor: "",
          imageWidthDesktop: 96,
          imageWidthMobile: 72,
        }),
        itemLabel: (it, i) => {
          const html = (it.html as string) || "";
          const text = html.replace(/<[^>]*>/g, "").trim();
          return text ? text.slice(0, 32) : `Card ${i + 1}`;
        },
        itemSchema: [
          {
            type: "image",
            key: "image",
            label: "Imagen / ícono",
            deviceOverride: false,
          },
          { type: "text", key: "imageAlt", label: "Texto alternativo (alt)" },
          {
            type: "range",
            key: "imageWidthDesktop",
            label: "Ancho imagen desktop",
            min: 24,
            max: 320,
            step: 4,
            unit: "px",
            defaultValue: 96,
          },
          {
            type: "range",
            key: "imageWidthMobile",
            label: "Ancho imagen mobile",
            min: 24,
            max: 240,
            step: 4,
            unit: "px",
            defaultValue: 72,
          },
          { type: "richtext", key: "html", label: "Texto" },
          {
            type: "color",
            key: "bgColor",
            label: "Fondo de esta card",
            helpText: "Opcional. Si lo dejas vacío usa el color por defecto del bloque.",
          },
          {
            type: "color",
            key: "textColor",
            label: "Color de texto",
            helpText: "Opcional. Sobrescribe el color por defecto del bloque para esta card.",
          },
        ],
      },
    ],
    styleSupport: { gradient: true },
  },
  {
    type: "RELATED_PRODUCTS",
    label: "Productos relacionados",
    icon: "Package",
    description: "Cross-sell y up-sell basado en categorías o manual",
    scope: "product",
    category: "commerce",
    defaultContent: DEFAULT_CONTENT_V2.RELATED_PRODUCTS,
    renderer: RelatedProductsBlockEditorWrapper as any,
    contentSchema: [
      { type: "text", key: "title", label: "Título", placeholder: "También te puede gustar" },
      {
        type: "select",
        key: "mode",
        label: "Modo",
        options: [
          { value: "auto", label: "Automático" },
          { value: "manual", label: "Manual" },
        ],
      },
      {
        type: "group",
        key: "autoFilters",
        label: "Filtros automáticos",
        showWhen: { field: "mode", equals: "auto" },
        schema: [
          {
            type: "select",
            key: "source",
            label: "Fuente",
            options: [
              { value: "same-category", label: "Misma categoría" },
              { value: "same-tags", label: "Comparten categorías" },
              { value: "best-sellers", label: "Más vendidos (90 días)" },
              { value: "recently-added", label: "Más recientes" },
            ],
          },
          { type: "number", key: "limit", label: "Cantidad", min: 1, max: 12 },
          { type: "switch", key: "excludeCurrentProduct", label: "Excluir el producto actual" },
        ],
      },
      {
        type: "product-picker",
        key: "manualProductIds",
        label: "Productos",
        multiple: true,
        showWhen: { field: "mode", equals: "manual" },
      },
      {
        type: "select",
        key: "columnsDesktop",
        label: "Columnas desktop",
        options: [{ value: 3, label: "3" }, { value: 4, label: "4" }, { value: 5, label: "5" }],
      },
      {
        type: "select",
        key: "columnsMobile",
        label: "Columnas mobile",
        options: [{ value: 1, label: "1" }, { value: 2, label: "2" }],
      },
      { type: "switch", key: "showPrice", label: "Mostrar precio" },
    ],
    styleSupport: { textColor: false, alignment: false },
  },
  {
    type: "COMPARISON",
    label: "Tabla comparativa",
    icon: "Columns3",
    description: "Compara tu producto frente a la competencia con checks y X",
    scope: "universal",
    category: "social-proof",
    defaultContent: DEFAULT_CONTENT_V2.COMPARISON,
    renderer: ComparisonBlock as any,
    contentSchema: [
      { type: "text", key: "title", label: "Título", placeholder: "BENEFICIOS INIGUALABLES" },
      {
        type: "textarea",
        key: "description",
        label: "Descripción",
        rows: 3,
        placeholder: "Texto corto bajo el título",
      },
      {
        type: "text",
        key: "yoursLabel",
        label: "Etiqueta columna propia (opcional)",
        placeholder: "Tu marca",
        helpText: "Déjalo vacío para mostrar solo la columna de color sin texto en el encabezado.",
      },
      {
        type: "text",
        key: "othersLabel",
        label: "Etiqueta columna competencia",
        placeholder: "Otros",
      },
      { type: "color", key: "accentColor", label: "Color de acento", showInStyleTab: true },
      { type: "color", key: "accentTextColor", label: "Color de texto en acento", showInStyleTab: true },
      {
        type: "color",
        key: "yoursLabelColor",
        label: "Color del texto «Tu marca»",
        showInStyleTab: true,
        helpText: "Solo afecta el texto del header superior. Para pintar toda la columna usa «Color de acento».",
      },
      {
        type: "color",
        key: "othersBackgroundColor",
        label: "Fondo columna competencia",
        showInStyleTab: true,
        helpText: "Por defecto blanco.",
      },
      {
        type: "color",
        key: "othersTextColor",
        label: "Texto columna competencia",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "checkColor",
        label: "Color del check (✓)",
        showInStyleTab: true,
        helpText: "Aplica a ambas columnas. Por defecto verde con buen contraste por columna.",
      },
      {
        type: "color",
        key: "crossColor",
        label: "Color de la X (✗)",
        showInStyleTab: true,
        helpText: "Solo aplica al ✗ sobre fondo claro. El ✗ sobre acento hereda el color de texto.",
      },
      {
        type: "array",
        key: "rows",
        label: "Filas de comparación",
        addButtonText: "+ Agregar fila",
        newItem: () => ({
          id: crypto.randomUUID(),
          label: "Nueva característica",
          yours: true,
          theirs: false,
        }),
        itemLabel: (it) => (it.label as string) || "Sin etiqueta",
        itemSchema: [
          { type: "text", key: "label", label: "Característica" },
          { type: "switch", key: "yours", label: "Tu producto: ✓" },
          { type: "switch", key: "theirs", label: "Competencia: ✓" },
        ],
      },
    ],
    styleSupport: {
      alignment: false,
    },
    liveContentVars: {
      accentColor: "--block-accent",
      accentTextColor: "--block-accent-text",
      yoursLabelColor: "--block-yours-label",
      othersBackgroundColor: "--block-others-bg",
      othersTextColor: "--block-others-text",
      checkColor: "--block-check",
      crossColor: "--block-cross",
    },
  },
  {
    type: "FRIENDLY",
    label: "Friendly (beneficios + imagen)",
    icon: "BadgeCheck",
    description:
      "Lista de beneficios con check rojo a la izquierda e imagen del producto a la derecha",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.FRIENDLY,
    renderer: FriendlyBlock as any,
    contentSchema: [
      {
        type: "text",
        key: "caption",
        label: "Caption (opcional)",
        placeholder: "Texto breve sobre el título",
      },
      {
        type: "text",
        key: "heading",
        label: "Título (opcional)",
        placeholder: "Beneficios de nuestro producto",
      },
      {
        type: "textarea",
        key: "description",
        label: "Descripción (opcional)",
        rows: 3,
        placeholder: "Texto corto bajo el título",
      },
      {
        type: "custom",
        key: "__imageMedia",
        label: "Imagen",
        component: ImageTextMediaField,
      },
      { type: "text", key: "imageAlt", label: "Alt text de la imagen" },
      {
        type: "select",
        key: "imagePosition",
        label: "Posición imagen (desktop)",
        options: [
          { value: "left", label: "Izquierda" },
          { value: "right", label: "Derecha" },
        ],
      },
      {
        type: "select",
        key: "columnsDesktop",
        label: "Columnas de beneficios (desktop)",
        options: [
          { value: 1, label: "1 columna" },
          { value: 2, label: "2 columnas" },
        ],
      },
      {
        type: "color",
        key: "iconBgColor",
        label: "Fondo del check (círculo)",
        showInStyleTab: true,
        helpText: "Color del círculo que envuelve el ícono ✓.",
      },
      {
        type: "color",
        key: "iconColor",
        label: "Color del ✓",
        showInStyleTab: true,
        helpText: "Color del ícono dentro del círculo.",
      },
      {
        type: "color",
        key: "featureTitleColor",
        label: "Color título de beneficio",
        showInStyleTab: true,
        helpText: "Opcional. Si está vacío hereda el color de texto del bloque.",
      },
      {
        type: "color",
        key: "featureDescriptionColor",
        label: "Color descripción de beneficio",
        showInStyleTab: true,
        helpText: "Opcional. Si está vacío hereda el color de texto del bloque.",
      },
      {
        type: "array",
        key: "features",
        label: "Beneficios",
        addButtonText: "+ Agregar beneficio",
        newItem: () => ({
          id: crypto.randomUUID(),
          title: "Nuevo beneficio",
          description: "Describe este beneficio en una o dos frases.",
        }),
        itemLabel: (it, i) => (it.title as string) || `Beneficio ${i + 1}`,
        itemSchema: [
          { type: "text", key: "title", label: "Título" },
          { type: "textarea", key: "description", label: "Descripción", rows: 3 },
        ],
      },
    ],
    styleSupport: {
      // FriendlyBlock renders its own image-on-the-right via the inline
      // `imageUrl` data field — it never reads `media.bgImage`. Exposing
      // the "Imagen de fondo" Style control would persist a value that
      // nothing renders, so opt out.
      gradient: true,
    },
    liveContentVars: {
      iconBgColor: "--block-icon-bg",
      iconColor: "--block-icon-color",
      featureTitleColor: "--block-feature-title",
      featureDescriptionColor: "--block-feature-desc",
    },
  },
  {
    type: "CAROUSEL",
    label: "Carrusel (imagen / video)",
    icon: "GalleryHorizontalEnd",
    description:
      "Carrusel responsive con autoplay, soporte para imagen y video (YouTube/Vimeo/subido).",
    scope: "universal",
    category: "media",
    defaultContent: DEFAULT_CONTENT_V2.CAROUSEL,
    renderer: CarouselBlock as any,
    contentSchema: [
      {
        type: "text",
        key: "caption",
        label: "Caption (opcional)",
        placeholder: "Texto breve sobre el título",
      },
      {
        type: "text",
        key: "heading",
        label: "Título (opcional)",
        placeholder: "Trusted By Experts",
      },
      {
        type: "textarea",
        key: "description",
        label: "Descripción (opcional)",
        rows: 2,
        placeholder: "Texto corto bajo el título",
      },
      {
        type: "array",
        key: "slides",
        label: "Slides",
        addButtonText: "+ Agregar slide",
        newItem: () => ({
          id: crypto.randomUUID(),
          type: "image",
          imageUrl: "",
          imageUrlMobile: "",
          alt: "",
          title: "",
          caption: "",
          ctaLabel: "",
          ctaHref: "",
        }),
        itemLabel: (it, i) =>
          (it.title as string) || (it.alt as string) || `Slide ${i + 1}`,
        itemSchema: [
          {
            type: "select",
            key: "type",
            label: "Tipo",
            options: [
              { value: "image", label: "Imagen" },
              { value: "video", label: "Video" },
            ],
          },
          {
            type: "image",
            key: "imageUrl",
            label: "Imagen (desktop)",
            deviceOverride: false,
            showWhen: { field: "type", equals: "image" },
          },
          {
            type: "image",
            key: "imageUrlMobile",
            label: "Imagen (mobile, opcional)",
            deviceOverride: false,
            helpText: "Si la dejas vacía, se usa la imagen desktop también en mobile.",
            showWhen: { field: "type", equals: "image" },
          },
          {
            type: "select",
            key: "videoProvider",
            label: "Proveedor de video",
            options: [
              { value: "youtube", label: "YouTube" },
              { value: "vimeo", label: "Vimeo" },
              { value: "upload", label: "Subido (MP4)" },
            ],
            showWhen: { field: "type", equals: "video" },
          },
          {
            type: "text",
            key: "videoUrl",
            label: "URL del video",
            placeholder: "https://www.youtube.com/watch?v=...",
            showWhen: { field: "type", equals: "video" },
          },
          {
            type: "image",
            key: "videoPoster",
            label: "Poster del video (opcional)",
            deviceOverride: false,
            helpText: "Imagen mostrada antes de que se reproduzca el video subido.",
            showWhen: { field: "type", equals: "video" },
          },
          { type: "text", key: "alt", label: "Texto alternativo (accesibilidad)" },
          { type: "text", key: "title", label: "Título sobre el slide (opcional)" },
          { type: "text", key: "caption", label: "Caption sobre el slide (opcional)" },
          { type: "text", key: "ctaLabel", label: "Texto del botón (opcional)" },
          {
            type: "custom",
            key: "ctaHref",
            label: "Enlace del botón / slide",
            component: LinkUrlField,
            helpText:
              "Si lo defines y no hay texto de botón, todo el slide queda enlazado.",
          },
        ],
      },
      {
        type: "select",
        key: "aspectRatio",
        label: "Proporción del slide",
        options: [
          { value: "square", label: "Cuadrado (1:1)" },
          { value: "video", label: "Video (16:9)" },
          { value: "portrait", label: "Retrato (3:4)" },
          { value: "wide", label: "Panorámica (21:9)" },
          { value: "auto", label: "Automático" },
        ],
      },
      {
        type: "select",
        key: "slidesPerViewMobile",
        label: "Slides visibles mobile",
        options: [
          { value: 1, label: "1" },
          { value: 2, label: "2" },
          { value: 3, label: "3" },
        ],
        helpText:
          "En desktop se muestran siempre hasta 5 slides (o todos los que tengas si son menos).",
      },
      {
        type: "range",
        key: "gap",
        label: "Espacio entre slides",
        min: 0,
        max: 48,
        step: 2,
        unit: "px",
        defaultValue: 16,
      },
      {
        type: "select",
        key: "slideRadius",
        label: "Bordes redondeados",
        options: [
          { value: "none", label: "Sin redondear" },
          { value: "sm", label: "Pequeño" },
          { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" },
          { value: "xl", label: "Extra grande" },
          { value: "2xl", label: "Máximo" },
        ],
      },
      {
        type: "select",
        key: "transition",
        label: "Transición",
        options: [
          { value: "slide", label: "Deslizar" },
          { value: "fade", label: "Fundido (solo con 1 slide visible)" },
        ],
      },
      {
        type: "range",
        key: "autoplayMs",
        label: "Autoplay",
        min: 0,
        max: 12000,
        step: 500,
        unit: "ms",
        defaultValue: 5000,
        helpText: "0 = desactivar autoplay.",
      },
      { type: "switch", key: "pauseOnHover", label: "Pausar autoplay al pasar el cursor" },
      { type: "switch", key: "loop", label: "Bucle infinito" },
      { type: "switch", key: "showArrows", label: "Mostrar flechas" },
      {
        type: "select",
        key: "arrowStyle",
        label: "Estilo de las flechas",
        options: [
          { value: "circle", label: "Círculo" },
          { value: "square", label: "Cuadrado" },
          { value: "minimal", label: "Minimal (solo icono)" },
        ],
      },
      {
        type: "select",
        key: "dotStyle",
        label: "Indicadores",
        options: [
          { value: "dots", label: "Puntos" },
          { value: "bars", label: "Barras" },
          { value: "none", label: "Ocultos" },
        ],
      },
      { type: "switch", key: "textOverlayEnabled", label: "Overlay para texto sobre el slide" },
      {
        type: "color",
        key: "arrowBgColor",
        label: "Fondo de las flechas",
        showInStyleTab: true,
        helpText: "Opcional. Por defecto un negro semi-transparente.",
      },
      {
        type: "color",
        key: "arrowColor",
        label: "Color del ícono de flecha",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "dotActiveColor",
        label: "Color del indicador activo",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "dotInactiveColor",
        label: "Color del indicador inactivo",
        showInStyleTab: true,
      },
    ],
    styleSupport: {
      gradient: true,
      textColor: false,
    },
    liveContentVars: {
      arrowBgColor: "--carousel-arrow-bg",
      arrowColor: "--carousel-arrow-color",
      dotActiveColor: "--carousel-dot-active",
      dotInactiveColor: "--carousel-dot-inactive",
    },
  },
  {
    type: "PORCENTAJE_UNO",
    label: "Porcentaje uno (stats + imagen)",
    icon: "Percent",
    description:
      "Stats con porcentaje animado (cuenta desde 0), bordes ovalados arriba/abajo e imagen con hotspots interactivos.",
    scope: "universal",
    category: "social-proof",
    defaultContent: DEFAULT_CONTENT_V2.PORCENTAJE_UNO,
    renderer: PorcentajeUnoBlock as any,
    contentSchema: [
      // ─── Encabezado ──────────────────────────────────────────────────
      {
        type: "text",
        key: "caption",
        label: "Caption (opcional)",
        placeholder: "Resultados clínicos",
      },
      {
        type: "text",
        key: "heading",
        label: "Título",
        placeholder: "Human Performance Analytics",
      },
      {
        type: "textarea",
        key: "footnote",
        label: "Pie de sección (opcional)",
        rows: 3,
        placeholder:
          "Based on a 16-week double-blind clinical study...",
      },

      // ─── Imagen ──────────────────────────────────────────────────────
      {
        type: "custom",
        key: "__imageMedia",
        label: "Imagen",
        component: ImageTextMediaField,
        helpText:
          "Imagen del producto. Puedes definir una versión para desktop y otra para mobile.",
      },
      { type: "text", key: "imageAlt", label: "Texto alternativo (alt)" },
      {
        type: "select",
        key: "mediaPosition",
        label: "Posición de la imagen (desktop)",
        options: [
          { value: "left", label: "Izquierda" },
          { value: "right", label: "Derecha" },
        ],
      },

      // ─── Estadísticas ────────────────────────────────────────────────
      {
        type: "array",
        key: "stats",
        label: "Estadísticas",
        addButtonText: "+ Agregar estadística",
        newItem: () => ({
          id: crypto.randomUUID(),
          value: 88,
          suffix: "%",
          highlight: "of users",
          description: "experienced measurable improvements.",
        }),
        itemLabel: (it, i) => {
          const v = it.value as number | undefined;
          const s = it.suffix as string | undefined;
          if (typeof v === "number") return `${v}${s ?? ""}`;
          return `Stat ${i + 1}`;
        },
        itemSchema: [
          { type: "number", key: "value", label: "Número", min: 0, max: 10000 },
          { type: "text", key: "prefix", label: "Prefijo (opcional)", placeholder: "$" },
          { type: "text", key: "suffix", label: "Sufijo (opcional)", placeholder: "%" },
          {
            type: "text",
            key: "highlight",
            label: "Texto destacado (negrita)",
            placeholder: "of participants experienced",
          },
          {
            type: "textarea",
            key: "description",
            label: "Descripción",
            rows: 2,
            placeholder: "a significant increase in...",
          },
        ],
      },
      {
        type: "range",
        key: "countDurationMs",
        label: "Duración de la animación",
        min: 400,
        max: 5000,
        step: 100,
        unit: "ms",
        defaultValue: 1800,
        helpText: "Tiempo que tarda el contador en llegar al valor final.",
      },

      // ─── Hotspots sobre la imagen ────────────────────────────────────
      {
        type: "array",
        key: "hotspots",
        label: "Hotspots (círculos sobre la imagen)",
        addButtonText: "+ Agregar hotspot",
        newItem: () => ({
          id: crypto.randomUUID(),
          x: 50,
          y: 50,
          title: "Nuevo hotspot",
          description: "Descripción del hotspot.",
        }),
        itemLabel: (it, i) => (it.title as string) || `Hotspot ${i + 1}`,
        itemSchema: [
          {
            type: "range",
            key: "x",
            label: "Posición horizontal (%)",
            min: 0,
            max: 100,
            step: 1,
            unit: "%",
            defaultValue: 50,
          },
          {
            type: "range",
            key: "y",
            label: "Posición vertical (%)",
            min: 0,
            max: 100,
            step: 1,
            unit: "%",
            defaultValue: 50,
          },
          { type: "text", key: "title", label: "Título del tooltip" },
          {
            type: "textarea",
            key: "description",
            label: "Descripción del tooltip",
            rows: 3,
          },
        ],
      },

      // ─── Forma de la sección ─────────────────────────────────────────
      {
        type: "select",
        key: "curveStrength",
        label: "Curvatura ovalada (arriba/abajo)",
        options: [
          { value: "none", label: "Sin curvatura" },
          { value: "subtle", label: "Sutil" },
          { value: "normal", label: "Normal" },
          { value: "strong", label: "Pronunciada" },
        ],
      },

      // ─── Colores (Estilo) ────────────────────────────────────────────
      {
        type: "color",
        key: "numberColor",
        label: "Color de los números",
        showInStyleTab: true,
      },
      {
        type: "select",
        key: "numberWeight",
        label: "Grosor de los números",
        options: [
          { value: "regular", label: "Regular" },
          { value: "medium", label: "Medio" },
          { value: "semibold", label: "Semibold" },
          { value: "bold", label: "Bold" },
        ],
      },
      {
        type: "color",
        key: "statTextColor",
        label: "Color del texto descriptivo",
        showInStyleTab: true,
        helpText: "Opcional. Hereda el color del bloque si está vacío.",
      },
      {
        type: "color",
        key: "dividerColor",
        label: "Color de los separadores",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "hotspotColor",
        label: "Color del círculo hotspot",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "hotspotRingColor",
        label: "Color del halo del hotspot",
        showInStyleTab: true,
      },
    ],
    styleSupport: {
      // PorcentajeUnoBlock renders its image via the `__imageMedia` content
      // field (writes to `media.image`) — it never reads `media.bgImage`.
      // The "Imagen de fondo" Style control was confusing the admin: subir
      // ahí guardaba una imagen que el renderer nunca pinta. Opt out.
      gradient: true,
      // Container width is overridden by the curved wrapper (sets its own
      // width via the section element).
      containerWidth: false,
    },
    liveContentVars: {
      numberColor: "--pu-number-color",
      statTextColor: "--pu-text-color",
      dividerColor: "--pu-divider",
      hotspotColor: "--pu-hotspot",
      hotspotRingColor: "--pu-hotspot-ring",
    },
  },
  {
    type: "BANNER_TOP_TEXT",
    label: "Banner + Texto vertical (loop)",
    icon: "GalleryVerticalEnd",
    description:
      "Banner dividido en dos: imagen/video con CTA a la izquierda y frases en scroll vertical infinito a la derecha.",
    scope: "universal",
    category: "visual",
    defaultContent: DEFAULT_CONTENT_V2.BANNER_TOP_TEXT,
    renderer: BannerTopTextBlock as any,
    contentSchema: [
      // ─── Texto del banner ────────────────────────────────────────────
      {
        type: "text",
        key: "caption",
        label: "Caption (opcional)",
        placeholder: "Texto breve sobre el título",
      },
      {
        type: "text",
        key: "heading",
        label: "Título",
        placeholder: "Sooo many benefits",
      },
      {
        type: "textarea",
        key: "description",
        label: "Descripción",
        rows: 3,
        placeholder: "Texto corto bajo el título",
      },
      { type: "text", key: "ctaLabel", label: "Texto del botón (opcional)" },
      {
        type: "custom",
        key: "ctaHref",
        label: "Enlace del botón",
        component: LinkUrlField,
      },
      {
        type: "select",
        key: "ctaVariant",
        label: "Estilo del botón",
        options: [
          { value: "solid", label: "Sólido (blanco)" },
          { value: "outline", label: "Contorno" },
          { value: "glass", label: "Cristal (glassmorphism)" },
        ],
      },

      // ─── Media (imagen / video) ──────────────────────────────────────
      {
        type: "select",
        key: "mediaType",
        label: "Tipo de media",
        options: [
          { value: "image", label: "Imagen" },
          { value: "video", label: "Video (MP4 directo)" },
        ],
      },
      {
        type: "custom",
        key: "__imageMedia",
        label: "Imagen del banner",
        component: ImageTextMediaField,
        showWhen: { field: "mediaType", equals: "image" },
        helpText: "Imagen para desktop y mobile (puedes definir una por dispositivo).",
      },
      {
        type: "text",
        key: "videoUrl",
        label: "URL del video (MP4)",
        placeholder: "https://...mp4",
        showWhen: { field: "mediaType", equals: "video" },
      },
      {
        type: "image",
        key: "videoPoster",
        label: "Poster del video (opcional)",
        deviceOverride: false,
        showWhen: { field: "mediaType", equals: "video" },
      },
      {
        type: "switch",
        key: "videoAutoplay",
        label: "Reproducir automáticamente (sin sonido)",
        showWhen: { field: "mediaType", equals: "video" },
      },
      { type: "text", key: "mediaAlt", label: "Texto alternativo (accesibilidad)" },

      // ─── Layout del banner ───────────────────────────────────────────
      {
        type: "select",
        key: "mediaPosition",
        label: "Posición del media (desktop)",
        options: [
          { value: "left", label: "Izquierda" },
          { value: "right", label: "Derecha" },
        ],
      },
      {
        type: "select",
        key: "height",
        label: "Altura del banner",
        options: [
          { value: "sm", label: "Pequeña" },
          { value: "md", label: "Mediana" },
          { value: "lg", label: "Grande" },
          { value: "xl", label: "Extra grande" },
        ],
      },
      {
        type: "select",
        key: "cornerRadius",
        label: "Bordes redondeados",
        options: [
          { value: "none", label: "Sin redondear" },
          { value: "sm", label: "Pequeño" },
          { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" },
          { value: "xl", label: "Extra grande" },
          { value: "2xl", label: "Máximo" },
        ],
      },

      // ─── Overlay sobre el media ──────────────────────────────────────
      {
        type: "select",
        key: "overlayStyle",
        label: "Overlay del media",
        options: [
          { value: "none", label: "Sin overlay" },
          { value: "solid", label: "Color sólido" },
          { value: "gradient-bottom", label: "Degradado (abajo)" },
          { value: "gradient-top", label: "Degradado (arriba)" },
        ],
      },
      {
        type: "color",
        key: "overlayColor",
        label: "Color del overlay",
        showInStyleTab: true,
        helpText: "Se ignora si el overlay está en «Sin overlay».",
      },
      {
        type: "range",
        key: "overlayOpacity",
        label: "Opacidad overlay (%)",
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 35,
        helpText: "Se ignora si el overlay está en «Sin overlay».",
      },

      // ─── Scroll vertical ─────────────────────────────────────────────
      {
        type: "array",
        key: "scrollItems",
        label: "Frases (scroll vertical)",
        addButtonText: "+ Agregar frase",
        newItem: () => ({ id: crypto.randomUUID(), text: "Nueva frase" }),
        itemLabel: (it, i) => (it.text as string) || `Frase ${i + 1}`,
        itemSchema: [{ type: "text", key: "text", label: "Texto" }],
      },
      {
        type: "select",
        key: "scrollDirection",
        label: "Dirección del scroll",
        options: [
          { value: "up", label: "De abajo hacia arriba" },
          { value: "down", label: "De arriba hacia abajo" },
        ],
      },
      {
        type: "range",
        key: "scrollDurationSec",
        label: "Duración por loop (s)",
        min: 4,
        max: 120,
        step: 1,
        unit: "s",
        defaultValue: 18,
        helpText: "Tiempo total que tarda un ciclo completo. Menor = más rápido.",
      },
      { type: "switch", key: "pauseOnHover", label: "Pausar al pasar el cursor" },
      { type: "switch", key: "scrollItalic", label: "Texto en cursiva" },
      { type: "switch", key: "scrollUppercase", label: "Texto en mayúsculas" },
      {
        type: "switch",
        key: "scrollGhostOutline",
        label: "Texto contorneado (outline)",
        helpText: "Renderiza el texto como contorno en lugar de relleno.",
      },

      // ─── Colores del scroll (estilo) ─────────────────────────────────
      {
        type: "color",
        key: "scrollBgColor",
        label: "Fondo columna de scroll",
        showInStyleTab: true,
        helpText:
          "Opcional. Si lo dejas vacío usa el fondo del bloque o el esquema de color.",
      },
      {
        type: "color",
        key: "scrollTextColor",
        label: "Color del texto principal",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "scrollGhostTextColor",
        label: "Color del texto difuminado (extremos)",
        showInStyleTab: true,
        helpText:
          "Color que se aplica a las frases que asoman arriba y abajo (efecto fade).",
      },
    ],
    styleSupport: {
      gradient: true,
      // The scroll column owns its own bg/text via dedicated fields, and
      // the banner stretches edge-to-edge, so the section-level alignment
      // and text-color controls would conflict with the design.
      textColor: false,
      alignment: false,
      containerWidth: false,
    },
    liveContentVars: {
      scrollBgColor: "--btt-scroll-bg",
      scrollTextColor: "--btt-scroll-text",
      scrollGhostTextColor: "--btt-scroll-ghost",
      overlayColor: "--btt-overlay-color",
    },
  },
  {
    type: "FAQ_TWO",
    label: "Pregunta frecuente dos",
    icon: "HelpCircle",
    description:
      "FAQ a 2 columnas con título, badge de expertos y lista con divisores (FAQPage schema.org).",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.FAQ_TWO,
    renderer: FaqTwoBlock as any,
    contentSchema: [
      // ─── Encabezado ──────────────────────────────────────────────────
      {
        type: "text",
        key: "caption",
        label: "Caption (opcional)",
        placeholder: "FAQ",
        helpText: "Etiqueta corta en mayúsculas sobre el título.",
      },
      {
        type: "text",
        key: "title",
        label: "Título",
        placeholder: "We are serious about nutrition, ask away",
      },
      {
        type: "select",
        key: "headingSize",
        label: "Tamaño del título",
        options: [
          { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" },
          { value: "xl", label: "Extra grande" },
        ],
      },
      {
        type: "textarea",
        key: "description",
        label: "Descripción",
        rows: 3,
        placeholder: "Texto corto bajo el título",
      },

      // ─── Badge de expertos ───────────────────────────────────────────
      {
        type: "text",
        key: "expertsLabelTop",
        label: "Badge: texto superior",
        placeholder: "Formulated by our expert in-house",
        helpText: "Línea pequeña con peso normal (junto a los avatares).",
      },
      {
        type: "text",
        key: "expertsLabelBottom",
        label: "Badge: texto inferior (negrita)",
        placeholder: "Biologists & Clinical Researchers",
      },
      {
        type: "array",
        key: "experts",
        label: "Avatares de expertos",
        addButtonText: "+ Agregar experto",
        newItem: () => ({
          id: crypto.randomUUID(),
          imageUrl: "",
          alt: "",
          verified: true,
        }),
        itemLabel: (it, i) => (it.alt as string) || `Experto ${i + 1}`,
        itemSchema: [
          { type: "image", key: "imageUrl", label: "Foto", deviceOverride: false },
          { type: "text", key: "alt", label: "Nombre / alt text" },
          { type: "switch", key: "verified", label: "Mostrar check azul (verified)" },
        ],
      },

      // ─── Comportamiento ──────────────────────────────────────────────
      { type: "switch", key: "allowMultipleOpen", label: "Permitir varias abiertas" },
      { type: "switch", key: "defaultOpenFirst", label: "Abrir la primera por defecto" },

      // ─── Estilo de la sección ────────────────────────────────────────
      {
        type: "select",
        key: "curveStrength",
        label: "Curvatura ovalada (arriba/abajo)",
        options: [
          { value: "none", label: "Sin curvatura" },
          { value: "subtle", label: "Sutil" },
          { value: "normal", label: "Normal" },
          { value: "strong", label: "Pronunciada" },
        ],
      },
      {
        type: "select",
        key: "itemGap",
        label: "Separación entre preguntas",
        options: [
          { value: "tight", label: "Ajustada" },
          { value: "normal", label: "Normal" },
          { value: "relaxed", label: "Amplia" },
        ],
      },
      {
        type: "color",
        key: "sectionBgColor",
        label: "Color de fondo de la sección",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "titleColor",
        label: "Color del título",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "textColor",
        label: "Color del texto general",
        showInStyleTab: true,
        helpText: "Color de la descripción y el badge de expertos.",
      },
      {
        type: "color",
        key: "expertsBadgeBgColor",
        label: "Fondo del badge de expertos",
        showInStyleTab: true,
        helpText: "Color de la píldora blanca con los avatares.",
      },
      {
        type: "color",
        key: "verifiedBadgeColor",
        label: "Color del check (verified)",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "itemTextColor",
        label: "Color de preguntas y respuestas",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "dividerColor",
        label: "Color de los divisores",
        showInStyleTab: true,
      },
      {
        type: "color",
        key: "iconColor",
        label: "Color del ícono +",
        showInStyleTab: true,
      },

      // ─── Preguntas ───────────────────────────────────────────────────
      {
        type: "array",
        key: "items",
        label: "Preguntas",
        addButtonText: "+ Agregar pregunta",
        newItem: () => ({
          id: crypto.randomUUID(),
          question: "Nueva pregunta",
          answer: "",
        }),
        itemLabel: (it) => (it.question as string) || "Sin pregunta",
        itemSchema: [
          { type: "text", key: "question", label: "Pregunta" },
          { type: "textarea", key: "answer", label: "Respuesta", rows: 4 },
        ],
      },
    ],
    styleSupport: {
      gradient: true,
      // The section owns its own bg via sectionBgColor and stretches edge-to-edge.
      containerWidth: false,
      alignment: false,
      textColor: false,
    },
    liveContentVars: {
      sectionBgColor: "--faq2-bg",
      titleColor: "--faq2-title",
      textColor: "--faq2-text",
      expertsBadgeBgColor: "--faq2-badge-bg",
      verifiedBadgeColor: "--faq2-verified",
      itemTextColor: "--faq2-item-text",
      dividerColor: "--faq2-divider",
      iconColor: "--faq2-icon",
    },
  },
  {
    type: "PRODUCT_GRID",
    label: "Grid de productos",
    icon: "LayoutGrid",
    description:
      "Listado de productos de la categoría — reemplaza el grid auto-generado",
    scope: "category",
    category: "commerce",
    defaultContent: DEFAULT_CONTENT_V2.PRODUCT_GRID,
    renderer: ProductGridBlockEditor as any,
    contentSchema: [
      {
        type: "text",
        key: "title",
        label: "Título (opcional)",
        placeholder: "Todos los productos",
      },
      {
        type: "select",
        key: "columnsDesktop",
        label: "Columnas desktop",
        options: [
          { value: 2, label: "2" },
          { value: 3, label: "3" },
          { value: 4, label: "4" },
          { value: 5, label: "5" },
        ],
      },
      {
        type: "select",
        key: "columnsMobile",
        label: "Columnas mobile",
        options: [
          { value: 1, label: "1" },
          { value: 2, label: "2" },
        ],
      },
      {
        type: "number",
        key: "maxItems",
        label: "Cantidad máxima",
        min: 4,
        max: 48,
      },
      {
        type: "select",
        key: "sort",
        label: "Orden",
        options: [
          { value: "manual", label: "Manual (orden de la categoría)" },
          { value: "newest", label: "Más recientes" },
          { value: "featured", label: "Destacados primero" },
          { value: "price_asc", label: "Precio: menor a mayor" },
          { value: "price_desc", label: "Precio: mayor a menor" },
        ],
      },
    ],
    styleSupport: { textColor: false, alignment: false },
  },
]

let registered = false
export function registerExistingBlocks(): void {
  if (registered) return
  existing.forEach(registerBlock)
  registered = true
}

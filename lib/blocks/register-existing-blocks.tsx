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
const RelatedProductsBlockEditorWrapper = dynamic(() => import("@/components/shop/templates/blocks/RelatedProductsBlockEditorWrapper"))
const ProductGridBlockEditor = dynamic(() => import("@/components/shop/templates/blocks/ProductGridBlockEditor"))
const ComparisonBlock = dynamic(() => import("@/components/shop/templates/blocks/ComparisonBlock"))

// ColorsContentForm intentionally not imported — block is deprecated from the picker
import { ImageTextMediaField } from "@/components/admin/page-builder/forms/custom/ImageTextMediaField"
import { LinkUrlField } from "@/components/admin/page-builder/forms/custom/LinkUrlField"

const existing: BlockDefinition[] = [
  {
    type: "HERO",
    label: "Hero / Cabecera",
    icon: "Megaphone",
    emoji: "🖼",
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
    emoji: "🖼️",
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
    emoji: "💬",
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
    emoji: "▶️",
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
    emoji: "📢",
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
      { type: "text", key: "scrollingText", label: "Texto scrolling", placeholder: "🔥 Oferta • Envío gratis •" },
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
    emoji: "🛡️",
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
    emoji: "📝",
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
    emoji: "❓",
    description: "Acordeón de preguntas y respuestas con SEO structured data",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.FAQ,
    renderer: FaqBlock as any,
    contentSchema: [
      { type: "text", key: "title", label: "Título (opcional)" },
      { type: "switch", key: "allowMultipleOpen", label: "Permitir varias abiertas" },
      { type: "switch", key: "defaultOpenFirst", label: "Abrir la primera por defecto" },
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
  },
  {
    type: "IMAGE_TEXT",
    label: "Imagen + Texto",
    icon: "Image",
    emoji: "🖼️",
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
    type: "RELATED_PRODUCTS",
    label: "Productos relacionados",
    icon: "Package",
    emoji: "🛒",
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
    emoji: "📊",
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
    type: "PRODUCT_GRID",
    label: "Grid de productos",
    icon: "LayoutGrid",
    emoji: "🛍️",
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

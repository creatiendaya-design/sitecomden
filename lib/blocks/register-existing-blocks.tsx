import dynamic from "next/dynamic"
import { registerBlock } from "./registry"
import { DEFAULT_CONTENT_V2 } from "./defaults"
import type { BlockDefinition } from "./registry"

// Storefront renderers are the same components used in ProductLandingView.
// We reuse them unchanged in the editor canvas — they already accept
// v1 or v2 content via the bilingual reader added in Task 7.

const HeroBlock = dynamic(() => import("@/components/shop/templates/blocks/HeroBlock"))
const BenefitsBlock = dynamic(() => import("@/components/shop/templates/blocks/BenefitsBlock"))
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

import { GalleryContentForm } from "@/components/admin/page-builder/forms/adapters/GalleryContentForm"
// ColorsContentForm intentionally not imported — block is deprecated from the picker
import { ImageTextMediaField } from "@/components/admin/page-builder/forms/custom/ImageTextMediaField"

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
      { type: "text", key: "ctaText", label: "Texto del botón" },
    ],
    styleSupport: {
      bgImage: true,
      gradient: true,
      // The Hero's heading, subtitle and CTA all use their own typography +
      // text-color + alignment to keep the design coherent. Hide the controls
      // from the Style tab so admins don't see options that don't apply.
      textColor: false,
      alignment: false,
      typography: false,
    },
  },
  {
    type: "BENEFITS",
    label: "Beneficios",
    icon: "CheckCircle",
    emoji: "✅",
    description: "Grid de tarjetas con íconos y descripciones",
    scope: "universal",
    category: "visual",
    defaultContent: DEFAULT_CONTENT_V2.BENEFITS,
    renderer: BenefitsBlock as any,
    contentSchema: [
      {
        type: "array",
        key: "cards",
        label: "Tarjetas",
        addButtonText: "+ Agregar tarjeta",
        newItem: () => ({
          id: crypto.randomUUID(),
          icon: "✅",
          title: "Beneficio",
          description: "Descripción",
        }),
        itemLabel: (it) => (it.title as string) || "Sin título",
        itemSchema: [
          { type: "text", key: "icon", label: "Ícono (emoji o nombre)" },
          { type: "text", key: "title", label: "Título" },
          { type: "textarea", key: "description", label: "Descripción", rows: 2 },
        ],
      },
    ],
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
    contentForm: GalleryContentForm as any,
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
      { type: "color", key: "bgColor", label: "Color de fondo" },
      { type: "color", key: "textColor", label: "Color de texto" },
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
    description: "Texto libre con formato (títulos, negritas, listas, enlaces)",
    scope: "universal",
    category: "content",
    defaultContent: DEFAULT_CONTENT_V2.RICH_TEXT,
    renderer: RichTextBlock as any,
    contentSchema: [
      {
        type: "richtext",
        key: "html",
        label: "Contenido",
        placeholder: "Escribe el contenido aquí...",
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
      { type: "text", key: "ctaUrl", label: "URL del botón (opcional)" },
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
]

let registered = false
export function registerExistingBlocks(): void {
  if (registered) return
  existing.forEach(registerBlock)
  registered = true
}

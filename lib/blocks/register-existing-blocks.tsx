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

import { HeroContentForm } from "@/components/admin/page-builder/forms/adapters/HeroContentForm"
import { BenefitsContentForm } from "@/components/admin/page-builder/forms/adapters/BenefitsContentForm"
import { GalleryContentForm } from "@/components/admin/page-builder/forms/adapters/GalleryContentForm"
import { TestimonialsContentForm } from "@/components/admin/page-builder/forms/adapters/TestimonialsContentForm"
import { VideoContentForm } from "@/components/admin/page-builder/forms/adapters/VideoContentForm"
// ColorsContentForm intentionally not imported — block is deprecated from the picker
import { TickerContentForm } from "@/components/admin/page-builder/forms/adapters/TickerContentForm"
import { TrustBadgesContentForm } from "@/components/admin/page-builder/forms/adapters/TrustBadgesContentForm"
import { RichTextContentForm } from "@/components/admin/page-builder/forms/adapters/RichTextContentForm"
import { FaqContentForm } from "@/components/admin/page-builder/forms/adapters/FaqContentForm"
import { ImageTextContentForm } from "@/components/admin/page-builder/forms/adapters/ImageTextContentForm"
import { RelatedProductsContentForm } from "@/components/admin/page-builder/forms/adapters/RelatedProductsContentForm"

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
    contentForm: HeroContentForm as any,
    styleSupport: { bgImage: true },
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
    contentForm: BenefitsContentForm as any,
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
    contentForm: TestimonialsContentForm as any,
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
    contentForm: VideoContentForm as any,
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
    contentForm: TickerContentForm as any,
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
    contentForm: TrustBadgesContentForm as any,
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
    contentForm: RichTextContentForm as any,
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
    contentForm: FaqContentForm as any,
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
    contentForm: ImageTextContentForm as any,
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
    contentForm: RelatedProductsContentForm as any,
    styleSupport: { textColor: false, alignment: false },
  },
]

let registered = false
export function registerExistingBlocks(): void {
  if (registered) return
  existing.forEach(registerBlock)
  registered = true
}

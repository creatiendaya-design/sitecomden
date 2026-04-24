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
const ColorsBlock = dynamic(() => import("@/components/shop/templates/blocks/ColorsBlock"))
const TickerBlock = dynamic(() => import("@/components/shop/templates/blocks/TickerBlock"))
const TrustBadgesBlock = dynamic(() => import("@/components/shop/templates/blocks/TrustBadgesBlock"))

import { HeroContentForm } from "@/components/admin/page-builder/forms/adapters/HeroContentForm"
import { BenefitsContentForm } from "@/components/admin/page-builder/forms/adapters/BenefitsContentForm"
import { GalleryContentForm } from "@/components/admin/page-builder/forms/adapters/GalleryContentForm"
import { TestimonialsContentForm } from "@/components/admin/page-builder/forms/adapters/TestimonialsContentForm"
import { VideoContentForm } from "@/components/admin/page-builder/forms/adapters/VideoContentForm"
import { ColorsContentForm } from "@/components/admin/page-builder/forms/adapters/ColorsContentForm"
import { TickerContentForm } from "@/components/admin/page-builder/forms/adapters/TickerContentForm"
import { TrustBadgesContentForm } from "@/components/admin/page-builder/forms/adapters/TrustBadgesContentForm"

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
  },
  {
    type: "COLORS",
    label: "Paleta de colores",
    icon: "Palette",
    emoji: "🎨",
    description: "Define colores de marca aplicables a la landing",
    scope: "universal",
    category: "visual",
    defaultContent: DEFAULT_CONTENT_V2.COLORS,
    renderer: ColorsBlock as any,
    contentForm: ColorsContentForm as any,
  },
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
]

let registered = false
export function registerExistingBlocks(): void {
  if (registered) return
  existing.forEach(registerBlock)
  registered = true
}

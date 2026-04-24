export type LandingBlockType =
  | "HERO"
  | "BENEFITS"
  | "GALLERY"
  | "TESTIMONIALS"
  | "VIDEO"
  | "COLORS"
  | "TICKER"
  | "TRUST_BADGES"
  | "RICH_TEXT"
  | "FAQ"
  | "IMAGE_TEXT"
  | "RELATED_PRODUCTS";

export interface HeroBlockContent {
  title: string;
  subtitle?: string;
  bgImage?: string;
  overlayColor?: string;
  ctaText?: string;
}

export interface BenefitCard {
  icon: string;
  title: string;
  description: string;
}

export interface BenefitsBlockContent {
  cards: BenefitCard[];
}

export interface GalleryBlockContent {
  displayType: "slider" | "stacked";
  images: string[];
  showBuyButton: boolean;
  buyButtonText?: string;
}

export interface TestimonialItem {
  name: string;
  photo?: string;
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

export interface TestimonialsBlockContent {
  items: TestimonialItem[];
}

export interface VideoItem {
  url: string;
  title?: string;
  provider: "youtube" | "vimeo" | "upload";
}

export interface VideoBlockContent {
  displayType: "slider" | "stacked";
  videos: VideoItem[];
  showBuyButton: boolean;
  buyButtonText?: string;
}

export interface ColorsBlockContent {
  primary?: string;
  background?: string;
  cta?: string;
  text?: string;
}

export type TickerMode = "scrolling" | "countdown" | "both";

export interface TickerBlockContent {
  mode: TickerMode;
  sticky: boolean;
  scrollingText?: string;
  speed?: number;
  endsAt?: string;
  countdownLabel?: string;
  bgColor?: string;
  textColor?: string;
}

export interface TrustBadgesBlockContent {
  badges: { id: string; icon: string; title: string; subtitle?: string }[];
  layout: "horizontal" | "vertical";
  columns: 2 | 3 | 4 | 5;
  iconSize: "sm" | "md" | "lg";
  iconStyle: "outline" | "solid";
}

export interface RichTextBlockContent {
  html: string;
  maxWidth?: "prose";
}

export interface FaqBlockContent {
  title?: string;
  items: { id: string; question: string; answer: string }[];
  allowMultipleOpen?: boolean;
  defaultOpenFirst?: boolean;
}

export interface ImageTextBlockContent {
  title?: string;
  description: string;
  imagePosition: "left" | "right";
  imageAlt: string;
  ctaText?: string;
  ctaUrl?: string;
  ratioImageToText?: "40-60" | "50-50" | "60-40";
}

export interface RelatedProductsBlockContent {
  title?: string;
  mode: "manual" | "auto";
  manualProductIds?: string[];
  autoFilters?: {
    source: "same-category" | "same-tags" | "best-sellers" | "recently-added";
    limit: number;
    excludeCurrentProduct: boolean;
  };
  displayType: "carousel" | "grid";
  columnsDesktop: 3 | 4 | 5;
  columnsMobile: 1 | 2;
  showPrice: boolean;
  showRating: boolean;
  showAddToCart: boolean;
}

export type BlockContent =
  | HeroBlockContent
  | BenefitsBlockContent
  | GalleryBlockContent
  | TestimonialsBlockContent
  | VideoBlockContent
  | ColorsBlockContent
  | TickerBlockContent
  | TrustBadgesBlockContent
  | RichTextBlockContent
  | FaqBlockContent
  | ImageTextBlockContent
  | RelatedProductsBlockContent;

export interface LandingBlock {
  id: string;
  productId: string;
  type: LandingBlockType;
  position: number;
  content: BlockContent;
  createdAt: Date;
  updatedAt: Date;
}

export const BLOCK_TYPE_LABELS: Record<LandingBlockType, string> = {
  HERO: "Hero / Cabecera",
  BENEFITS: "Beneficios",
  GALLERY: "Galería",
  TESTIMONIALS: "Testimonios",
  VIDEO: "Video",
  COLORS: "Colores",
  TICKER: "Ticker / Contador",
  TRUST_BADGES: "Badges de confianza",
  RICH_TEXT: "Texto con formato",
  FAQ: "Preguntas frecuentes",
  IMAGE_TEXT: "Imagen + Texto",
  RELATED_PRODUCTS: "Productos relacionados",
};

export const BLOCK_DEFAULT_CONTENT: Record<LandingBlockType, BlockContent> = {
  HERO: { title: "Título del hero", subtitle: "", bgImage: "", overlayColor: "rgba(0,0,0,0.3)", ctaText: "Comprar ahora" },
  BENEFITS: { cards: [{ icon: "✅", title: "Beneficio", description: "Descripción del beneficio" }] },
  GALLERY: { displayType: "slider", images: [], showBuyButton: false },
  TESTIMONIALS: { items: [{ name: "Cliente", text: "Excelente producto", rating: 5 }] },
  VIDEO: { displayType: "slider", videos: [], showBuyButton: false },
  COLORS: { primary: "#3b82f6", background: "#ffffff", cta: "#dc2626", text: "#111827" },
  TICKER: { mode: "scrolling", sticky: false, scrollingText: "🔥 Oferta especial • Envío gratis •", speed: 30, bgColor: "#dc2626", textColor: "#ffffff" },
  TRUST_BADGES: { badges: [], layout: "horizontal", columns: 4, iconSize: "md", iconStyle: "outline" },
  RICH_TEXT: { html: "" },
  FAQ: { items: [] },
  IMAGE_TEXT: { description: "", imagePosition: "left", imageAlt: "" },
  RELATED_PRODUCTS: {
    mode: "auto",
    displayType: "carousel",
    columnsDesktop: 4,
    columnsMobile: 2,
    showPrice: true,
    showRating: false,
    showAddToCart: false,
  },
};

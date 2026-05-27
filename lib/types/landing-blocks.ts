/**
 * Block type id manifest.
 *
 * The DB columns that store this (`LandingBlock.type`, `TemplateBlock.type`,
 * `PageBlock.type`, `CategoryBlock.type`) are plain TEXT columns — not enum.
 * Adding a new block type only requires:
 *
 *   1. Append its string to `KnownLandingBlockType` below (so TS autocompletes
 *      it everywhere it's used).
 *   2. Add its string to `KNOWN_BLOCK_TYPES` so server actions accept it.
 *   3. Register its definition (label, renderer, schema, defaultContent)
 *      in `lib/blocks/register-existing-blocks.tsx`.
 *
 * No Prisma migration, no DB change.
 *
 * `LandingBlockType` itself is "open": it accepts any string, but TS still
 * suggests the known values via `(string & {})`. This means rows read from
 * the DB (which Prisma types as `string`) are assignable without casts,
 * while code that writes a literal still gets autocomplete.
 */
export type KnownLandingBlockType =
  | "HERO"
  | "GALLERY"
  | "TESTIMONIALS"
  | "VIDEO"
  | "COLORS"
  | "TICKER"
  | "TRUST_BADGES"
  | "RICH_TEXT"
  | "FAQ"
  | "IMAGE_TEXT"
  | "ICON_TEXT"
  | "RELATED_PRODUCTS"
  | "PRODUCT_GRID"
  | "COMPARISON";

// eslint-disable-next-line @typescript-eslint/ban-types
export type LandingBlockType = KnownLandingBlockType | (string & {});

/** Server-safe set of allowed block type ids — replaces the dropped
 *  Postgres enum. Imported by server actions to validate the `type` field
 *  on incoming create/sync payloads. Keep in sync with `KnownLandingBlockType`. */
export const KNOWN_BLOCK_TYPES: ReadonlySet<KnownLandingBlockType> = new Set<KnownLandingBlockType>([
  "HERO",
  "GALLERY",
  "TESTIMONIALS",
  "VIDEO",
  "COLORS",
  "TICKER",
  "TRUST_BADGES",
  "RICH_TEXT",
  "FAQ",
  "IMAGE_TEXT",
  "ICON_TEXT",
  "RELATED_PRODUCTS",
  "PRODUCT_GRID",
  "COMPARISON",
]);

export function isKnownBlockType(type: string): type is KnownLandingBlockType {
  return KNOWN_BLOCK_TYPES.has(type as KnownLandingBlockType);
}

/** Throws a typed error when `type` is not in `KNOWN_BLOCK_TYPES`. Use
 *  in server actions before persisting. */
export function assertKnownBlockType(type: string): asserts type is KnownLandingBlockType {
  if (!isKnownBlockType(type)) {
    throw new Error(`Bloque desconocido: "${type}". Regístralo en lib/blocks/register-existing-blocks.tsx y en KNOWN_BLOCK_TYPES.`);
  }
}

export type HeroImageFit = "cover" | "contain" | "fill" | "none";
export type HeroImagePosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
export type HeroMinHeight = "sm" | "md" | "lg" | "xl" | "screen" | "adapt";
export type HeroCornerRadius = "none" | "sm" | "md" | "lg" | "xl" | "full";
export type HeroOverlayStyle =
  | "solid"
  | "gradient-bottom"
  | "gradient-top"
  | "gradient-radial";
export type HeroContentAlignment = "left" | "center" | "right";
export type HeroCtaVariant = "solid" | "outline" | "glass";

export interface HeroBlockContent {
  title: string;
  subtitle?: string;
  bgImage?: string;
  ctaText?: string;
  /** Overlay (Plan: hero redesign). When `overlayEnabled` is false the
   *  overlay layer is skipped entirely — useful for hero photos that don't
   *  need a darkening pass. */
  overlayEnabled?: boolean;
  overlayColor?: string;
  /** 0–100. Applied as `color-mix(...)` over `overlayColor`. */
  overlayOpacity?: number;
  overlayStyle?: HeroOverlayStyle;
  /** Image fit (object-fit). Device-aware: stored as DeviceValue. */
  imageFit?: HeroImageFit | { desktop?: HeroImageFit; mobile?: HeroImageFit };
  /** Image position (object-position). Device-aware. */
  imagePosition?:
    | HeroImagePosition
    | { desktop?: HeroImagePosition; mobile?: HeroImagePosition };
  /** Minimum height preset for the hero section. Device-aware. */
  minHeight?: HeroMinHeight | { desktop?: HeroMinHeight; mobile?: HeroMinHeight };
  /** Corner radius applied to the hero wrapper. */
  cornerRadius?: HeroCornerRadius;
  /** Horizontal content alignment inside the hero. Device-aware. */
  contentAlignment?:
    | HeroContentAlignment
    | { desktop?: HeroContentAlignment; mobile?: HeroContentAlignment };
  /** Visual style of the CTA button. */
  ctaVariant?: HeroCtaVariant;
  /** Optional CTA link (overrides the default product-landing behavior on
   *  storefront pages where no landing template is attached). */
  ctaHref?: string;
  /** Optional section-wide link. When set, the entire hero becomes
   *  clickable (covers title, subtitle and background) and navigates to
   *  this URL. The CTA button keeps its own `ctaHref` and remains
   *  independently clickable on top. */
  sectionHref?: string;
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

export type RichTextHeadingSize = "small" | "medium" | "large";
export type RichTextButtonStyle = "primary" | "secondary";

export interface RichTextButton {
  label?: string;
  href?: string;
  style?: RichTextButtonStyle;
}

export interface RichTextBlockContent {
  /** Small text rendered above the heading (Dawn calls this "caption"). */
  caption?: string;
  /** Main heading text. Renders as an <h2>. Empty = hidden. */
  heading?: string;
  /** Font size for the heading. Defaults to "medium". */
  headingSize?: RichTextHeadingSize;
  /** Rich-text body (HTML, sanitized at render time). */
  html?: string;
  /** First CTA button. Hidden if `label` is empty. */
  button1?: RichTextButton;
  /** Second CTA button. Hidden if `label` is empty. */
  button2?: RichTextButton;
  /** Legacy: kept for backward compat with v1 blocks that stored a width hint. */
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

export interface IconTextCard {
  id: string;
  /** Image URL (single, not device-split). Width is controlled per-device
   *  via `imageWidthDesktop` / `imageWidthMobile`. */
  image?: string;
  /** Alt text for accessibility. */
  imageAlt?: string;
  /** Rich text (sanitized HTML) rendered below the image. */
  html?: string;
  /** Per-card background color (overrides the section's color scheme card surface). */
  bgColor?: string;
  /** Per-card text color (inherits when omitted). */
  textColor?: string;
  /** Image width in px on desktop (≥768px). */
  imageWidthDesktop?: number;
  /** Image width in px on mobile (<768px). */
  imageWidthMobile?: number;
}

export interface IconTextBlockContent {
  cards: IconTextCard[];
  columnsDesktop: 2 | 3 | 4 | 5;
  columnsMobile: 1 | 2;
  cardPadding: "sm" | "md" | "lg";
  cardCornerRadius: "none" | "sm" | "md" | "lg" | "xl";
  cardGap: "sm" | "md" | "lg";
  /** Default per-card background applied when a card has no `bgColor` of its own.
   *  Lets admins recolor every card at once without editing each one. */
  defaultCardBgColor?: string;
  /** Default per-card text color (same logic as defaultCardBgColor). */
  defaultCardTextColor?: string;
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

export interface ProductGridBlockContent {
  title?: string;
  columnsDesktop: 2 | 3 | 4 | 5;
  columnsMobile: 1 | 2;
  maxItems: number;
  sort: "manual" | "price_asc" | "price_desc" | "newest" | "featured";
}

export interface ComparisonRow {
  id: string;
  label: string;
  /** Mark for the "yours" (accent) column. true = check, false = cross. */
  yours: boolean;
  /** Mark for the "others" column. */
  theirs: boolean;
}

export interface ComparisonBlockContent {
  /** Heading shown on the left (or above the table on mobile). */
  title: string;
  /** Supporting copy shown under the heading. */
  description?: string;
  /** Optional label for the accent column header. Empty = no label. */
  yoursLabel?: string;
  /** Label for the competitor column header. */
  othersLabel: string;
  rows: ComparisonRow[];
  /** Hex color used for the accent column background (defaults to red). */
  accentColor?: string;
  /** Text color used inside the accent column (defaults to white). */
  accentTextColor?: string;
  /** Text color of the "yoursLabel" header cell — independent from the
   *  accent column's text color. Falls back to accentTextColor when unset. */
  yoursLabelColor?: string;
  /** Background of the "others" competitor column (defaults to white). */
  othersBackgroundColor?: string;
  /** Text color of the "others" column header (defaults to foreground token). */
  othersTextColor?: string;
  /** Color of the ✓ icon on both columns (defaults to a contextual green). */
  checkColor?: string;
  /** Color of the ✗ icon on the white column (defaults to slate-900). */
  crossColor?: string;
}

export type BlockContent =
  | HeroBlockContent
  | GalleryBlockContent
  | TestimonialsBlockContent
  | VideoBlockContent
  | ColorsBlockContent
  | TickerBlockContent
  | TrustBadgesBlockContent
  | RichTextBlockContent
  | FaqBlockContent
  | ImageTextBlockContent
  | IconTextBlockContent
  | RelatedProductsBlockContent
  | ProductGridBlockContent
  | ComparisonBlockContent;

export interface LandingBlock {
  id: string;
  productId: string;
  type: LandingBlockType;
  position: number;
  content: BlockContent;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @deprecated Only consumed by the legacy landing-builder v1 components
 * (components/admin/landing-builder/*). The current page-builder v2 reads
 * labels from each `BlockDefinition.label` in `lib/blocks/registry.ts`.
 * When adding a new block type, DO NOT add it here — register it in
 * `lib/blocks/register-existing-blocks.tsx` instead.
 */
export const BLOCK_TYPE_LABELS: Record<LandingBlockType, string> = {
  HERO: "Hero / Cabecera",
  GALLERY: "Galería",
  TESTIMONIALS: "Testimonios",
  VIDEO: "Video",
  COLORS: "Colores",
  TICKER: "Ticker / Contador",
  TRUST_BADGES: "Badges de confianza",
  RICH_TEXT: "Texto con formato",
  FAQ: "Preguntas frecuentes",
  IMAGE_TEXT: "Imagen + Texto",
  ICON_TEXT: "Icono + Texto (cards)",
  RELATED_PRODUCTS: "Productos relacionados",
  PRODUCT_GRID: "Grid de productos",
  COMPARISON: "Tabla comparativa",
};

/**
 * @deprecated Only consumed by the legacy landing-builder v1 components.
 * The current page-builder v2 reads defaults from
 * `lib/blocks/defaults.ts#DEFAULT_CONTENT_V2` (which is the v2
 * `{ data, style, media }` shape, not this flat v1 shape).
 * When adding a new block type, DO NOT add it here — define its
 * defaults in `DEFAULT_CONTENT_V2` and the registry entry instead.
 */
export const BLOCK_DEFAULT_CONTENT: Record<LandingBlockType, BlockContent> = {
  HERO: { title: "Título del hero", subtitle: "", bgImage: "", overlayColor: "rgba(0,0,0,0.3)", ctaText: "Comprar ahora" },
  GALLERY: { displayType: "slider", images: [], showBuyButton: false },
  TESTIMONIALS: { items: [{ name: "Cliente", text: "Excelente producto", rating: 5 }] },
  VIDEO: { displayType: "slider", videos: [], showBuyButton: false },
  COLORS: { primary: "#3b82f6", background: "#ffffff", cta: "#dc2626", text: "#111827" },
  TICKER: { mode: "scrolling", sticky: false, scrollingText: "🔥 Oferta especial • Envío gratis •", speed: 30, bgColor: "#dc2626", textColor: "#ffffff" },
  TRUST_BADGES: { badges: [], layout: "horizontal", columns: 4, iconSize: "md", iconStyle: "outline" },
  RICH_TEXT: { html: "" },
  FAQ: { items: [] },
  IMAGE_TEXT: { description: "", imagePosition: "left", imageAlt: "" },
  ICON_TEXT: {
    cards: [],
    columnsDesktop: 4,
    columnsMobile: 2,
    cardPadding: "md",
    cardCornerRadius: "lg",
    cardGap: "md",
  },
  RELATED_PRODUCTS: {
    mode: "auto",
    displayType: "carousel",
    columnsDesktop: 4,
    columnsMobile: 2,
    showPrice: true,
    showRating: false,
    showAddToCart: false,
  },
  PRODUCT_GRID: {
    title: "",
    columnsDesktop: 4,
    columnsMobile: 2,
    maxItems: 12,
    sort: "manual",
  },
  COMPARISON: {
    title: "BENEFICIOS INIGUALABLES",
    description: "Una comparación honesta frente a la competencia.",
    yoursLabel: "",
    othersLabel: "Otros",
    rows: [
      { id: "r1", label: "Auto aplicación", yours: true, theirs: false },
      { id: "r2", label: "1 año de garantía", yours: true, theirs: false },
      { id: "r3", label: "Rápido y eficiente", yours: true, theirs: false },
      { id: "r4", label: "Costo $$$", yours: false, theirs: true },
    ],
    accentColor: "#dc2626",
    accentTextColor: "#ffffff",
  },
};

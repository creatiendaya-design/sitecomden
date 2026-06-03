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
  | "COMPARISON"
  | "FRIENDLY"
  | "CAROUSEL"
  | "BANNER_TOP_TEXT"
  | "PORCENTAJE_UNO"
  | "FAQ_TWO"
  | "CART_MAIN";

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
  "FRIENDLY",
  "CAROUSEL",
  "BANNER_TOP_TEXT",
  "PORCENTAJE_UNO",
  "FAQ_TWO",
  "CART_MAIN",
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

/**
 * A video chosen from the media library (Cloudflare Stream or an uploaded
 * blob). When present on a VideoItem it takes precedence over the manual
 * `url`/`provider` fields. Stored under the item's `library` key.
 */
export interface LibraryVideoSelection {
  mediaFileId: string;
  /** "cloudflare" → embed via iframe; "blob" → <video> direct playback. */
  kind: "cloudflare" | "blob";
  /** Iframe URL (Cloudflare) or direct blob URL. Self-contained for playback. */
  url: string;
  /** Cloudflare Stream video uid, when kind === "cloudflare". */
  streamUid?: string;
  thumbnailUrl?: string;
  title?: string;
}

export interface VideoItem {
  url: string;
  title?: string;
  provider: "youtube" | "vimeo" | "upload";
  /**
   * Which source to play. "library" → use `library`; "url" → use `url`/`provider`.
   * Legacy items without this field fall back to: library if present, else url.
   */
  source?: "url" | "library";
  /** A video picked from the media library (used when source === "library"). */
  library?: LibraryVideoSelection;
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

export type FaqItemRadius = "md" | "lg" | "xl" | "2xl" | "full";
export type FaqItemGap = "tight" | "normal" | "relaxed";
export type FaqHeadingSize = "md" | "lg" | "xl";

export interface FaqBlockContent {
  /** Eyebrow / small label above the heading. Optional. */
  caption?: string;
  title?: string;
  /** Optional description rendered under the title (plain text). */
  description?: string;
  /** Size preset for the heading. */
  headingSize?: FaqHeadingSize;
  items: { id: string; question: string; answer: string }[];
  allowMultipleOpen?: boolean;
  defaultOpenFirst?: boolean;
  /** Background color of each FAQ pill (open + closed). */
  itemBgColor?: string;
  /** Background color when the item is OPEN (defaults to itemBgColor). */
  itemOpenBgColor?: string;
  /** Text color for question and answer. */
  itemTextColor?: string;
  /** Color of the chevron icon. Defaults to itemTextColor. */
  chevronColor?: string;
  /** Corner radius of each pill. `full` produces a stadium when closed. */
  itemRadius?: FaqItemRadius;
  /** Vertical spacing between pills. */
  itemGap?: FaqItemGap;
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

export interface FriendlyFeature {
  id: string;
  /** Title shown next to the check icon. */
  title: string;
  /** Supporting copy displayed below the title. */
  description: string;
}

export type FriendlyImagePosition = "left" | "right";

export type CarouselSlideType = "image" | "video";
export type CarouselVideoProvider = "youtube" | "vimeo" | "upload";
export type CarouselAspectRatio = "square" | "video" | "portrait" | "wide" | "auto";
export type CarouselSlidesPerView = 1 | 2 | 3 | 4 | 5;
export type CarouselTransition = "slide" | "fade";
export type CarouselArrowStyle = "circle" | "square" | "minimal";
export type CarouselDotStyle = "dots" | "bars" | "none";

export interface CarouselSlide {
  id: string;
  type: CarouselSlideType;
  /** Image URL (when type === "image"). */
  imageUrl?: string;
  /** Mobile-specific image URL (when type === "image"). Falls back to imageUrl. */
  imageUrlMobile?: string;
  /** Video URL or embed source (when type === "video"). */
  videoUrl?: string;
  /** Video provider — controls whether to render <video> or an iframe. */
  videoProvider?: CarouselVideoProvider;
  /** Poster image for self-hosted videos. */
  videoPoster?: string;
  /** Alt text for images / video accessibility label. */
  alt?: string;
  /** Optional caption shown over the slide. */
  caption?: string;
  /** Optional title shown over the slide. */
  title?: string;
  /** Optional CTA label. Hidden if empty. */
  ctaLabel?: string;
  /** Optional CTA URL. */
  ctaHref?: string;
}

export interface CarouselBlockContent {
  /** Section title displayed above the carousel. Optional. */
  heading?: string;
  /** Eyebrow / small heading above the title. Optional. */
  caption?: string;
  /** Short description below the title. Optional. */
  description?: string;
  /** Ordered slides. */
  slides: CarouselSlide[];
  /** Slides visible per "page" on desktop (≥1024px). */
  slidesPerViewDesktop: CarouselSlidesPerView;
  /** Slides visible per "page" on tablet (640–1023px). */
  slidesPerViewTablet: 1 | 2 | 3;
  /** Slides visible per "page" on mobile (<640px). */
  slidesPerViewMobile: 1 | 2 | 3;
  /** Auto-advance to next slide every N ms. 0 disables autoplay. */
  autoplayMs: number;
  /** Pause autoplay when the user hovers the carousel. */
  pauseOnHover: boolean;
  /** Loop infinitely instead of stopping at the last slide. */
  loop: boolean;
  /** Transition effect between slides. */
  transition: CarouselTransition;
  /** Show prev/next arrows. */
  showArrows: boolean;
  /** Visual style of the arrows. */
  arrowStyle: CarouselArrowStyle;
  /** Pagination indicators style. */
  dotStyle: CarouselDotStyle;
  /** Aspect ratio of each slide. */
  aspectRatio: CarouselAspectRatio;
  /** Gap between slides in pixels. */
  gap: number;
  /** Corner radius of each slide (Tailwind preset). */
  slideRadius: "none" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** Render a subtle bottom-to-top gradient over each slide so text stays
   *  legible. Ignored when there is no overlay text. */
  textOverlayEnabled: boolean;
  /** Optional override: arrow background color. */
  arrowBgColor?: string;
  /** Optional override: arrow icon / text color. */
  arrowColor?: string;
  /** Optional override: active dot color. */
  dotActiveColor?: string;
  /** Optional override: inactive dot color. */
  dotInactiveColor?: string;
}

export type PorcentajeUnoCurveStrength = "none" | "subtle" | "normal" | "strong";
export type PorcentajeUnoMediaPosition = "left" | "right";
export type PorcentajeUnoNumberWeight = "regular" | "medium" | "semibold" | "bold";

export interface PorcentajeUnoStat {
  id: string;
  /** Numeric value (0-100 typical, but accepts any integer). */
  value: number;
  /** Suffix shown after the animated number (e.g. "%", "x", "+"). */
  suffix?: string;
  /** Prefix shown before the animated number (e.g. "$"). */
  prefix?: string;
  /** Bold lead-in text rendered before `description`. */
  highlight?: string;
  /** Rest of the descriptive line (plain text). */
  description: string;
}

export interface PorcentajeUnoHotspot {
  id: string;
  /** Horizontal position over the image, 0–100 (% from left). */
  x: number;
  /** Vertical position over the image, 0–100 (% from top). */
  y: number;
  /** Tooltip card title. */
  title: string;
  /** Tooltip card body (plain text or simple paragraph). */
  description: string;
}

export interface PorcentajeUnoBlockContent {
  /** Eyebrow caption above the main heading. Optional. */
  caption?: string;
  /** Main heading (e.g. "Human Performance Analytics"). */
  heading?: string;
  /** Alt text for the side image. */
  imageAlt?: string;
  /** Statistics rendered on the right column. */
  stats: PorcentajeUnoStat[];
  /** Footnote rendered at the bottom (plain text, italic-style). */
  footnote?: string;
  /** Interactive hotspots placed on top of the image. */
  hotspots: PorcentajeUnoHotspot[];
  /** Position of the media column on desktop. Mobile always stacks media on top. */
  mediaPosition?: PorcentajeUnoMediaPosition;
  /** Curvature strength of the top/bottom oval edges. */
  curveStrength?: PorcentajeUnoCurveStrength;
  /** Animation duration in milliseconds for the number counter. */
  countDurationMs?: number;
  /** Color of the big animated numbers (defaults to a soft accent). */
  numberColor?: string;
  /** Font weight of the big animated numbers. */
  numberWeight?: PorcentajeUnoNumberWeight;
  /** Color of the description text next to each stat. */
  statTextColor?: string;
  /** Color of the divider lines between stats. */
  dividerColor?: string;
  /** Background color of the hotspot dots. */
  hotspotColor?: string;
  /** Ring/halo color around hotspot dots when hovered. */
  hotspotRingColor?: string;
}

export type BannerTopTextMediaType = "image" | "video";
export type BannerTopTextMediaPosition = "left" | "right";
export type BannerTopTextScrollDirection = "up" | "down";
export type BannerTopTextHeight = "sm" | "md" | "lg" | "xl";
export type BannerTopTextCornerRadius = "none" | "sm" | "md" | "lg" | "xl" | "2xl";
export type BannerTopTextOverlayStyle = "none" | "solid" | "gradient-bottom" | "gradient-top";
export type BannerTopTextCtaVariant = "solid" | "outline" | "glass";

export interface BannerTopTextScrollItem {
  id: string;
  text: string;
}

export interface BannerTopTextBlockContent {
  /** Eyebrow / small heading above the main heading. Optional. */
  caption?: string;
  /** Main heading shown above the description. Optional. */
  heading?: string;
  /** Short paragraph below the heading. Optional. */
  description?: string;
  /** CTA label. Hidden if empty. */
  ctaLabel?: string;
  /** CTA target URL. Hidden if empty. */
  ctaHref?: string;
  /** Visual style of the CTA button. */
  ctaVariant?: BannerTopTextCtaVariant;
  /** Type of media for the left column. */
  mediaType?: BannerTopTextMediaType;
  /** Image alt / accessibility label for the media. */
  mediaAlt?: string;
  /** Self-hosted MP4 video URL when mediaType === "video". */
  videoUrl?: string;
  /** Optional poster shown before the video starts. */
  videoPoster?: string;
  /** Loop the video silently in the background. */
  videoAutoplay?: boolean;
  /** Position of the media column on desktop. Mobile stacks. */
  mediaPosition?: BannerTopTextMediaPosition;
  /** Height preset for the banner (mobile + desktop share the preset). */
  height?: BannerTopTextHeight;
  /** Corner radius of the whole banner wrapper. */
  cornerRadius?: BannerTopTextCornerRadius;
  /** Overlay style applied over the media to keep text legible. */
  overlayStyle?: BannerTopTextOverlayStyle;
  /** Overlay color (hex/CSS). */
  overlayColor?: string;
  /** Overlay opacity 0-100. */
  overlayOpacity?: number;
  /** Items rendered in the vertical infinite scroll on the right column. */
  scrollItems: BannerTopTextScrollItem[];
  /** Direction of the scroll loop. */
  scrollDirection?: BannerTopTextScrollDirection;
  /** Total seconds for one full loop. Lower = faster. */
  scrollDurationSec?: number;
  /** Pause the scroll on hover. */
  pauseOnHover?: boolean;
  /** Background color of the scroll column (independent of media). */
  scrollBgColor?: string;
  /** Color of the visible (fully opaque) text in the scroll column. */
  scrollTextColor?: string;
  /** Color of the dimmed / outlined text above and below. */
  scrollGhostTextColor?: string;
  /** Render dimmed items as outlined (stroke-only). */
  scrollGhostOutline?: boolean;
  /** Apply italic styling to scroll items (matches the reference design). */
  scrollItalic?: boolean;
  /** Apply uppercase styling to scroll items. */
  scrollUppercase?: boolean;
}

export type FaqTwoCurveStrength = "none" | "subtle" | "normal" | "strong";
export type FaqTwoHeadingSize = "md" | "lg" | "xl";
export type FaqTwoItemGap = "tight" | "normal" | "relaxed";

export interface FaqTwoExpert {
  id: string;
  /** Avatar image URL. */
  imageUrl?: string;
  /** Alt text / accessible label for the avatar. */
  alt?: string;
  /** Show a small blue "verified" badge on the avatar. */
  verified?: boolean;
}

export interface FaqTwoItem {
  id: string;
  question: string;
  /** Plain-text answer (rendered as paragraphs). */
  answer: string;
}

export interface FaqTwoBlockContent {
  /** Eyebrow / small label above the title. Optional. */
  caption?: string;
  /** Main heading. */
  title?: string;
  /** Size preset for the heading. */
  headingSize?: FaqTwoHeadingSize;
  /** Short paragraph below the title. Optional. */
  description?: string;
  /** Top line of the expert badge — slightly lighter weight. */
  expertsLabelTop?: string;
  /** Bottom line of the expert badge — bold. */
  expertsLabelBottom?: string;
  /** Avatars shown inside the expert badge pill. */
  experts: FaqTwoExpert[];
  /** FAQ rows. */
  items: FaqTwoItem[];
  allowMultipleOpen?: boolean;
  defaultOpenFirst?: boolean;
  /** Curvature of the section's top/bottom edges (oval radius). */
  curveStrength?: FaqTwoCurveStrength;
  /** Vertical spacing between FAQ rows. */
  itemGap?: FaqTwoItemGap;
  /** Background color of the whole section pill. */
  sectionBgColor?: string;
  /** Color of the section heading. Falls back to the block text color. */
  titleColor?: string;
  /** Color of the supporting copy + expert badge text. */
  textColor?: string;
  /** Background of the expert badge pill (white in the reference). */
  expertsBadgeBgColor?: string;
  /** Color of the small verified checkmark on each avatar. */
  verifiedBadgeColor?: string;
  /** Color of the FAQ question / answer text. */
  itemTextColor?: string;
  /** Color of the divider between FAQ rows. */
  dividerColor?: string;
  /** Color of the +/− toggle icon. */
  iconColor?: string;
}

export interface FriendlyBlockContent {
  /** Eyebrow / small heading above the feature list. Optional. */
  caption?: string;
  /** Main heading shown above the features. Optional. */
  heading?: string;
  /** Short paragraph below the heading. Optional. */
  description?: string;
  /** 2–6 feature items, each with a red check icon. */
  features: FriendlyFeature[];
  /** Image position on desktop. Mobile always stacks image below the text. */
  imagePosition: FriendlyImagePosition;
  /** Alt text for the side image. */
  imageAlt?: string;
  /** Number of columns the features take on desktop. */
  columnsDesktop: 1 | 2;
  /** Hex/CSS color for the circular check icon background. */
  iconBgColor?: string;
  /** Hex/CSS color for the check glyph inside the circle. */
  iconColor?: string;
  /** Hex/CSS color for each feature title. Inherits text when empty. */
  featureTitleColor?: string;
  /** Hex/CSS color for each feature description. Inherits text when empty. */
  featureDescriptionColor?: string;
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
  | ComparisonBlockContent
  | FriendlyBlockContent
  | CarouselBlockContent
  | BannerTopTextBlockContent
  | PorcentajeUnoBlockContent
  | FaqTwoBlockContent;

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
  FRIENDLY: "Friendly (beneficios + imagen)",
  CAROUSEL: "Carrusel (imagen / video)",
  BANNER_TOP_TEXT: "Banner + Texto vertical (loop)",
  PORCENTAJE_UNO: "Porcentaje uno (stats + imagen)",
  FAQ_TWO: "Pregunta frecuente dos",
  CART_MAIN: "Carrito principal",
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
  TICKER: { mode: "scrolling", sticky: false, scrollingText: "Oferta especial • Envío gratis •", speed: 30, bgColor: "#dc2626", textColor: "#ffffff" },
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
  FRIENDLY: {
    features: [
      { id: "f1", title: "Increase blood flow", description: "Mejora la circulación de tu cuerpo de forma natural." },
      { id: "f2", title: "Release toxins", description: "Libera toxinas acumuladas con facilidad." },
      { id: "f3", title: "Prevent injuries", description: "Reduce inflamación y previene lesiones." },
      { id: "f4", title: "Easy to use", description: "Compacto y fácil de usar en cualquier lugar." },
    ],
    imagePosition: "right",
    imageAlt: "",
    columnsDesktop: 2,
    iconBgColor: "#dc2626",
    iconColor: "#ffffff",
  },
  CAROUSEL: {
    slides: [],
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
  },
  BANNER_TOP_TEXT: {
    scrollItems: [],
    mediaType: "image",
    mediaPosition: "left",
    height: "lg",
    cornerRadius: "none",
    scrollDirection: "up",
    scrollDurationSec: 18,
    pauseOnHover: true,
    scrollItalic: true,
    scrollUppercase: true,
  },
  PORCENTAJE_UNO: {
    stats: [],
    hotspots: [],
    mediaPosition: "left",
    curveStrength: "normal",
    countDurationMs: 1800,
    numberWeight: "bold",
  },
  FAQ_TWO: {
    experts: [],
    items: [],
    allowMultipleOpen: false,
    defaultOpenFirst: false,
    curveStrength: "normal",
    itemGap: "normal",
  },
  // CART_MAIN is a v2-only block — every customizable label lives in
  // `data` on the v2 content shape (see lib/blocks/defaults.ts). This
  // legacy v1 record is only consumed by the deprecated landing-builder
  // v1 components, so an empty placeholder keeps the type complete
  // without re-encoding the v2 schema here.
  CART_MAIN: {},
};

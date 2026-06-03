/**
 * JSON-LD builders for schema.org structured data.
 * Output is fed into a <script type="application/ld+json"> tag.
 *
 * Keep these pure — no DB calls, no Next imports. Callers fetch data and
 * pass it in so the builders stay testable.
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface ProductOfferInput {
  url: string;
  price: number;
  priceCurrency: string;
  availability: "InStock" | "OutOfStock" | "PreOrder";
  sku?: string | null;
  /** ISO 8601 date string (YYYY-MM-DD) until which this price is valid. */
  priceValidUntil?: string;
}

export interface ShippingDetailsInput {
  /** ISO 3166-1 alpha-2 country code, e.g. "PE". */
  countryCode: string;
  /** Cost in `priceCurrency`. 0 means free shipping. */
  shippingRate: number;
  priceCurrency: string;
  /** Minimum business days until handover to carrier. */
  handlingTimeMinDays: number;
  handlingTimeMaxDays: number;
  /** Minimum business days in transit. */
  transitTimeMinDays: number;
  transitTimeMaxDays: number;
}

export interface MerchantReturnPolicyInput {
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string;
  /** Days after delivery during which a return can be initiated. */
  returnDays: number;
  /** Whether the buyer pays return shipping. */
  buyerPaysReturnShipping: boolean;
}

export interface ReviewInput {
  /** 1–5. */
  rating: number;
  author: string;
  title?: string | null;
  body?: string | null;
  /** ISO 8601 datetime. */
  datePublished: string;
}

export interface AggregateRatingInput {
  /** Average rating, 1–5. */
  ratingValue: number;
  /** Number of written reviews (text + rating). Drives `reviewCount`. */
  reviewCount: number;
  /**
   * Total number of ratings (with or without text). When provided, emitted as
   * schema.org `ratingCount` — Google distinguishes it from `reviewCount` and
   * uses it for the star count shown in rich results. Defaults to
   * `reviewCount` when omitted.
   */
  ratingCount?: number;
}

export interface ProductSchemaInput {
  name: string;
  description: string;
  images: string[];
  sku?: string | null;
  brand?: string | null;
  category?: string | null;
  offer: ProductOfferInput;
  /** Defaults to NewCondition when omitted. */
  itemCondition?: "NewCondition" | "UsedCondition" | "RefurbishedCondition";
  aggregateRating?: AggregateRatingInput;
  reviews?: ReviewInput[];
  shippingDetails?: ShippingDetailsInput;
  merchantReturnPolicy?: MerchantReturnPolicyInput;
}

const SCHEMA_CONTEXT = "https://schema.org";

export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function buildOffer(input: ProductSchemaInput) {
  const { offer, merchantReturnPolicy, shippingDetails } = input;

  return {
    "@type": "Offer",
    url: offer.url,
    price: offer.price.toFixed(2),
    priceCurrency: offer.priceCurrency,
    availability: `https://schema.org/${offer.availability}`,
    itemCondition: `https://schema.org/${input.itemCondition ?? "NewCondition"}`,
    ...(offer.sku ? { sku: offer.sku } : {}),
    ...(offer.priceValidUntil
      ? { priceValidUntil: offer.priceValidUntil }
      : {}),
    ...(shippingDetails
      ? {
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: {
              "@type": "MonetaryAmount",
              value: shippingDetails.shippingRate.toFixed(2),
              currency: shippingDetails.priceCurrency,
            },
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: shippingDetails.countryCode,
            },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: {
                "@type": "QuantitativeValue",
                minValue: shippingDetails.handlingTimeMinDays,
                maxValue: shippingDetails.handlingTimeMaxDays,
                unitCode: "DAY",
              },
              transitTime: {
                "@type": "QuantitativeValue",
                minValue: shippingDetails.transitTimeMinDays,
                maxValue: shippingDetails.transitTimeMaxDays,
                unitCode: "DAY",
              },
            },
          },
        }
      : {}),
    ...(merchantReturnPolicy
      ? {
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: merchantReturnPolicy.countryCode,
            returnPolicyCategory:
              "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: merchantReturnPolicy.returnDays,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: merchantReturnPolicy.buyerPaysReturnShipping
              ? "https://schema.org/ReturnShippingFees"
              : "https://schema.org/FreeReturn",
          },
        }
      : {}),
  };
}

export function buildProductSchema(input: ProductSchemaInput) {
  const { aggregateRating, reviews } = input;

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.images,
    ...(input.sku ? { sku: input.sku, mpn: input.sku } : {}),
    ...(input.brand
      ? { brand: { "@type": "Brand", name: input.brand } }
      : {}),
    ...(input.category ? { category: input.category } : {}),
    offers: buildOffer(input),
    ...(aggregateRating && aggregateRating.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: aggregateRating.ratingValue.toFixed(1),
            reviewCount: aggregateRating.reviewCount,
            ratingCount:
              aggregateRating.ratingCount ?? aggregateRating.reviewCount,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
    ...(reviews && reviews.length > 0
      ? {
          review: reviews.map((r) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
            author: { "@type": "Person", name: r.author },
            datePublished: r.datePublished,
            ...(r.title ? { name: r.title } : {}),
            ...(r.body ? { reviewBody: r.body } : {}),
          })),
        }
      : {}),
  };
}

export interface WebSiteSchemaInput {
  name: string;
  url: string;
  searchUrlTemplate?: string;
}

export function buildWebSiteSchema(input: WebSiteSchemaInput) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    name: input.name,
    url: input.url,
    ...(input.searchUrlTemplate
      ? {
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: input.searchUrlTemplate,
            },
            "query-input": "required name=search_term_string",
          },
        }
      : {}),
  };
}

export interface ItemListEntryInput {
  url: string;
  name: string;
  image?: string | null;
}

/**
 * ItemList schema for collections (category pages, search results).
 * LLMs use this to understand which products belong to a listing.
 */
export function buildItemListSchema(items: ItemListEntryInput[]) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.url,
      name: item.name,
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}

export interface OnlineStoreSchemaInput {
  name: string;
  url: string;
  logo?: string | null;
  description: string;
  email?: string | null;
  phone?: string | null;
  streetAddress?: string | null;
  /** ISO 3166-1 alpha-2, e.g. "PE". */
  countryCode: string;
  sameAs?: Array<string | null | undefined>;
  /** ISO 4217, e.g. "PEN". */
  currenciesAccepted: string;
  /** Examples: "Visa", "Mastercard", "Yape", "Plin", "PayPal", "COD". */
  paymentAccepted: string[];
  /** ISO 3166-1 alpha-2 region(s) the store serves. */
  areaServed: string[];
  /** "$$" style range, optional. */
  priceRange?: string;
}

/**
 * `OnlineStore` (subtype of `Store`/`Organization`) — richer than a bare
 * `Organization` for retail. Generative shopping engines (Copilot Shopping,
 * Perplexity) prefer this for comparing merchants.
 */
export function buildOnlineStoreSchema(input: OnlineStoreSchemaInput) {
  const sameAs = (input.sameAs ?? []).filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "OnlineStore",
    name: input.name,
    url: input.url,
    description: input.description,
    ...(input.logo ? { logo: input.logo, image: input.logo } : {}),
    ...(input.streetAddress
      ? {
          address: {
            "@type": "PostalAddress",
            addressCountry: input.countryCode,
            streetAddress: input.streetAddress,
          },
        }
      : {}),
    ...(input.email || input.phone
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "Customer Service",
            ...(input.email ? { email: input.email } : {}),
            ...(input.phone ? { telephone: input.phone } : {}),
            availableLanguage: ["Spanish"],
            areaServed: input.areaServed,
          },
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    currenciesAccepted: input.currenciesAccepted,
    paymentAccepted: input.paymentAccepted.join(", "),
    areaServed: input.areaServed,
    ...(input.priceRange ? { priceRange: input.priceRange } : {}),
  };
}

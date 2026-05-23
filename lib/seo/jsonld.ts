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
}

export interface ProductSchemaInput {
  name: string;
  description: string;
  images: string[];
  sku?: string | null;
  brand?: string | null;
  category?: string | null;
  offer: ProductOfferInput;
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

export function buildProductSchema(input: ProductSchemaInput) {
  const { offer } = input;
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.images,
    ...(input.sku ? { sku: input.sku } : {}),
    ...(input.brand
      ? { brand: { "@type": "Brand", name: input.brand } }
      : {}),
    ...(input.category ? { category: input.category } : {}),
    offers: {
      "@type": "Offer",
      url: offer.url,
      price: offer.price.toFixed(2),
      priceCurrency: offer.priceCurrency,
      availability: `https://schema.org/${offer.availability}`,
      ...(offer.sku ? { sku: offer.sku } : {}),
    },
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

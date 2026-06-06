import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import ProductTracking from "./tracking-client";
import Breadcrumbs from "@/components/shop/Breadcrumbs";
import { getFrequentlyBoughtTogether } from "@/actions/recommendations";
import { getProductImageUrl, getAllProductImages } from "@/lib/image-utils";
import ProductStandardView from "@/components/shop/templates/ProductStandardView";
import ProductLandingView from "@/components/shop/templates/ProductLandingView";
import { ProductSectionsRenderer } from "@/components/shop/theme-sections/product/ProductSectionsRenderer";
import type { FbtRecommendationForRender } from "@/components/shop/theme-sections/product/types";
import { getThemedSections } from "@/lib/theme-sections/resolve-active-sections";
import { resolveProductBlocksFromLoaded } from "@/lib/blocks/resolve-product-blocks";
import type { LandingBlock } from "@/lib/types/landing-blocks";
import type { CheckoutMode } from "@/lib/types/cod-form";
import type {
  CodFormTemplateData,
  ShippingRestriction,
} from "@/lib/cod-forms/types";
import type {
  SizeGuideData,
  SizeGuideTab,
  SizeGuideTable,
} from "@/lib/size-guides/types";
import { getPublicPromotionsForProduct } from "@/lib/promotions/server";
import { getSiteSettings } from "@/lib/site-settings";
import { getCspNonce } from "@/lib/csp";
import {
  buildBreadcrumbList,
  buildProductSchema,
} from "@/lib/seo/jsonld";

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Two layers of caching:
// 1. `unstable_cache` — cross-request cache (60s TTL, keyed by slug). Tagged
//    so server actions can invalidate via revalidateTag(`product:${slug}`)
//    when the admin saves changes.
// 2. React `cache` — per-request dedupe between generateMetadata and the
//    page render so we only call into the cached fetcher once per request.
const fetchProductBySlug = (slug: string) =>
  prisma.product.findUnique({
    where: { slug, active: true },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      variants: {
        where: { active: true },
        orderBy: { price: "asc" },
      },
      options: {
        include: {
          values: {
            orderBy: { position: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
      landingBlocks: {
        orderBy: { position: "asc" },
      },
      customizableTemplate: {
        select: { id: true, surcharge: true },
      },
      sizeGuide: { where: { active: true } },
      codFormTemplate: {
        include: {
          blocks: { orderBy: { position: "asc" } },
          thankYouPage: { select: { slug: true } },
        },
      },
      // SEO/GEO: approved reviews feed AggregateRating + review[] in the
      // Product JSON-LD. Capped at 20 to keep the script tag small; the
      // average is computed from this slice so storefront and schema agree.
      reviews: {
        where: { approved: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

const getProductBySlug = cache((slug: string) =>
  unstable_cache(
    () => fetchProductBySlug(slug),
    ["product-by-slug", slug],
    { revalidate: 60, tags: [`product:${slug}`, "products"] },
  )(),
);

function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSiteSettings(),
  ]);

  if (!product) {
    return {
      title: "Producto no encontrado",
      robots: { index: false, follow: false },
    };
  }

  const title = product.metaTitle ?? product.name;
  const rawDescription =
    product.metaDescription ??
    product.shortDescription ??
    stripHtml(product.description);
  const description =
    rawDescription && rawDescription.length > 0
      ? rawDescription.slice(0, 160)
      : settings.seo_home_description;

  // `product.images` can be either the legacy `string[]` or the current
  // `{ url, alt, name }[]` object format. `getProductImageUrl` normalizes both
  // to a plain string URL — passing the raw object straight into the OG/Twitter
  // `images` field makes Next.js' metadata URL resolver call `path.join` with an
  // object and throw "The 'path' argument must be of type string."
  const image = getProductImageUrl(product.images) ?? settings.seo_home_og_image;
  const url = `${settings.site_url.replace(/\/$/, "")}/productos/${product.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/productos/${product.slug}`,
      // GEO: advertise the markdown variant of this product so LLM bots
      // (GPTBot, ClaudeBot, PerplexityBot) can fetch a clean text version
      // instead of parsing the full HTML page.
      types: {
        "text/markdown": `/productos/${product.slug}.md`,
      },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: settings.site_name,
      locale: "es_PE",
      images: image ? [{ url: image, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;

  const [product, settings, nonce, productSections] = await Promise.all([
    getProductBySlug(slug),
    getSiteSettings(),
    getCspNonce(),
    // Plan 17 — Theme-level PRODUCT sections drive the page when present.
    // Tagged via `theme-sections-<themeId>-PRODUCT` + invalidated as part
    // of the `products` tag (see actions/theme-sections.ts:45-54), so an
    // admin save in the customizer triggers a re-render here.
    getThemedSections("PRODUCT", "desktop"),
  ]);

  if (!product) {
    notFound();
  }

  // Calcular stock total
  const totalStock = product.hasVariants
    ? product.variants.reduce((sum, v) => sum + v.stock, 0)
    : product.stock;

  const inStock = totalStock > 0;

  // Calcular precio inicial
  let initialPrice = Number(product.basePrice);
  let initialComparePrice = product.compareAtPrice
    ? Number(product.compareAtPrice)
    : null;

  if (product.hasVariants && product.variants.length > 0) {
    const cheapestVariant = product.variants[0];
    initialPrice = Number(cheapestVariant.price);
    initialComparePrice = cheapestVariant.compareAtPrice
      ? Number(cheapestVariant.compareAtPrice)
      : null;
  }

  // Cast once to access fields that the inferred Prisma include type doesn't expose
  // (checkoutMode, codFormTemplate, shippingRestriction, landingTemplateId, landingBlocks)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = product as any;

  // Serializar producto para componentes cliente
  const serializedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice
      ? Number(product.compareAtPrice)
      : null,
    sku: product.sku,
    stock: product.stock,
    images: product.images,
    hasVariants: product.hasVariants,
    weight: product.weight ? Number(product.weight) : null,
    checkoutMode: p.checkoutMode ?? "STANDARD",
    codFormTemplate: p.codFormTemplate
      ? {
          id: p.codFormTemplate.id,
          name: p.codFormTemplate.name,
          isDefault: p.codFormTemplate.isDefault,
          buttonText: p.codFormTemplate.buttonText,
          buttonStyle: p.codFormTemplate.buttonStyle,
          postSubmitAction: p.codFormTemplate.postSubmitAction,
          thankYouTitle: p.codFormTemplate.thankYouTitle,
          thankYouMessage: p.codFormTemplate.thankYouMessage,
          whatsappNumber: p.codFormTemplate.whatsappNumber,
          whatsappMessage: p.codFormTemplate.whatsappMessage,
          thankYouPageId: p.codFormTemplate.thankYouPageId,
          thankYouPageSlug:
            p.codFormTemplate.thankYouPage?.slug ?? null,
          blocks: (p.codFormTemplate.blocks ?? []).map((b: { id: string; position: number; type: string; content: Record<string, unknown> | null; visible: boolean; required: boolean }) => ({
            id: b.id,
            position: b.position,
            type: b.type,
            content: b.content ?? {},
            visible: b.visible,
            required: b.required,
          })),
          // The COD modal re-fetches the per-template shipping profile
          // server-side by templateId (getShippingOptionsForCodForm), so the
          // client never reads this list. Emit an empty array to satisfy the
          // CodFormTemplateData shape consumed by the theme-section buy button.
          shippingRateIds: [] as string[],
        }
      : null,
    shippingRestriction: p.shippingRestriction ?? null,
    customizableTemplate: product.customizableTemplate
      ? {
          id: product.customizableTemplate.id,
          surcharge: product.customizableTemplate.surcharge
            ? Number(product.customizableTemplate.surcharge)
            : null,
        }
      : null,
  };

  // Serializar variantes con conversión explícita de options
  const serializedVariants = product.variants.map((v) => ({
    id: v.id,
    productId: v.productId,
    sku: v.sku,
    barcode: v.barcode,
    options: v.options as Record<string, string>,
    price: Number(v.price),
    compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
    stock: v.stock,
    lowStockAlert: v.lowStockAlert,
    weight: v.weight ? Number(v.weight) : null,
    image: v.image,
    active: v.active,
  }));

  // Preparar datos para tracking
  const trackingData = {
    id: product.id,
    name: product.name,
    price: initialPrice,
    categoryName: product.categories[0]?.category.name || undefined,
    sku: product.sku || undefined,
  };

  // Resolve blocks: merges template inheritance + detached overrides + locals.
  const resolvedBlocks = await resolveProductBlocksFromLoaded({
    id: product.id,
    landingTemplateId: p.landingTemplateId ?? null,
    landingBlocks: (p.landingBlocks ?? []).map((b: { id: string; type: string; position: number; content: unknown; sourceTemplateBlockId: string | null; detached: boolean }) => ({
      id: b.id,
      type: b.type,
      position: b.position,
      content: b.content,
      sourceTemplateBlockId: b.sourceTemplateBlockId ?? null,
      detached: b.detached ?? false,
    })),
  });

  const renderableLandingBlocks: LandingBlock[] = resolvedBlocks.map((r) => ({
    id: r.id,
    productId: product.id,
    type: r.type,
    position: r.position,
    content: r.content as unknown as LandingBlock["content"],
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // Serializar product (Prisma Decimal/Date → JS plain objects). The
  // top-level spread carries nested relations (variants, customizableTemplate)
  // that still hold Decimal instances, so we override them with already-
  // serialized versions before passing to Client Components.
  //
  // Date fields come back as Date objects on cache MISS and as ISO strings
  // on cache HIT (unstable_cache serializes through JSON). Wrap in `new Date(...)`
  // so both paths produce the same ISO string output.
  // Strip `reviews` from the spread — they hold Date objects on cache MISS
  // and ISO strings on cache HIT, so passing them to Client Components
  // would surface that inconsistency. The schema below uses the original
  // `product.reviews` directly and we don't render them on the storefront yet.
  const { reviews: _reviews, ...productWithoutReviews } = product;
  const serializedProductFull = {
    ...productWithoutReviews,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    weight: product.weight ? Number(product.weight) : null,
    createdAt: new Date(product.createdAt).toISOString(),
    updatedAt: new Date(product.updatedAt).toISOString(),
    variants: serializedVariants,
    customizableTemplate: product.customizableTemplate
      ? {
          id: product.customizableTemplate.id,
          surcharge: product.customizableTemplate.surcharge
            ? Number(product.customizableTemplate.surcharge)
            : null,
        }
      : null,
    landingBlocks: renderableLandingBlocks.map((b) => ({
      ...b,
      createdAt: new Date(b.createdAt).toISOString(),
      updatedAt: new Date(b.updatedAt).toISOString(),
    })),
  };

  // Reshape size guide row into the shape consumed by the modal.
  const sizeGuideForView: SizeGuideData | null = product.sizeGuide
    ? {
        id: product.sizeGuide.id,
        name: product.sizeGuide.name,
        unit: product.sizeGuide.unit === "IN" ? "in" : "cm",
        tabs:
          (product.sizeGuide.tabs as unknown as SizeGuideTab[]) ?? [],
        table:
          (product.sizeGuide.table as unknown as SizeGuideTable) ?? {
            columns: [],
            rows: [],
          },
        active: product.sizeGuide.active,
      }
    : null;

  const promotions = await getPublicPromotionsForProduct(product.id);

  // Props compartidos para todos los templates
  const templateProps = {
    product: serializedProductFull,
    serializedProduct,
    serializedVariants,
    options: product.options,
    initialPrice,
    initialComparePrice,
    inStock,
    totalStock,
    landingBlocks: renderableLandingBlocks,
    sizeGuide: sizeGuideForView,
    promotions,
  };

  // JSON-LD structured data: Product + BreadcrumbList. Google + Copilot
  // Shopping + Perplexity use these for rich snippets (price, availability,
  // ratings, shipping, returns) in search and AI answers.
  const baseUrl = settings.site_url.replace(/\/$/, "");
  const productUrl = `${baseUrl}/productos/${product.slug}`;
  // Normalize both image formats (legacy string[] / current object[]) to plain
  // URL strings for the Product JSON-LD `image` array.
  const productImages = getAllProductImages(product.images).map((img) => img.url);
  const primaryCategory = product.categories[0]?.category;

  // Aggregate rating from the denormalized product columns, which reflect
  // ALL approved reviews (recompute-aggregates.ts keeps them in sync), not
  // just the 20-review slice loaded for the review[] list below. This way the
  // star count Google shows matches the real total.
  const reviewsList = product.reviews ?? [];
  const aggregateRating =
    product.reviewCount > 0
      ? {
          ratingValue: product.averageRating,
          reviewCount: product.reviewCount,
          ratingCount: product.reviewCount,
        }
      : undefined;

  // Serialize approved reviews for the PRODUCT_REVIEWS theme section. Dates
  // come back as Date (cache MISS) or ISO string (cache HIT) — normalize to
  // ISO. `images` is a String[] column; coerce defensively.
  const serializedReviews = reviewsList.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    verified: r.verified,
    reply: r.reply ?? null,
    repliedAt: r.repliedAt ? new Date(r.repliedAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
  }));

  // Discounted offers must declare priceValidUntil. We don't track promo
  // end-dates yet, so default to +30 days — search engines re-crawl and
  // refresh well before then.
  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is safe here
  const nowMs = Date.now();
  const priceValidUntil =
    initialComparePrice !== null
      ? new Date(nowMs + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
      : undefined;

  const productSchema = buildProductSchema({
    name: product.name,
    description:
      product.shortDescription ??
      (product.description
        ? product.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000)
        : product.name),
    images: productImages,
    sku: product.sku ?? null,
    brand: settings.site_name,
    category: primaryCategory?.name ?? null,
    itemCondition: "NewCondition",
    offer: {
      url: productUrl,
      price: initialPrice,
      priceCurrency: "PEN",
      availability: inStock ? "InStock" : "OutOfStock",
      sku: product.sku ?? null,
      ...(priceValidUntil ? { priceValidUntil } : {}),
    },
    // Generic merchant return policy — PE consumer law allows return
    // windows; defaulting to 7 days / buyer-pays-shipping. Override per
    // store once Setting-level return config is added.
    merchantReturnPolicy: {
      countryCode: "PE",
      returnDays: 7,
      buyerPaysReturnShipping: true,
    },
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(reviewsList.length > 0
      ? {
          reviews: reviewsList.map((r) => ({
            rating: r.rating,
            author: r.customerName,
            title: r.title,
            body: r.comment,
            datePublished: new Date(r.createdAt).toISOString(),
          })),
        }
      : {}),
  });
  const breadcrumbItems = [
    { name: "Inicio", url: `${baseUrl}/` },
    { name: "Productos", url: `${baseUrl}/productos` },
    ...(primaryCategory
      ? [
          {
            name: primaryCategory.name,
            url: `${baseUrl}/categoria/${primaryCategory.slug}`,
          },
        ]
      : []),
    { name: product.name, url: productUrl },
  ];
  const breadcrumbSchema = buildBreadcrumbList(breadcrumbItems);

  // "Comprados juntos" — resolve hybrid recommendations (manual → co-purchase
  // → category) ONLY when the theme has an active FREQUENTLY_BOUGHT_TOGETHER
  // section. The section (editable in the customizer) owns presentation; here
  // we just fetch the data it renders. Skipped for LANDING products.
  const fbtSection = productSections.find(
    (s) => s.type === "FREQUENTLY_BOUGHT_TOGETHER" && s.enabled,
  );
  let fbtRecs: FbtRecommendationForRender[] = [];
  if (fbtSection && product.template !== "LANDING") {
    const rawLimit = (fbtSection.content as { limit?: number })?.limit;
    const limit = typeof rawLimit === "number" ? rawLimit : 3;
    const recs = await getFrequentlyBoughtTogether(product.id, limit);
    fbtRecs = recs.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      price: r.price,
      compareAtPrice: r.compareAtPrice,
      mainImage: r.mainImage,
      hasVariants: r.hasVariants,
      inStock: r.inStock,
      stock: r.stock,
    }));
  }

  return (
    <>
      {/* Tracking */}
      <ProductTracking product={trackingData} />

      {/* JSON-LD structured data for search engines */}
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Visual breadcrumb trail (mirrors the JSON-LD above). Skipped for
        * LANDING products, which are bespoke landing pages. */}
      {product.template !== "LANDING" && (
        <div className="container mx-auto px-4 pt-4 sm:pt-6">
          <Breadcrumbs
            items={breadcrumbItems.map((i) => ({
              name: i.name,
              href: i.url,
            }))}
          />
        </div>
      )}

      {/* Render priority:
        *   1. `Product.template === "LANDING"` → legacy LandingView (per-product)
        *   2. Plan 17 — theme has PRODUCT sections → render via ProductSectionsRenderer
        *   3. Fallback → legacy hardcoded ProductStandardView (keeps storefront
        *      working when no seed has run yet, or when a tenant intentionally
        *      opts out by removing all PRODUCT sections).
        */}
      {product.template === "LANDING" ? (
        <ProductLandingView {...templateProps} />
      ) : productSections.length > 0 ? (
        <ProductSectionsRenderer
          sections={productSections}
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            shortDescription: product.shortDescription,
            sku: product.sku,
            weight: product.weight ? Number(product.weight) : null,
            basePrice: Number(product.basePrice),
            compareAtPrice: product.compareAtPrice
              ? Number(product.compareAtPrice)
              : null,
            stock: totalStock,
            hasVariants: product.hasVariants,
            images: product.images,
            categories: product.categories.map((pc) => ({
              category: {
                id: pc.category.id,
                name: pc.category.name,
                slug: pc.category.slug,
              },
            })),
            reviews: serializedReviews,
            frequentlyBoughtTogether: fbtRecs,
            // COD / quick-order flow: thread the checkout mode + form template
            // so the PRODUCT_MAIN buy button can open the COD modal instead of
            // a plain add-to-cart. Without this, COD-only products silently
            // fell back to the cart on the theme-section storefront.
            checkoutMode: serializedProduct.checkoutMode as CheckoutMode,
            codFormTemplate:
              serializedProduct.codFormTemplate as CodFormTemplateData | null,
            shippingRestriction:
              serializedProduct.shippingRestriction as ShippingRestriction | null,
          }}
          variants={serializedVariants}
          options={product.options}
        />
      ) : (
        <ProductStandardView {...templateProps} />
      )}
    </>
  );
}
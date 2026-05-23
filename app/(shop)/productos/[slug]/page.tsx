import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import ProductTracking from "./tracking-client";
import ProductStandardView from "@/components/shop/templates/ProductStandardView";
import ProductLandingView from "@/components/shop/templates/ProductLandingView";
import { resolveProductBlocksFromLoaded } from "@/lib/blocks/resolve-product-blocks";
import type { LandingBlock } from "@/lib/types/landing-blocks";
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

  const images = Array.isArray(product.images)
    ? (product.images as string[])
    : [];
  const image = images[0] ?? settings.seo_home_og_image;
  const url = `${settings.site_url.replace(/\/$/, "")}/productos/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical: `/productos/${product.slug}` },
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

  const [product, settings, nonce] = await Promise.all([
    getProductBySlug(slug),
    getSiteSettings(),
    getCspNonce(),
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
    checkoutMode: (product as any).checkoutMode ?? "STANDARD",
    codFormTemplate: (product as any).codFormTemplate
      ? {
          id: (product as any).codFormTemplate.id,
          name: (product as any).codFormTemplate.name,
          isDefault: (product as any).codFormTemplate.isDefault,
          buttonText: (product as any).codFormTemplate.buttonText,
          buttonStyle: (product as any).codFormTemplate.buttonStyle,
          postSubmitAction: (product as any).codFormTemplate.postSubmitAction,
          thankYouTitle: (product as any).codFormTemplate.thankYouTitle,
          thankYouMessage: (product as any).codFormTemplate.thankYouMessage,
          whatsappNumber: (product as any).codFormTemplate.whatsappNumber,
          whatsappMessage: (product as any).codFormTemplate.whatsappMessage,
          thankYouPageId: (product as any).codFormTemplate.thankYouPageId,
          thankYouPageSlug:
            (product as any).codFormTemplate.thankYouPage?.slug ?? null,
          blocks: ((product as any).codFormTemplate.blocks ?? []).map((b: any) => ({
            id: b.id,
            position: b.position,
            type: b.type,
            content: b.content ?? {},
            visible: b.visible,
            required: b.required,
          })),
        }
      : null,
    shippingRestriction: (product as any).shippingRestriction ?? null,
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
    landingTemplateId: (product as any).landingTemplateId ?? null,
    landingBlocks: ((product as any).landingBlocks ?? []).map((b: any) => ({
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
  const serializedProductFull = {
    ...product,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    weight: product.weight ? Number(product.weight) : null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
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
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
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

  // JSON-LD structured data: Product + BreadcrumbList. Google uses these for
  // rich snippets (price, availability, breadcrumbs) in search results.
  const baseUrl = settings.site_url.replace(/\/$/, "");
  const productUrl = `${baseUrl}/productos/${product.slug}`;
  const productImages = Array.isArray(product.images)
    ? (product.images as string[])
    : [];
  const primaryCategory = product.categories[0]?.category;
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
    offer: {
      url: productUrl,
      price: initialPrice,
      priceCurrency: "PEN",
      availability: inStock ? "InStock" : "OutOfStock",
      sku: product.sku ?? null,
    },
  });
  const breadcrumbSchema = buildBreadcrumbList([
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
  ]);

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

      {/* 🎯 RENDERIZAR SEGÚN TEMPLATE */}
      {product.template === "LANDING" ? (
        <ProductLandingView {...templateProps} />
      ) : product.template === "MINIMAL" ? (
        <ProductStandardView {...templateProps} />
      ) : product.template === "GALLERY" ? (
        <ProductStandardView {...templateProps} />
      ) : (
        <ProductStandardView {...templateProps} />
      )}
    </>
  );
}
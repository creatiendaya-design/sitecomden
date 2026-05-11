import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
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

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
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

  return (
    <>
      {/* Tracking */}
      <ProductTracking product={trackingData} />

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
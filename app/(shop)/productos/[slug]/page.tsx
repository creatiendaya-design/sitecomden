import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ProductTracking from "./tracking-client";
import ProductStandardView from "@/components/shop/templates/ProductStandardView";
import ProductLandingView from "@/components/shop/templates/ProductLandingView";

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

  // Props compartidos para todos los templates
  const templateProps = {
    product,
    serializedProduct,
    serializedVariants,
    options: product.options,
    initialPrice,
    initialComparePrice,
    inStock,
    totalStock,
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
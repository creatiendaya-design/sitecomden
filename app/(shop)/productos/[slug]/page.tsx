import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ProductImageGallery from "@/components/shop/ProductImageGallery";
import ProductActions from "@/components/shop/ProductActions";
import RichTextContent from "@/components/RichTextContent";
import ProductPrice from "@/components/shop/ProductPrice";
import ProductTracking from "./tracking-client"; // ✅ Importar tracking

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
  let initialComparePrice = product.compareAtPrice ? Number(product.compareAtPrice) : null;

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
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
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

  // ✅ Preparar datos para tracking
const trackingData = {
  id: product.id,
  name: product.name,
  price: initialPrice,
  categoryName: product.categories[0]?.category.name || undefined,
  sku: product.sku || undefined, // ✅ Convertir null a undefined
};

  return (
    <>
      {/* ✅ Componente de Tracking - ViewContent */}
      <ProductTracking product={trackingData} />

      <div className="product-detail-container">
        <div className="product-detail-grid">
          {/* Gallery Column - 🆕 SOLO imágenes del producto */}
          <ProductImageGallery images={product.images} name={product.name} />

          {/* Info Column */}
          <div className="product-info-wrapper">
            <div className="product-info-content">
              {/* Categories */}
              {product.categories && product.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.categories.map((pc) => (
                    <Badge 
                      key={pc.category.id} 
                      variant="secondary"
                      className="text-xs sm:text-sm"
                    >
                      {pc.category.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Title & Description */}
              <div>
                <h1 className="product-title">
                  {product.name}
                </h1>
                {product.shortDescription && (
                  <p className="product-description mt-2">
                    {product.shortDescription}
                  </p>
                )}
              </div>

              {/* Price */}
              <ProductPrice
                initialPrice={initialPrice}
                initialComparePrice={initialComparePrice}
                hasVariants={product.hasVariants}
              />

              {/* Stock Status */}
              <div>
                {inStock ? (
                  <Badge variant="outline" className="text-green-600 text-xs sm:text-sm border-green-600/20 bg-green-50">
                    ✓ En stock ({totalStock} disponibles)
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs sm:text-sm">
                    Agotado
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <ProductActions
                product={serializedProduct}
                variants={serializedVariants}
                options={product.options}
              />

              <Separator />

              {/* Description */}
              {product.description && (
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold mb-3">
                    Descripción
                  </h2>
                  <div className="prose prose-sm sm:prose max-w-none">
                    <RichTextContent content={product.description} />
                  </div>
                </div>
              )}

              {/* Specifications */}
              <div className="rounded-lg bg-slate-50 p-4 sm:p-6 space-y-3">
                <h3 className="font-semibold text-base sm:text-lg">
                  Información del producto
                </h3>
                <dl className="space-y-2 text-sm sm:text-base">
                  {product.sku && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">SKU:</dt>
                      <dd className="font-medium text-right break-all">
                        {product.sku}
                      </dd>
                    </div>
                  )}
                  {product.weight && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-600">Peso:</dt>
                      <dd className="font-medium">
                        {Number(product.weight)} kg
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-600">Disponibilidad:</dt>
                    <dd className="font-medium">
                      {inStock ? "En stock" : "Agotado"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
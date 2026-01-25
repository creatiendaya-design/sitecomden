import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ProductImageGallery from "@/components/shop/ProductImageGallery";
import ProductActions from "@/components/shop/ProductActions";
import RichTextContent from "@/components/RichTextContent";
import ProductPrice from "@/components/shop/ProductPrice"; // ✅ NUEVO

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

  // ✅ CALCULAR PRECIO INICIAL
  let initialPrice = Number(product.basePrice);
  let initialComparePrice = product.compareAtPrice ? Number(product.compareAtPrice) : null;

  if (product.hasVariants && product.variants.length > 0) {
    // Usar el precio de la variante más barata
    const cheapestVariant = product.variants[0]; // Ya están ordenados por precio
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

  const serializedVariants = product.variants.map((v) => ({
    id: v.id,
    productId: v.productId,
    sku: v.sku,
    barcode: v.barcode,
    options: v.options,
    price: Number(v.price),
    compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
    stock: v.stock,
    lowStockAlert: v.lowStockAlert,
    weight: v.weight ? Number(v.weight) : null,
    image: v.image,
    active: v.active,
  }));

  return (
    <div className="container py-8 mx-auto">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <ProductImageGallery images={product.images} name={product.name} />

        {/* Product Info */}
        <div className="space-y-6 px-4 sm:px-6 lg:px-8">
          {/* Categories */}
          {product.categories && product.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.categories.map((pc) => (
                <Badge key={pc.category.id} variant="secondary">
                  {pc.category.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {product.name}
            </h1>
            {product.shortDescription && (
              <p className="mt-2 text-lg text-muted-foreground">
                {product.shortDescription}
              </p>
            )}
          </div>

          {/* ✅ PRECIO DINÁMICO - Usa el componente cliente */}
          <ProductPrice
            initialPrice={initialPrice}
            initialComparePrice={initialComparePrice}
            hasVariants={product.hasVariants}
          />

          {/* Stock Status */}
          <div>
            {inStock ? (
              <Badge variant="outline" className="text-green-600">
                ✓ En stock ({totalStock} disponibles)
              </Badge>
            ) : (
              <Badge variant="destructive">Agotado</Badge>
            )}
          </div>

          <Separator />

          <ProductActions
            product={serializedProduct}
            variants={serializedVariants}
            options={product.options}
          />

          <Separator />

          {product.description && (
            <div>
              <h2 className="mb-3 text-xl font-semibold">Descripción</h2>
              <RichTextContent content={product.description} />
            </div>
          )}

          {/* Specifications */}
          <div className="rounded-lg bg-muted/50 p-4">
            <h3 className="mb-3 font-semibold">Información del producto</h3>
            <dl className="space-y-2 text-sm">
              {product.sku && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">SKU:</dt>
                  <dd className="font-medium">{product.sku}</dd>
                </div>
              )}
              {product.weight && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Peso:</dt>
                  <dd className="font-medium">{Number(product.weight)} kg</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Disponibilidad:</dt>
                <dd className="font-medium">
                  {inStock ? "En stock" : "Agotado"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
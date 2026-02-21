"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ProductImageGallery from "@/components/shop/ProductImageGallery";
import ProductActions from "@/components/shop/ProductActions";
import RichTextContent from "@/components/RichTextContent";
import ProductPrice from "@/components/shop/ProductPrice";

interface ProductStandardViewProps {
  product: any;
  serializedProduct: any;
  serializedVariants: any[];
  options: any[];
  initialPrice: number;
  initialComparePrice: number | null;
  inStock: boolean;
  totalStock: number;
}

export default function ProductStandardView({
  product,
  serializedProduct,
  serializedVariants,
  options,
  initialPrice,
  initialComparePrice,
  inStock,
  totalStock,
}: ProductStandardViewProps) {
  return (
    <div className="product-detail-container">
      <div className="product-detail-grid">
        {/* Gallery Column */}
        <ProductImageGallery images={product.images} name={product.name} />

        {/* Info Column */}
        <div className="product-info-wrapper">
          <div className="product-info-content">
            {/* Categories */}
            {product.categories && product.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.categories.map((pc: any) => (
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
              <h1 className="product-title">{product.name}</h1>
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
                <Badge
                  variant="outline"
                  className="text-green-600 text-xs sm:text-sm border-green-600/20 bg-green-50"
                >
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
              options={options}
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
  );
}
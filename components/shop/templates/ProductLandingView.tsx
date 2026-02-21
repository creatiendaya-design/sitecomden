"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProductActions from "@/components/shop/ProductActions";
import ProductPrice from "@/components/shop/ProductPrice";
import RichTextContent from "@/components/RichTextContent";
import { Check, Shield, Truck, Heart, Star } from "lucide-react";

interface ProductLandingViewProps {
  product: any;
  serializedProduct: any;
  serializedVariants: any[];
  options: any[];
  initialPrice: number;
  initialComparePrice: number | null;
  inStock: boolean;
  totalStock: number;
}

export default function ProductLandingView({
  product,
  serializedProduct,
  serializedVariants,
  options,
  initialPrice,
  initialComparePrice,
  inStock,
  totalStock,
}: ProductLandingViewProps) {
  const mainImage =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : null;

  return (
    <div className="landing-product">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-50 to-slate-100 py-12 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            {/* Left: Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-slate-200 text-slate-400">
                  Sin imagen
                </div>
              )}
            </div>

            {/* Right: Info */}
            <div className="space-y-6">
              {product.categories && product.categories.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {product.categories[0].category.name}
                </Badge>
              )}

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                {product.name}
              </h1>

              {product.shortDescription && (
                <p className="text-lg text-muted-foreground">
                  {product.shortDescription}
                </p>
              )}

              <ProductPrice
                initialPrice={initialPrice}
                initialComparePrice={initialComparePrice}
                hasVariants={product.hasVariants}
              />

              {inStock ? (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600/20 bg-green-50"
                >
                  ✓ En stock ({totalStock} disponibles)
                </Badge>
              ) : (
                <Badge variant="destructive">Agotado</Badge>
              )}

              <ProductActions
                product={serializedProduct}
                variants={serializedVariants}
                options={options}
              />

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span>Compra Segura</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span>Envío Rápido</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Heart className="h-4 w-4 text-red-600" />
                  <span>Garantía</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">
            ¿Por qué elegir este producto?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Truck className="h-6 w-6" />}
              title="Envío Rápido"
              description="Entrega en 24-48 horas a todo el Perú"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="100% Garantizado"
              description="Satisfacción garantizada o devolución de dinero"
            />
            <FeatureCard
              icon={<Heart className="h-6 w-6" />}
              title="Calidad Premium"
              description="Materiales de primera calidad"
            />
            <FeatureCard
              icon={<Star className="h-6 w-6" />}
              title="Mejor Valorado"
              description="Miles de clientes satisfechos"
            />
          </div>
        </div>
      </section>

      {/* Description Section */}
      {product.description && (
        <section className="py-12 bg-slate-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-6 text-center">
              Detalles del Producto
            </h2>
            <div className="prose prose-lg max-w-none">
              <RichTextContent content={product.description} />
            </div>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {Array.isArray(product.images) && product.images.length > 1 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">Galería</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.images.slice(1).map((image: string, index: number) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow"
                >
                  <Image
                    src={image}
                    alt={`${product.name} ${index + 2}`}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Specifications */}
      <section className="py-12 bg-slate-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Especificaciones
          </h2>
          <div className="rounded-xl bg-white p-6 sm:p-8 shadow-md space-y-4">
            {product.sku && (
              <div className="flex justify-between items-center py-3 border-b">
                <span className="font-semibold text-slate-600">SKU:</span>
                <span className="text-slate-900">{product.sku}</span>
              </div>
            )}
            {product.weight && (
              <div className="flex justify-between items-center py-3 border-b">
                <span className="font-semibold text-slate-600">Peso:</span>
                <span className="text-slate-900">
                  {Number(product.weight)} kg
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-3">
              <span className="font-semibold text-slate-600">
                Disponibilidad:
              </span>
              <span className="text-slate-900">
                {inStock ? `${totalStock} unidades` : "Agotado"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            ¿Listo para Comprar?
          </h2>
          <p className="text-lg mb-8 text-blue-100 max-w-2xl mx-auto">
            Aprovecha nuestra oferta especial y recibe tu producto con envío
            express incluido
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Comprar Ahora
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 bg-white/10 border-white text-white hover:bg-white hover:text-blue-600"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Ver Más Detalles
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 p-3 rounded-full bg-blue-50 text-blue-600">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
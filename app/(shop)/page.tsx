import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl, getProductImageAlt } from "@/lib/image-utils";
import Image from "next/image";
import { Metadata } from "next";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: settings.seo_home_title,
    description: settings.seo_home_description,
    keywords: settings.seo_home_keywords.split(",").map((k) => k.trim()),
    openGraph: {
      title: settings.seo_home_title,
      description: settings.seo_home_description,
      url: settings.site_url,
      siteName: settings.site_name,
      locale: "es_PE",
      type: "website",
      images: settings.seo_home_og_image ? [settings.seo_home_og_image] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.seo_home_title,
      description: settings.seo_home_description,
      images: settings.seo_home_og_image ? [settings.seo_home_og_image] : [],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function HomePage() {
  const settings = await getSiteSettings();

  // Obtener productos destacados
  const featuredProducts = await prisma.product.findMany({
    where: {
      active: true,
      featured: true,
    },
    take: 8,
    orderBy: {
      createdAt: "desc",
    },
  });

  // Structured Data para el sitio web
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.site_name,
    url: settings.site_url,
    description: settings.seo_home_description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${settings.site_url}/productos?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-20">
        <div className="container mx-auto">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Encuentra los mejores productos
              <span className="text-primary"> en Perú</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Envío a todo el país. Paga con tarjeta, Yape, Plin o PayPal.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href="/productos">Ver Productos</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/nosotros">Conocer Más</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Productos Destacados
              </h2>
              <p className="text-muted-foreground">
                Los productos más populares de nuestra tienda
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/productos">Ver Todos</Link>
            </Button>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">
                No hay productos destacados disponibles
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <Link href={`/productos/${product.slug}`}>
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      {getProductImageUrl(product.images as any) ? (
                        <Image
                          src={getProductImageUrl(product.images as any)!}
                          alt={getProductImageAlt(product.images as any, product.name)}
                          fill
                          className="object-cover transition-transform hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-muted-foreground">
                            Sin imagen
                          </span>
                        </div>
                      )}
                      {product.compareAtPrice && (
                        <Badge className="absolute right-2 top-2">
                          Oferta
                        </Badge>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <Link href={`/productos/${product.slug}`}>
                      <h3 className="line-clamp-2 font-semibold hover:text-primary">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-bold">
                        {formatPrice(Number(product.basePrice))}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(Number(product.compareAtPrice))}
                        </span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button asChild className="w-full">
                      <Link href={`/productos/${product.slug}`}>
                        Ver Producto
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/40 py-16">
        <div className="container mx-auto">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                🚚
              </div>
              <h3 className="mb-2 font-semibold">Envío a todo el Perú</h3>
              <p className="text-sm text-muted-foreground">
                Llegamos a todas las ciudades del país
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                💳
              </div>
              <h3 className="mb-2 font-semibold">Múltiples formas de pago</h3>
              <p className="text-sm text-muted-foreground">
                Tarjeta, Yape, Plin, PayPal y más
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                🔒
              </div>
              <h3 className="mb-2 font-semibold">Compra segura</h3>
              <p className="text-sm text-muted-foreground">
                Protegemos tus datos y tu compra
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
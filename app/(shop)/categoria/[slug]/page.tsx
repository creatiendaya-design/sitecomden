import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ProductCard from "@/components/shop/ProductCard";
import { getSiteSettings } from "@/lib/site-settings";
import { Metadata } from "next";

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  // Obtener categoría
  const category = await prisma.category.findUnique({
    where: { slug, active: true },
  });

  if (!category) {
    notFound();
  }

  // Obtener productos de esta categoría usando la relación muchos a muchos
  const productCategories = await prisma.productCategory.findMany({
    where: {
      categoryId: category.id,
      product: {
        active: true, // Filtrar solo productos activos
      },
    },
    include: {
      product: {
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          variants: {
            where: { active: true },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  // Extraer productos
  const products = productCategories.map((pc) => pc.product);

  // Serializar precios
  const serializedProducts = products.map((product) => ({
    ...product,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    variants: product.variants.map((v) => ({
      ...v,
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
    })),
  }));

  return (
    <div className="container py-8 mx-auto">
      {/* Header de categoría */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? "producto" : "productos"}
        </p>
      </div>

      {/* Grid de productos */}
      {products.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No hay productos disponibles en esta categoría
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {serializedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

// Generar metadata dinámica
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getSiteSettings();
  
  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      metaTitle: true,
      metaDescription: true,
      image: true,
    },
  });

  if (!category) {
    return {
      title: "Categoría no encontrada",
    };
  }

  const title = category.metaTitle || `${category.name}`;
  const description =
    category.metaDescription ||
    category.description ||
    `Compra ${category.name} en ${settings.site_name}. Envío a todo el Perú con múltiples métodos de pago.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: category.image ? [category.image] : [],
      type: "website",
      url: `${settings.site_url}/categoria/${slug}`,
      siteName: settings.site_name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: category.image ? [category.image] : [],
    },
    alternates: {
      canonical: `/categoria/${slug}`,
    },
  };
}
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ProductCard from "@/components/shop/ProductCard";
import { getSiteSettings } from "@/lib/site-settings";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PackageSearch } from "lucide-react";
import LandingBlockRenderer from "@/components/shop/templates/blocks/LandingBlockRenderer";
import type { LandingBlock } from "@/lib/types/landing-blocks";

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug, active: true },
    include: {
      categoryBlocks: { orderBy: { position: "asc" } },
    },
  });

  if (!category) {
    notFound();
  }

  // Render the page-builder blocks attached to the category (Plan 7).
  // When the first block is a HERO we skip the auto-generated header below
  // to avoid duplicate H1 + description; otherwise we keep the default
  // header so the page is never blank if the admin only added secondary
  // blocks (FAQ, RICH_TEXT, etc.).
  const blocks: LandingBlock[] = category.categoryBlocks.map((b) => ({
    id: b.id,
    productId: "",
    type: b.type,
    position: b.position,
    content: b.content as LandingBlock["content"],
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  const hasBlocks = blocks.length > 0;
  const firstBlockIsHero = blocks[0]?.type === "HERO";
  const showAutoHeader = !hasBlocks || !firstBlockIsHero;
  // Plan 7.1: when the admin added a PRODUCT_GRID block, it owns the grid
  // — the auto-generated one below would duplicate the products list.
  const hasProductGridBlock = blocks.some((b) => b.type === "PRODUCT_GRID");
  // The legacy hideProductGrid toggle remains for landings 100% custom
  // without a PRODUCT_GRID block. Either path suppresses the auto-grid.
  const showProductGrid =
    !hasProductGridBlock && !(category.hideProductGrid && hasBlocks);

  let serializedProducts: Awaited<ReturnType<typeof loadCategoryProducts>> = [];
  if (showProductGrid) {
    serializedProducts = await loadCategoryProducts(category.id);
  }

  return (
    <>
      {hasBlocks && (
        <div className="flex flex-col">
          <LandingBlockRenderer blocks={blocks} currentCategoryId={category.id} />
        </div>
      )}

      <div className="container py-8 mx-auto">
        {showAutoHeader && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{category.name}</h1>
            {category.description && (
              <p className="mt-2 text-muted-foreground">{category.description}</p>
            )}
            {showProductGrid && (
              <p className="mt-4 text-sm text-muted-foreground">
                {serializedProducts.length}{" "}
                {serializedProducts.length === 1 ? "producto" : "productos"}
              </p>
            )}
          </div>
        )}

        {showProductGrid &&
          (serializedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <PackageSearch className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">
                Sin productos por ahora
              </h2>
              <p className="mb-6 max-w-sm text-muted-foreground">
                Aún no hay productos disponibles en{" "}
                <span className="font-medium text-foreground">
                  {category.name}
                </span>
                . Pronto agregaremos nuevos artículos.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link href="/productos">Ver todos los productos</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">Ir al inicio</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {serializedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ))}
      </div>
    </>
  );
}

async function loadCategoryProducts(categoryId: string) {
  const productCategories = await prisma.productCategory.findMany({
    where: {
      categoryId,
      product: { active: true },
    },
    include: {
      product: {
        include: {
          categories: { include: { category: true } },
          variants: {
            where: { active: true },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  return productCategories.map((pc) => {
    const product = pc.product;
    return {
      ...product,
      basePrice: Number(product.basePrice),
      compareAtPrice: product.compareAtPrice
        ? Number(product.compareAtPrice)
        : null,
      variants: product.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      })),
    };
  });
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
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

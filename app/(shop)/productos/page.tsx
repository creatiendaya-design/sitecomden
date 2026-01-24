import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/shop/ProductCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    sort?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const { category, search, sort = "newest" } = params;

  // Construir filtros
  const where: any = {
    active: true,
  };

  // Si hay filtro de categoría, necesitamos filtrar por la relación muchos a muchos
  let categoryFilter = null;
  if (category) {
    const categoryData = await prisma.category.findUnique({
      where: { slug: category },
    });
    if (categoryData) {
      categoryFilter = categoryData.id;
      // Filtrar productos que tienen esta categoría
      where.categories = {
        some: {
          categoryId: categoryData.id,
        },
      };
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Determinar ordenamiento
  let orderBy: any = { createdAt: "desc" };
  if (sort === "price-asc") {
    orderBy = { basePrice: "asc" };
  } else if (sort === "price-desc") {
    orderBy = { basePrice: "desc" };
  } else if (sort === "name") {
    orderBy = { name: "asc" };
  }

  // Obtener productos
  const products = await prisma.product.findMany({
    where,
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
    orderBy,
  });

  // Serializar productos
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

  // Obtener categorías con contador de productos
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
        <p className="text-muted-foreground">
          {products.length} {products.length === 1 ? "producto" : "productos"}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar - Filtros (oculto en móvil, visible en desktop) */}
        <aside className="hidden lg:block space-y-6">
          <div>
            <h3 className="mb-4 font-semibold">Categorías</h3>
            <div className="space-y-2">
              <Link
                href="/productos"
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${
                  !category ? "bg-muted font-medium" : ""
                }`}
              >
                <span>Todos</span>
                <span className="text-xs text-muted-foreground">
                  {products.length}
                </span>
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/productos?category=${cat.slug}`}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${
                    category === cat.slug ? "bg-muted font-medium" : ""
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {cat._count.products}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div>
          {/* Toolbar con ordenamiento */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Categoría actual en móvil */}
            <div className="flex items-center justify-between lg:justify-start">
              <p className="text-sm text-muted-foreground">
                {category ? (
                  <>
                    Mostrando{" "}
                    <span className="font-medium">
                      {categories.find((c) => c.slug === category)?.name}
                    </span>
                  </>
                ) : (
                  `${products.length} productos`
                )}
              </p>
              
              {/* Filtro de categorías en móvil (dropdown) */}
              <div className="lg:hidden">
                <CategoryMobileSelect 
                  categories={categories} 
                  currentCategory={category} 
                />
              </div>
            </div>

            <SortSelect currentSort={sort} category={category} />
          </div>

          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">
                No se encontraron productos
              </p>
              <Button asChild className="mt-4">
                <Link href="/productos">Ver todos los productos</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {serializedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de ordenamiento (Client Component)
function SortSelect({ currentSort, category }: { currentSort: string; category?: string }) {
  return (
    <form action="/productos" method="get" className="flex items-center gap-2">
      {category && <input type="hidden" name="category" value={category} />}
      <Select name="sort" defaultValue={currentSort}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Más reciente</SelectItem>
          <SelectItem value="price-asc">Precio: menor a mayor</SelectItem>
          <SelectItem value="price-desc">Precio: mayor a menor</SelectItem>
          <SelectItem value="name">Nombre A-Z</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" size="sm">Aplicar</Button>
    </form>
  );
}

// Selector de categorías para móvil
function CategoryMobileSelect({ 
  categories, 
  currentCategory 
}: { 
  categories: any[]; 
  currentCategory?: string;
}) {
  return (
    <form action="/productos" method="get">
      <Select name="category" defaultValue={currentCategory || "all"}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.slug}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
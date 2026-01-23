import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  description?: string;
  productCount?: number;
}

interface CategoryShowcaseProps {
  title: string;
  subtitle?: string;
  categories: Category[];
  layout?: "grid" | "masonry" | "featured";
  className?: string;
}

export function CategoryShowcase({
  title,
  subtitle,
  categories,
  layout = "grid",
  className = "",
}: CategoryShowcaseProps) {
  if (layout === "featured" && categories.length >= 3) {
    return (
      <section className={`py-16 md:py-24 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          {/* Featured Grid Layout */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Primera categoría - Grande */}
            <Link
              href={`/productos?categoria=${categories[0].slug}`}
              className="group relative overflow-hidden rounded-2xl md:col-span-2 md:row-span-2"
            >
              <div className="relative aspect-[16/9] md:aspect-auto md:h-full">
                <Image
                  src={categories[0].image}
                  alt={categories[0].name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <h3 className="mb-2 text-3xl font-bold text-white lg:text-4xl">
                    {categories[0].name}
                  </h3>
                  {categories[0].description && (
                    <p className="mb-4 max-w-md text-white/90">
                      {categories[0].description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-white">
                    <span className="font-medium">Explorar colección</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Segunda y tercera categoría */}
            {categories.slice(1, 3).map((category) => (
              <Link
                key={category.id}
                href={`/productos?categoria=${category.slug}`}
                className="group relative overflow-hidden rounded-2xl"
              >
                <div className="relative aspect-square">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <h3 className="mb-2 text-2xl font-bold text-white">
                      {category.name}
                    </h3>
                    {category.productCount !== undefined && (
                      <p className="text-sm text-white/80">
                        {category.productCount} productos
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            {/* Categorías restantes */}
            {categories.slice(3).map((category) => (
              <Link
                key={category.id}
                href={`/productos?categoria=${category.slug}`}
                className="group relative overflow-hidden rounded-2xl"
              >
                <div className="relative aspect-square">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <h3 className="mb-2 text-xl font-bold text-white">
                      {category.name}
                    </h3>
                    {category.productCount !== undefined && (
                      <p className="text-sm text-white/80">
                        {category.productCount} productos
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === "masonry") {
    return (
      <section className={`py-16 md:py-24 ${className}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          {/* Masonry Grid */}
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/productos?categoria=${category.slug}`}
                className="group relative mb-4 block overflow-hidden rounded-xl break-inside-avoid"
              >
                <div className={`relative ${index % 3 === 0 ? 'aspect-[3/4]' : index % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'}`}>
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="mb-1 text-xl font-bold text-white">
                      {category.name}
                    </h3>
                    {category.productCount !== undefined && (
                      <p className="text-sm text-white/80">
                        {category.productCount} productos
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Grid estándar
  return (
    <section className={`py-16 md:py-24 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Standard Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/productos?categoria=${category.slug}`}
              className="group relative overflow-hidden rounded-xl"
            >
              <div className="relative aspect-square">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h3 className="mb-1 text-xl font-bold text-white">
                    {category.name}
                  </h3>
                  {category.productCount !== undefined && (
                    <p className="text-sm text-white/80">
                      {category.productCount} productos
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
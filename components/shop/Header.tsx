import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import CartCounter from "./CartCounter";
import MobileMenu from "./MobileMenu";
import { prisma } from "@/lib/db";
import SearchBar from "./SearchBar";
import { HeaderAuth } from "./HeaderAuth";
import { getSiteSettings } from "@/lib/site-settings";
import MobileSearch from "./MobileSearch";

export default async function Header() {
  // Obtener categorías activas
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    take: 6,
  });

  // Obtener configuración del sitio
  const settings = await getSiteSettings();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        {/* Top Bar - Logo + Actions */}
        <div className="flex h-14 md:h-16 items-center justify-between gap-2">
          {/* Logo - Más compacto en móvil */}
          <Link href="/" className="flex items-center shrink-0">
            {settings.site_logo ? (
              <div className="relative h-8 md:h-10 w-auto">
                <Image
                  src={settings.site_logo}
                  alt={settings.site_name}
                  width={120}
                  height={32}
                  className="h-8 md:h-10 w-auto object-contain"
                  priority
                />
              </div>
            ) : (
              <>
                <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-lg md:text-xl font-bold">SG</span>
                </div>
                <span className="hidden font-bold sm:inline-block ml-2">
                  {settings.site_name}
                </span>
              </>
            )}
          </Link>

          {/* Search Bar - Solo Desktop */}
          <div className="hidden flex-1 px-4 lg:px-8 md:block">
            <SearchBar />
          </div>

          {/* Actions - Optimizado para móvil */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Search - Solo móvil */}
            <div className="md:hidden">
              <MobileSearch />
            </div>

            {/* Auth - Oculto en móvil pequeño */}
            <div className="hidden sm:block">
              <HeaderAuth />
            </div>

            {/* Cart - Siempre visible */}
            <Link href="/carrito">
              <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-10 md:w-10">
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                <CartCounter />
              </Button>
            </Link>

            {/* Mobile Menu - Siempre visible */}
            <MobileMenu categories={categories} isAdmin={false} />
          </div>
        </div>

        {/* Search Bar - Móvil (alternativa: mostrar debajo del header) */}
        <div className="md:hidden pb-3 pt-2 border-t">
          <SearchBar />
        </div>
      </div>

      {/* Navigation Links - Solo Desktop */}
      <div className="border-t hidden md:block">
        <div className="container mx-auto px-4">
          <nav className="flex h-10 items-center space-x-6 text-sm overflow-x-auto">
            <Link
              href="/productos"
              className="transition-colors hover:text-foreground/80 whitespace-nowrap"
            >
              Todos los Productos
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categoria/${category.slug}`}
                className="transition-colors hover:text-foreground/80 whitespace-nowrap"
              >
                {category.name}
              </Link>
            ))}
            <Link
              href="/sobre-nosotros"
              className="transition-colors hover:text-foreground/80 whitespace-nowrap"
            >
              Nosotros
            </Link>
            <Link
              href="/contacto"
              className="transition-colors hover:text-foreground/80 whitespace-nowrap"
            >
              Contacto
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
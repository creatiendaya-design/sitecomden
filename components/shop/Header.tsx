import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import CartCounter from "./CartCounter";
import MobileMenu from "./MobileMenu";
import { prisma } from "@/lib/db";
import SearchBar from "./SearchBar";
import { HeaderAuth } from "./HeaderAuth";
import { getSiteSettings } from "@/lib/site-settings";

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
    <header className="sticky mx-auto top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          {settings.site_logo ? (
            <div className="relative h-10 w-auto">
              <Image
                src={settings.site_logo}
                alt={settings.site_name}
                width={150}
                height={40}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-xl font-bold">SG</span>
              </div>
              <span className="hidden font-bold sm:inline-block">
                {settings.site_name}
              </span>
            </>
          )}
        </Link>

        {/* Search Bar - Desktop */}
        <div className="hidden flex-1 px-8 md:block">
          <SearchBar />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search Button - Mobile */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Auth Components - Client Side */}
          <HeaderAuth />

          {/* Cart */}
          <Link href="/carrito">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              <CartCounter />
            </Button>
          </Link>

          {/* Mobile Menu */}
          <MobileMenu categories={categories} isAdmin={false} />
        </div>
      </div>

      {/* Navigation Links */}
      <div className="border-t">
        <div className="container mx-auto">
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
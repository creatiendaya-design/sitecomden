import Link from "next/link";
import Image from "next/image";
import CartButton from "../CartButton";
import MobileMenu from "../MobileMenu";
import SearchBar from "../SearchBar";
import { HeaderAuth } from "../HeaderAuth";
import { getSiteSettings } from "@/lib/site-settings";
import { getMenuBySlug } from "@/lib/menus/get-menu-by-slug";
import { HeaderNavMenu } from "../HeaderNavMenu";
import MobileSearch from "../MobileSearch";

export default async function LegacyHeader() {
  // Settings + header menu. Plan 16 Phase E: the legacy fallback now reads
  // the menu by slug ("main") since Theme.headerMenuId was dropped — sections
  // (ThemeSection rows) drive the storefront header for any real theme.
  const [settings, menu] = await Promise.all([
    getSiteSettings(),
    getMenuBySlug("main"),
  ]);
  const menuItems = menu?.items ?? [];

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
                {/* Logo placeholder uses brand-primary so theme switching
                    visibly retints the corner without code changes. */}
                <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-brand bg-brand-primary text-brand-primary-foreground">
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

            {/* Cart - Siempre visible. Abre el drawer general. */}
            <CartButton className="h-9 w-9 md:h-10 md:w-10" />

            {/* Mobile Menu - Siempre visible */}
            <MobileMenu menuItems={menuItems} isAdmin={false} />
          </div>
        </div>

        {/* Search Bar - Móvil (alternativa: mostrar debajo del header) */}
        <div className="md:hidden pb-3 pt-2 border-t">
          <SearchBar />
        </div>
      </div>

      {/* Navigation Links - Solo Desktop. Reads the active "main" menu;
          falls back to a minimal nav when the menu is missing. */}
      <div className="border-t hidden md:block">
        <div className="container mx-auto px-4">
          {menuItems.length > 0 ? (
            <HeaderNavMenu items={menuItems} />
          ) : (
            <nav className="flex h-10 items-center space-x-6 text-sm overflow-x-auto">
              <Link
                href="/productos"
                className="transition-colors hover:text-foreground/80 whitespace-nowrap"
              >
                Todos los Productos
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

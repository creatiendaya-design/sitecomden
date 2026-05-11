import Link from "next/link"
import Image from "next/image"
import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import CartCounter from "@/components/shop/CartCounter"
import MobileMenu from "@/components/shop/MobileMenu"
import SearchBar from "@/components/shop/SearchBar"
import { HeaderAuth } from "@/components/shop/HeaderAuth"
import { HeaderNavMenu } from "@/components/shop/HeaderNavMenu"
import MobileSearch from "@/components/shop/MobileSearch"
import { getSiteSettings } from "@/lib/site-settings"
import { getMenuBySlug } from "@/lib/menus/get-menu-by-slug"
import { getMenuById } from "@/lib/menus/get-menu-by-id"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import type { ResolvedMenu } from "@/lib/menus/resolve-menu"

interface Props {
  section: ResolvedThemeSection
}

interface HeaderMainContent {
  menuId?: string | null
  showSearch?: boolean
  showAuth?: boolean
  showCart?: boolean
}

export async function HeaderMain({ section }: Props) {
  const data = section.content as HeaderMainContent

  const [settings, menu] = await Promise.all([
    getSiteSettings(),
    resolveHeaderMenu(data.menuId ?? null),
  ])

  const menuItems = menu?.items ?? []
  const showSearch = data.showSearch ?? true
  const showAuth = data.showAuth ?? true
  const showCart = data.showCart ?? true

  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )

  return (
    <div
      className={className}
      style={style}
      data-color-scheme={dataColorScheme}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-14 md:h-16 items-center justify-between gap-2">
          <Link href="/" className="flex items-center shrink-0">
            {settings.site_logo ? (
              <Image
                src={settings.site_logo}
                alt={settings.site_name}
                width={120}
                height={32}
                className="h-8 md:h-10 w-auto object-contain"
                priority
              />
            ) : (
              <>
                <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-brand bg-brand-primary text-brand-primary-foreground">
                  <span className="text-lg md:text-xl font-bold">SG</span>
                </div>
                <span className="hidden font-bold sm:inline-block ml-2">
                  {settings.site_name}
                </span>
              </>
            )}
          </Link>

          {showSearch && (
            <div className="hidden flex-1 px-4 lg:px-8 md:block">
              <SearchBar />
            </div>
          )}

          <div className="flex items-center gap-1 md:gap-2">
            {showSearch && (
              <div className="md:hidden">
                <MobileSearch />
              </div>
            )}
            {showAuth && (
              <div className="hidden sm:block">
                <HeaderAuth />
              </div>
            )}
            {showCart && (
              <Link href="/carrito">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 md:h-10 md:w-10"
                >
                  <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                  <CartCounter />
                </Button>
              </Link>
            )}
            <MobileMenu menuItems={menuItems} isAdmin={false} />
          </div>
        </div>

        {showSearch && (
          <div className="md:hidden pb-3 pt-2 border-t">
            <SearchBar />
          </div>
        )}
      </div>

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
    </div>
  )
}

async function resolveHeaderMenu(
  menuId: string | null,
): Promise<ResolvedMenu | null> {
  if (menuId) {
    const byId = await getMenuById(menuId)
    if (byId) return byId
  }
  return getMenuBySlug("main")
}

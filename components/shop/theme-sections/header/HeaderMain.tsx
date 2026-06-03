import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/db"
import CartButton from "@/components/shop/CartButton"
import MobileMenu from "@/components/shop/MobileMenu"
import SearchPill from "@/components/shop/SearchPill"
import { HeaderAuth } from "@/components/shop/HeaderAuth"
import { HeaderNavMenu } from "@/components/shop/HeaderNavMenu"
import { getSiteSettings } from "@/lib/site-settings"
import { getMenuBySlug } from "@/lib/menus/get-menu-by-slug"
import { getMenuById } from "@/lib/menus/get-menu-by-id"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { resolveColorValue } from "@/lib/blocks/apply-style"
import type { BlockStyle } from "@/lib/blocks/types"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"
import type { ResolvedMenu } from "@/lib/menus/resolve-menu"

interface Props {
  section: ResolvedThemeSection
}

interface HeaderMainContent {
  menuId?: string | null
  /** Optional menu shown ONLY inside the mobile drawer. When unset, the
   *  drawer reuses the desktop menu — admins set this when they want a
   *  different IA on mobile (e.g. to avoid a duplicated "Inicio" link). */
  mobileMenuId?: string | null
  showSearch?: boolean
  showAuth?: boolean
  showCart?: boolean
}

export async function HeaderMain({ section }: Props) {
  const data = section.content as HeaderMainContent

  const [settings, menu, mobileMenuPicked, categories] = await Promise.all([
    getSiteSettings(),
    resolveHeaderMenu(data.menuId ?? null),
    // Only fetch a separate mobile menu when the admin explicitly picked one.
    data.mobileMenuId ? getMenuById(data.mobileMenuId) : Promise.resolve(null),
    // Root-level categories for the "All Categories" pill dropdown.
    prisma.category.findMany({
      where: { active: true, parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
  ])

  const menuItems = menu?.items ?? []
  // Mobile drawer items: explicit override → falls back to desktop menu.
  const mobileMenuItems = mobileMenuPicked?.items ?? menuItems
  const showSearch = data.showSearch ?? true
  const showAuth = data.showAuth ?? true
  const showCart = data.showCart ?? true

  const style = section.content.style as BlockStyle | undefined
  const {
    className,
    style: inlineStyle,
    dataColorScheme,
  } = applyThemeSectionStyle(style)

  // The header wrapper always uses `bg-brand-bg text-brand-text`, which
  // chain through `--color-brand-*` → `--theme-*`. That lets:
  //   - a picked color scheme rebind `--theme-*` via `data-color-scheme`
  //     (CSS rule from /api/themes/tokens.css) — header colors follow it,
  //   - custom inline colors win over the class (style > className), and
  //   - children that also use `bg-brand-*` / `text-brand-*` (e.g. the
  //     nav dropdown panel) inherit the same effective colors.
  //
  // When NEITHER a scheme nor custom colors are configured we still want
  // a visible default. We do that by overriding `--theme-bg`/`--theme-text`
  // inline on the wrapper to the NEXVO dark defaults — the brand-* chain
  // then resolves to dark everywhere below the wrapper. We deliberately
  // skip this override when a scheme IS picked so the `[data-color-scheme]`
  // CSS rule (lower specificity than inline) actually takes effect.
  //
  // Device-aware custom colors: resolveColorValue gives us the shared
  // (desktop default) and mobile values. We emit BOTH into the wrapper —
  // shared into --theme-bg/--theme-text, mobile into --theme-bg-mobile /
  // --theme-text-mobile + a class that the globals.css media query uses
  // to rebind --theme-* below 768px. This keeps both the wrapper itself
  // AND any descendants that read --theme-* in sync per device.
  const hasScheme = !!style?.colorSchemeId
  const bgResolved = resolveColorValue(style?.backgroundColor)
  const textResolved = resolveColorValue(style?.textColor)
  const hasCustomBg = bgResolved.shared !== undefined
  const hasCustomText = textResolved.shared !== undefined
  // Drawer colors: only the mobile value matters (drawer is mobile-only),
  // falling back to the shared value if no mobile override exists. Pass
  // undefined when not configured so MobileMenu uses `--theme-drawer-*`
  // from the active color scheme.
  const drawerBgResolved = resolveColorValue(style?.drawerBgColor)
  const drawerTextResolved = resolveColorValue(style?.drawerTextColor)
  const drawerBg = drawerBgResolved.mobile ?? drawerBgResolved.shared
  const drawerText = drawerTextResolved.mobile ?? drawerTextResolved.shared

  type CssVars = React.CSSProperties & Record<string, string | number>
  const wrapperStyle: CssVars = { ...inlineStyle } as CssVars
  const extraClasses: string[] = []
  if (!hasScheme) {
    wrapperStyle["--theme-bg"] = hasCustomBg
      ? bgResolved.shared!
      : "#020617" // slate-950
    wrapperStyle["--theme-text"] = hasCustomText
      ? textResolved.shared!
      : "#ffffff"
    if (
      hasCustomBg &&
      bgResolved.mobile !== undefined &&
      bgResolved.mobile !== bgResolved.shared
    ) {
      wrapperStyle["--theme-bg-mobile"] = bgResolved.mobile
      extraClasses.push("theme-bg-mobile")
    }
    if (
      hasCustomText &&
      textResolved.mobile !== undefined &&
      textResolved.mobile !== textResolved.shared
    ) {
      wrapperStyle["--theme-text-mobile"] = textResolved.mobile
      extraClasses.push("theme-text-mobile")
    }
  }

  return (
    <div
      className={cn("bg-brand-bg text-brand-text", className, extraClasses)}
      style={wrapperStyle}
      data-color-scheme={dataColorScheme}
      data-preview-target={`section:${section.id}`}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center gap-3 md:gap-6">
          <Link href="/" className="flex shrink-0 items-center">
            {settings.site_logo ? (
              <Image
                src={settings.site_logo}
                alt={settings.site_name}
                width={120}
                height={32}
                className="h-8 w-auto object-contain md:h-9"
                priority
              />
            ) : (
              <span className="text-xl font-bold tracking-tight md:text-2xl">
                {settings.site_name}
              </span>
            )}
          </Link>

          {showSearch && (
            <div className="hidden flex-1 justify-center md:flex">
              <SearchPill categories={categories} />
            </div>
          )}

          <div className="ml-auto flex items-center gap-1 md:gap-2">
            {showAuth && (
              <div className="hidden sm:block">
                <HeaderAuth />
              </div>
            )}
            {showCart && <CartButton />}
            <div className="md:hidden">
              <MobileMenu
                menuItems={mobileMenuItems}
                isAdmin={false}
                siteName={settings.site_name}
                siteLogo={settings.site_logo ?? null}
                drawerBg={drawerBg}
                drawerText={drawerText}
              />
            </div>
          </div>
        </div>

        {/* Mobile search row stays at the same dark bg via the parent. */}
        {showSearch && (
          <div className="pb-3 md:hidden">
            <MobileSearchInline categories={categories} />
          </div>
        )}
      </div>

      {/* Nav row — same bar (no divider/border so the dark surface stays
          unified, matching the NEXVO reference). */}
      <div className="hidden md:block">
        <div className="container mx-auto px-4">
          {menuItems.length > 0 ? (
            <div className="border-t border-current/10 py-1">
              <HeaderNavMenu items={menuItems} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Mobile-only inline pill — same component but the parent wrapper sizes
 * it to full width. Kept as a separate sub-component so the dropdown and
 * focus logic don't fight with the desktop instance.
 */
function MobileSearchInline({
  categories,
}: {
  categories: { id: string; name: string; slug: string }[]
}) {
  return (
    <div className="w-full">
      <SearchPill categories={categories} />
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

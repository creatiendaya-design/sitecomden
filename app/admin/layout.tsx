"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Ruler,
  ShoppingCart,
  Package,
  Clock,
  LogOut,
  Store,
  Ticket,
  Truck,
  Settings,
  ChevronRight,
  CreditCard,
  Package2,
  Trophy,
  Mail,
  FileText,
  Menu,
  X,
  Shield,
  Users,
  Asterisk,
  ClipboardList,
  LayoutTemplate,
  ScrollText,
  Sparkles,
  Tag,
  ExternalLink,
  Images,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { AdminThemeProvider } from "@/components/admin/AdminThemeProvider";
import { AdminThemeToggle } from "@/components/admin/AdminThemeToggle";

interface NavItem {
  href?: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  items?: NavItem[];
}

function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Detect the full-screen page builder routes so we render them WITHOUT
  // the admin sidebar and top header. Two cases:
  //  - Product landing builder: /admin/productos/<id>?tab=landing
  //  - Template editor:         /admin/landing-plantillas/<id>
  const isProductLandingBuilder =
    /^\/admin\/productos\/[^/]+$/.test(pathname ?? "") &&
    searchParams?.get("tab") === "landing";
  const isTemplateEditor =
    /^\/admin\/landing-plantillas\/[^/]+$/.test(pathname ?? "") &&
    !/\/editar$/.test(pathname ?? "") &&  // /editar is the metadata form, keep chrome
    !/\/biblioteca$/.test(pathname ?? "")
  const isPageEditor =
    /^\/admin\/paginas\/[^/]+$/.test(pathname ?? "") &&
    !/\/editar$/.test(pathname ?? "");
  const isMenuEditor =
    /^\/admin\/menus\/[^/]+$/.test(pathname ?? "") &&
    !/\/editar$/.test(pathname ?? "");
  const isCategoryBuilder =
    /^\/admin\/categorias\/[^/]+\/builder$/.test(pathname ?? "");
  const isThemeCustomizer =
    /^\/admin\/personalizar\/temas\/[^/]+\/customize$/.test(pathname ?? "");
  const isBulkEditor =
    /^\/admin\/productos\/bulk-edit\/?$/.test(pathname ?? "");
  const isCodFormEditor =
    /^\/admin\/formularios-cod\/[^/]+$/.test(pathname ?? "");
  const isFullScreenBuilder =
    isProductLandingBuilder ||
    isTemplateEditor ||
    isPageEditor ||
    isMenuEditor ||
    isCategoryBuilder ||
    isThemeCustomizer ||
    isBulkEditor ||
    isCodFormEditor;
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "Configuración",
    "Métodos de Pago",
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [siteName, setSiteName] = useState("ShopGood Perú");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.settings?.site_name) setSiteName(data.settings.site_name);
      })
      .catch(() => {});
  }, []);

  // Cerrar sidebar al cambiar de ruta en móvil
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false); // reset-on-navigation: intentional sync setState
  }, [pathname]);

  // Prevenir scroll del body cuando el sidebar está abierto en móvil
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [sidebarOpen]);

  const navItems: NavItem[] = [
    {
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
    },
    {
      href: "/admin/ordenes",
      icon: ShoppingCart,
      label: "Órdenes",
    },
    {
      href: "/admin/clientes",
      icon: Users,
      label: "Clientes",
    },
    {
      href: "/admin/resenas",
      icon: Star,
      label: "Reseñas",
    },
    {
      icon: Package,
      label: "Productos",
      items: [
        {
          href: "/admin/productos",
          icon: Package,
          label: "Listado",
        },
        {
          href: "/admin/categorias",
          icon: Package,
          label: "Categorías",
        },
        {
          href: "/admin/inventario",
          icon: Package2,
          label: "Inventario",
        },
        {
          href: "/admin/landing-plantillas",
          icon: LayoutTemplate,
          label: "Plantillas de Landing",
        },
        {
          href: "/admin/personalizables",
          icon: Sparkles,
          label: "Personalizables",
        },
        {
          href: "/admin/guia-tallas",
          icon: Ruler,
          label: "Guía de Tallas",
        },
        {
          href: "/admin/formularios-cod",
          icon: ClipboardList,
          label: "Formularios COD",
        },
      ],
    },
    {
      href: "/admin/personalizar",
      icon: Store,
      label: "Personalizar tienda",
    },
    {
      icon: Images,
      label: "Contenido",
      items: [
        {
          href: "/admin/contenido/archivos",
          icon: Images,
          label: "Archivos",
        },
      ],
    },
    {
      href: "/admin/paginas",
      icon: FileText,
      label: "Páginas",
    },
    {
      href: "/admin/politicas",
      icon: ScrollText,
      label: "Políticas",
    },
    {
      href: "/admin/menus",
      icon: Menu,
      label: "Menús",
    },
    {
      href: "/admin/envios",
      icon: Truck,
      label: "Envíos",
    },
    {
      href: "/admin/promociones",
      icon: Tag,
      label: "Promociones",
    },
    {
      href: "/admin/cupones",
      icon: Ticket,
      label: "Cupones",
    },
    {
      href: "/admin/newsletter",
      icon: Mail,
      label: "Newsletter",
    },
    {
      href: "/admin/lealtad",
      icon: Trophy,
      label: "Lealtad",
    },
    {
      href: "/admin/pagos-pendientes",
      icon: Clock,
      label: "Pagos Pendientes",
    },
    {
      href: "/admin/facturacion",
      icon: FileText,
      label: "Facturación",
    },
    {
      icon: Settings,
      label: "Configuración",
      items: [
        {
          href: "/admin/configuracion",
          icon: FileText,
          label: "General",
        },
        {
          href: "/admin/configuracion/emails",
          icon: Mail,
          label: "Emails",
        },
         {
          href: "/admin/configuracion/pixeles",
          icon: Asterisk,
          label: "Pixeles",
        },
        {
          href: "/admin/configuracion/usuarios",
          icon: Users,
          label: "Usuarios",
        },
        {
          href: "/admin/configuracion/roles",
          icon: Shield,
          label: "Roles",
        },
        {
          icon: CreditCard,
          label: "Métodos de Pago",
          items: [
            {
              href: "/admin/configuracion/pagos",
              icon: CreditCard,
              label: "General",
            },
            {
              href: "/admin/configuracion/culqi",
              icon: CreditCard,
              label: "Culqi",
            },
            {
              href: "/admin/configuracion/mercadopago",
              icon: CreditCard,
              label: "Mercado Pago",
            },
            {
              href: "/admin/configuracion/paypal",
              icon: CreditCard,
              label: "PayPal",
            },
          ],
        },
        {
          href: "/admin/configuracion/sunat",
          icon: FileText,
          label: "Facturación SUNAT",
        },
        {
          href: "/admin/libro-reclamaciones",
          icon: FileText,
          label: "Libro de Reclamaciones",
        },
      ],
    },
  ];

  const toggleItem = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isExpanded = (label: string) => expandedItems.includes(label);

  // Full-screen builder mode: bypass sidebar + header, render children directly.
  // The Toaster is still mounted so in-app toasts (save errors, etc.) work.
  if (isFullScreenBuilder) {
    return (
      <>
        {children}
        <Toaster position="top-right" richColors />
      </>
    );
  }

  // Recursive nav item renderer with multi-level support and a left accent bar
  // for the active route — gives the sidebar a clear visual hierarchy.
  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const Icon = item.icon;

    if (item.items) {
      const expanded = isExpanded(item.label);
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleItem(item.label)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-md py-2 pr-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              expanded && "text-sidebar-foreground"
            )}
            style={{ paddingLeft: `${12 + depth * 14}px` }}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 opacity-60 transition-transform duration-200",
                expanded && "rotate-90"
              )}
            />
          </button>

          {expanded && (
            <div className="mt-0.5 space-y-0.5">
              {item.items.map((subItem) => renderNavItem(subItem, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const active = isActive(item.href!);
    return (
      <Link
        key={item.href}
        href={item.href!}
        className={cn(
          "group relative flex items-center gap-3 rounded-md py-2 pr-2 text-sm transition-all",
          active
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
      >
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary"
          />
        )}
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-opacity",
            active ? "opacity-100" : "opacity-70 group-hover:opacity-100"
          )}
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-300 lg:w-64 lg:translate-x-0 lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Navegación principal"
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm ring-1 ring-primary/20">
              <Store className="h-4.5 w-4.5" strokeWidth={2.25} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Admin</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                Panel
              </span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav
          className="admin-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-4"
        >
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        {/* Footer actions */}
        <div className="shrink-0 space-y-1 border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="h-9 w-full justify-start gap-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            asChild
          >
            <Link href="/" target="_blank">
              <ExternalLink className="h-4 w-4 opacity-70" />
              Ver tienda
            </Link>
          </Button>
          <form action="/api/admin/logout" method="POST">
            <Button
              variant="ghost"
              type="submit"
              className="h-9 w-full justify-start gap-2 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex w-full min-w-0 flex-1 flex-col bg-[#f6f6f7] lg:ml-64 dark:bg-background">
        {/* Sticky header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground/90">
                {siteName}
              </p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Panel de administración
              </p>
            </div>

            <div className="flex items-center gap-1">
              <AdminThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-9 w-9 sm:inline-flex"
                aria-label="Ver tienda"
                asChild
              >
                <Link href="/" target="_blank">
                  <Store className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </div>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // useSearchParams() inside AdminLayoutInner requires a Suspense boundary
  // above it (Next.js App Router requirement).
  return (
    <AdminThemeProvider>
      <Suspense fallback={null}>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </Suspense>
    </AdminThemeProvider>
  );
}

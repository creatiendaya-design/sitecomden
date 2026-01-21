"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Clock,
  LogOut,
  Store,
  Ticket,
  Truck,
  Settings,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Package2,
  Trophy,
  Mail,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

interface NavItem {
  href?: string;
  icon: any;
  label: string;
  items?: NavItem[];
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Configuración"]);

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
      href: "/admin/productos",
      icon: Package,
      label: "Productos",
    },
    {
      href: "/admin/envios/zonas",
      icon: Truck,
      label: "Envíos",
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
      href: "/admin/cupones",
      icon: Ticket,
      label: "Cupones",
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
          href: "/admin/configuracion/pagos",
          icon: CreditCard,
          label: "Métodos de Pago",
        },
        {
          href: "/admin/libro-reclamaciones",
          icon: FileText,
          label: "Libro de Reclamaciones",
        }
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-slate-50">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Store className="h-5 w-5" />
            </div>
            <span className="font-bold">Admin Panel</span>
          </Link>
        </div>

        <nav className="space-y-1 p-4 overflow-y-auto h-[calc(100vh-13rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.items) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleItem(item.label)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-100",
                      isExpanded(item.label) && "bg-slate-100"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isExpanded(item.label) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded(item.label) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.items.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href!}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                              isActive(subItem.href!)
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-slate-100"
                            )}
                          >
                            <SubIcon className="h-4 w-4" />
                            <span className="text-sm">{subItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive(item.href!)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-slate-100"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link href="/">
              <Store className="mr-2 h-4 w-4" />
              Ver Tienda
            </Link>
          </Button>
          <form action="/api/admin/logout" method="POST">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive"
              type="submit"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="border-b bg-white p-6">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-sm text-muted-foreground">ShopGood Perú</h2>
          </div>
        </div>
        <div className="mx-auto max-w-7xl p-6">{children}</div>
      </main>

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}
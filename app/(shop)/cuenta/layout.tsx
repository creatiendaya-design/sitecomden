import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Mi Cuenta",
};

export default async function CuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();

  if (!userId) {
    redirect("/iniciar-sesion");
  }

  const menuItems = [
    {
      label: "Mis Pedidos",
      href: "/cuenta/ordenes",
      icon: Package,
    },
    {
      label: "Mi Perfil",
      href: "/cuenta/perfil",
      icon: User,
    },
  ];

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mi Cuenta</h1>
        <p className="text-muted-foreground">
          Administra tus pedidos e información personal
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-2">
          <nav className="flex flex-col space-y-1">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  <ChevronRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, User, ShoppingBag, Package, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SignInButton, SignedIn, SignedOut, useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface MobileMenuProps {
  categories: Category[];
  isAdmin?: boolean;
}

export default function MobileMenu({ categories, isAdmin }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-6">
          {/* Usuario */}
          <SignedIn>
            <div className="border-b pb-4">
              <Link
                href="/cuenta/ordenes"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent"
              >
                <User className="h-5 w-5" />
                <span>Mi Cuenta</span>
              </Link>

              <Link
                href="/cuenta/ordenes"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent"
              >
                <Package className="h-5 w-5" />
                <span>Mis Pedidos</span>
              </Link>

              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-primary"
                >
                  <ShoppingBag className="h-5 w-5" />
                  <span className="font-semibold">Panel Admin</span>
                </Link>
              )}
            </div>
          </SignedIn>

          <SignedOut>
            <div className="border-b pb-4">
              <SignInButton mode="modal">
                <Button variant="default" className="w-full">
                  <User className="mr-2 h-4 w-4" />
                  Iniciar Sesión
                </Button>
              </SignInButton>
            </div>
          </SignedOut>

          {/* Categorías */}
          <div>
            <h3 className="font-semibold mb-2 px-3">Categorías</h3>
            <Link
              href="/productos"
              onClick={() => setOpen(false)}
              className="block p-3 rounded-lg hover:bg-accent"
            >
              Todos los Productos
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categoria/${category.slug}`}
                onClick={() => setOpen(false)}
                className="block p-3 rounded-lg hover:bg-accent"
              >
                {category.name}
              </Link>
            ))}
          </div>

          {/* Links adicionales */}
          <div className="border-t pt-4">
            <Link
              href="/sobre-nosotros"
              onClick={() => setOpen(false)}
              className="block p-3 rounded-lg hover:bg-accent"
            >
              Sobre Nosotros
            </Link>
            <Link
              href="/contacto"
              onClick={() => setOpen(false)}
              className="block p-3 rounded-lg hover:bg-accent"
            >
              Contacto
            </Link>
            <Link
              href="/libro-reclamaciones"
              onClick={() => setOpen(false)}
              className="block p-3 rounded-lg hover:bg-accent"
            >
              Libro de Reclamaciones
            </Link>
          </div>

          {/* Cerrar Sesión */}
          <SignedIn>
            <div className="border-t pt-4">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent w-full text-left text-destructive"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </SignedIn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
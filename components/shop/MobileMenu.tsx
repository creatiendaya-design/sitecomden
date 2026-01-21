"use client";
import { UserMenu } from "./UserMenu";
import Link from "next/link";
import { Menu, Home, Package, Info, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

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

  const closeMenu = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>
        
        {/* User Menu */}
        <div className="mt-6 pb-4 border-b">
          <UserMenu />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col space-y-1 mt-4">
          {/* Inicio */}
          <Link
            href="/"
            onClick={closeMenu}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Inicio</span>
          </Link>
          
          {/* Todos los productos */}
          <Link
            href="/productos"
            onClick={closeMenu}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
          >
            <Package className="h-4 w-4" />
            <span>Todos los Productos</span>
          </Link>

          {/* Categorías */}
          {categories.length > 0 && (
            <div className="pt-3 pb-2">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Categorías
              </p>
              <div className="space-y-1">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/categoria/${category.slug}`}
                    onClick={closeMenu}
                    className="flex items-center px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Links adicionales */}
          <div className="pt-3 border-t space-y-1">
            <Link
              href="/sobre-nosotros"
              onClick={closeMenu}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
            >
              <Info className="h-4 w-4" />
              <span>Nosotros</span>
            </Link>
            
            <Link
              href="/contacto"
              onClick={closeMenu}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>Contacto</span>
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
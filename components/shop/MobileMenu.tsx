"use client";
import { UserMenu } from "./UserMenu";
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
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>
        
        {/* User Menu en Mobile */}
        <div className="mt-4 pb-4 border-b">
          <UserMenu />
        </div>

        <nav className="flex flex-col space-y-4 mt-6">
          {/* ... resto del menú */}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
"use client";

import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import Link from "next/link";

export function HeaderAuth() {
  return (
    <>
      {/* Mi Cuenta Link */}
      <SignedIn>
        <Link href="/cuenta" className="hidden md:block">
          <Button variant="ghost" size="sm">
            Mi Cuenta
          </Button>
        </Link>
      </SignedIn>

      {/* User Menu - Desktop */}
      <div className="hidden md:block">
        <SignedIn>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9",
                userButtonPopoverCard: "shadow-lg",
              },
            }}
          />
        </SignedIn>

        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="ghost" size="sm">
              <User className="mr-2 h-4 w-4" />
              Iniciar Sesión
            </Button>
          </SignInButton>
        </SignedOut>
      </div>
    </>
  );
}
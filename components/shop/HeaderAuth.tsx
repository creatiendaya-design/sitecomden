"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "./UserMenu";

export function HeaderAuth() {
  return (
    <>
      {/* Signed In State */}
      <SignedIn>
    
        
        {/* Avatar Dropdown */}
        <div className="hidden md:block">
          <UserMenu />
        </div>
      </SignedIn>

      {/* Signed Out State */}
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="ghost" size="sm">
            <User className="mr-2 h-4 w-4" />
            Iniciar Sesión
          </Button>
        </SignInButton>
      </SignedOut>
    </>
  );
}
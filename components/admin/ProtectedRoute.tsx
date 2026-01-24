// components/admin/ProtectedRoute.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkPermission } from "@/actions/users";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission: string;
  fallbackPath?: string;
}

export default function ProtectedRoute({
  children,
  permission,
  fallbackPath = "/admin/dashboard",
}: ProtectedRouteProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function verify() {
      try {
        const result = await checkPermission(permission);
        
        if (!result.success || !result.hasPermission) {
          router.push(fallbackPath);
          return;
        }
        
        setHasAccess(true);
      } catch (error) {
        router.push(fallbackPath);
      } finally {
        setChecking(false);
      }
    }

    verify();
  }, [permission, fallbackPath, router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
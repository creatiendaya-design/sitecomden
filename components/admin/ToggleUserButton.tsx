// components/admin/ToggleUserButton.tsx
"use client";

import { useState } from "react";
import { Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleUserStatus } from "@/actions/users";
import { toast } from "sonner";

interface ToggleUserButtonProps {
  userId: string;
  isActive: boolean;
}

export default function ToggleUserButton({ userId, isActive }: ToggleUserButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const result = await toggleUserStatus(userId, !isActive);

      if (result.success) {
        toast.success(isActive ? "Usuario desactivado" : "Usuario activado");
      } else {
        toast.error(result.error || "Error al cambiar el estado");
      }
    } catch (error) {
      toast.error("Error al cambiar el estado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={isActive ? "" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
      title={isActive ? "Desactivar usuario" : "Activar usuario"}
    >
      <Power className="h-4 w-4" />
    </Button>
  );
}
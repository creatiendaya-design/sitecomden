// components/admin/ToggleRoleButton.tsx
"use client";

import { useState } from "react";
import { Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleRoleStatus } from "@/actions/roles";
import { toast } from "sonner";

interface ToggleRoleButtonProps {
  roleId: string;
  isActive: boolean;
}

export default function ToggleRoleButton({ roleId, isActive }: ToggleRoleButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const result = await toggleRoleStatus(roleId, !isActive);

      if (result.success) {
        toast.success(isActive ? "Rol desactivado" : "Rol activado");
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
      title={isActive ? "Desactivar rol" : "Activar rol"}
    >
      <Power className="h-4 w-4" />
    </Button>
  );
}
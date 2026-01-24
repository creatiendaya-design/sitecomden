// components/admin/DeleteRoleButton.tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteRole } from "@/actions/roles";
import { toast } from "sonner";

interface DeleteRoleButtonProps {
  roleId: string;
  roleName: string;
  userCount: number;
}

export default function DeleteRoleButton({
  roleId,
  roleName,
  userCount,
}: DeleteRoleButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await deleteRole(roleId);

      if (result.success) {
        toast.success("Rol eliminado correctamente");
      } else {
        toast.error(result.error || "Error al eliminar el rol");
      }
    } catch (error) {
      toast.error("Error al eliminar el rol");
    } finally {
      setLoading(false);
    }
  };

  // Si tiene usuarios, deshabilitar
  const disabled = userCount > 0;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          disabled={disabled}
          title={disabled ? `No se puede eliminar (${userCount} usuarios asignados)` : ""}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar rol "{roleName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El rol será eliminado permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
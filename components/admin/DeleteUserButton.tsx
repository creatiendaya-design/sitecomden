// components/admin/DeleteUserButton.tsx
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
import { deleteUser } from "@/actions/users";
import { toast } from "sonner";

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
  isSuperAdmin?: boolean;
}

export default function DeleteUserButton({
  userId,
  userName,
  isSuperAdmin = false,
}: DeleteUserButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await deleteUser(userId);

      if (result.success) {
        toast.success("Usuario eliminado correctamente");
      } else {
        toast.error(result.error || "Error al eliminar el usuario");
      }
    } catch (error) {
      toast.error("Error al eliminar el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar usuario "{userName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El usuario perderá todo acceso al
            sistema de forma permanente.
            {isSuperAdmin && (
              <span className="block mt-2 font-semibold text-yellow-600">
                ⚠️ Este es un Super Admin. Solo otro Super Admin puede eliminarlo.
              </span>
            )}
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
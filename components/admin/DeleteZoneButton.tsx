"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteShippingZone } from "@/actions/shipping-edit";
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
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteZoneButtonProps {
  zone: {
    id: string;
    name: string;
    districtCount: number;
    groupCount: number;
    rateCount: number;
  };
}

export function DeleteZoneButton({ zone }: DeleteZoneButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);

    const result = await deleteShippingZone(zone.id);

    if (result.success) {
      toast.success("Zona eliminada correctamente");
      setOpen(false);
      router.refresh(); // Recargar la página para actualizar la lista
    } else {
      toast.error(result.error || "Error al eliminar zona");
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar zona de envío?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente la zona{" "}
            <strong>"{zone.name}"</strong> y todos sus datos asociados:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{zone.districtCount} distritos asignados</li>
              <li>{zone.groupCount} grupos de tarifas</li>
              <li>{zone.rateCount} tarifas de envío</li>
            </ul>
            <p className="mt-3 font-semibold text-destructive">
              Esta acción no se puede deshacer.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Eliminar Zona"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
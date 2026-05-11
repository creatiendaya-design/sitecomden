"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  getShippingZoneById,
  updateShippingZone,
  deleteShippingZone,
} from "@/actions/shipping-edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
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
import { ArrowLeft, Save, Trash2, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function EditZonePage() {
  const router = useRouter();
  const params = useParams();
  const zoneId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });

  const [zoneInfo, setZoneInfo] = useState<{
    districtCount: number;
    rateCount: number;
  } | null>(null);

  useEffect(() => {
    loadZone();
  }, [zoneId]);

  const loadZone = async () => {
    setLoading(true);
    const result = await getShippingZoneById(zoneId);

    if (!result.success || !result.data) {
      toast.error(result.error || "Zona no encontrada");
      setLoading(false);
      return;
    }

    const zone = result.data;
    setFormData({
      name: zone.name,
      description: zone.description || "",
      active: zone.active,
    });

    setZoneInfo({
      districtCount: zone.districts.length,
      rateCount: zone.rates.length,
    });

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const result = await updateShippingZone(zoneId, {
      name: formData.name,
      description: formData.description || null,
      active: formData.active,
    });

    if (result.success) {
      toast.success("Zona actualizada correctamente");
      router.push(`/admin/envios/zonas/${zoneId}`);
    } else {
      toast.error(result.error || "Error al actualizar zona");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    const result = await deleteShippingZone(zoneId);

    if (result.success) {
      toast.success("Zona eliminada");
      router.push("/admin/envios/zonas");
    } else {
      toast.error(result.error || "Error al eliminar zona");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 p-4 sm:p-0 pb-24 sm:pb-0 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground overflow-hidden">
        <Link href="/admin/envios" className="hover:text-foreground transition-colors shrink-0">
          Envíos
        </Link>
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
        <Link href="/admin/envios/zonas" className="hover:text-foreground transition-colors shrink-0">
          Zonas
        </Link>
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
        <Link
          href={`/admin/envios/zonas/${zoneId}`}
          className="hover:text-foreground transition-colors truncate"
        >
          {formData.name || "Zona"}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
        <span className="text-foreground font-medium shrink-0">Editar</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" asChild className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
            <Link href={`/admin/envios/zonas/${zoneId}`} aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl font-bold">Editar zona</h1>
            <p className="text-xs sm:text-base text-muted-foreground hidden sm:block">
              Modifica la información de la zona
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting} size="sm" className="shrink-0">
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Eliminar Zona</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente la zona y todos sus datos
                asociados:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>{zoneInfo?.districtCount || 0} distritos asignados</li>
                  <li>{zoneInfo?.rateCount || 0} tarifas de envío</li>
                </ul>
                <p className="mt-2 font-semibold text-destructive">
                  Esta acción no se puede deshacer.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Eliminando..." : "Eliminar Zona"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Información de la zona */}
      {zoneInfo && (
        <div className="grid gap-2 sm:gap-4 grid-cols-2">
          <Card>
            <CardHeader className="px-3 py-2.5 sm:px-6 sm:py-4 pb-1 sm:pb-3">
              <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground">
                Distritos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <p className="text-xl sm:text-2xl font-bold tabular-nums">{zoneInfo.districtCount}</p>
              <Button variant="link" className="p-0 h-auto text-[11px] sm:text-sm" asChild>
                <Link href={`/admin/envios/zonas/${zoneId}?tab=distritos`}>
                  Gestionar →
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-3 py-2.5 sm:px-6 sm:py-4 pb-1 sm:pb-3">
              <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground">
                Tarifas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <p className="text-xl sm:text-2xl font-bold tabular-nums">{zoneInfo.rateCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulario */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Información de la Zona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 pb-4 sm:px-6 sm:pb-6">
          {/* Nombre */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="name" className="text-sm">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Lima Metropolitana"
              required
              className="h-9"
            />
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Ej: Lima Metropolitana, Callao, Arequipa Centro
            </p>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="description" className="text-sm">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Zona que cubre los distritos principales..."
              rows={3}
            />
          </div>

          <Separator />

          {/* Estado Activo */}
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0 flex-1">
              <Label htmlFor="active" className="text-sm">Estado</Label>
              <p className="text-[11px] sm:text-sm text-muted-foreground">
                {formData.active
                  ? "Activa y visible en checkout"
                  : "Inactiva, no se mostrará en checkout"}
              </p>
            </div>
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, active: checked })
              }
            />
          </div>

          {/* Acciones desktop */}
          <div className="hidden sm:flex gap-3 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/admin/envios/zonas/${zoneId}`)}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sticky bottom action bar mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur p-3 sm:hidden">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/admin/envios/zonas/${zoneId}`)}
            disabled={saving}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

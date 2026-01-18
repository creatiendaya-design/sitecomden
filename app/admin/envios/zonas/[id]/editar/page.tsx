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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
import { ArrowLeft, Save, Trash2, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function EditZonePage() {
  const router = useRouter();
  const params = useParams();
  const zoneId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });

  const [zoneInfo, setZoneInfo] = useState<{
    districtCount: number;
    groupCount: number;
    rateCount: number;
  } | null>(null);

  useEffect(() => {
    loadZone();
  }, [zoneId]);

  const loadZone = async () => {
    setLoading(true);
    const result = await getShippingZoneById(zoneId);

    if (!result.success || !result.data) {
      setError(result.error || "Zona no encontrada");
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
      groupCount: zone.rateGroups.length,
      rateCount: zone.rateGroups.reduce((sum, g) => sum + g.rates.length, 0),
    });

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await updateShippingZone(zoneId, {
      name: formData.name,
      description: formData.description || null,
      active: formData.active,
    });

    if (result.success) {
      setSuccess("Zona actualizada correctamente");
      setTimeout(() => {
        router.push(`/admin/envios/zonas/${zoneId}/grupos`);
      }, 1500);
    } else {
      setError(result.error || "Error al actualizar zona");
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    const result = await deleteShippingZone(zoneId);

    if (result.success) {
      router.push("/admin/envios/zonas");
    } else {
      setError(result.error || "Error al eliminar zona");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/envios/zonas/${zoneId}/grupos`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Zona de Envío</h1>
            <p className="text-muted-foreground">
              Modifica la información de la zona
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Zona
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
                  <li>{zoneInfo?.groupCount || 0} grupos de tarifas</li>
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

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 text-green-900">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Información de la zona */}
      {zoneInfo && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Distritos Asignados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{zoneInfo.districtCount}</p>
              <Button variant="link" className="p-0 h-auto" asChild>
                <Link href={`/admin/envios/zonas/${zoneId}/distritos`}>
                  Gestionar distritos →
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Grupos de Tarifas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{zoneInfo.groupCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tarifas Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{zoneInfo.rateCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información de la Zona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre de la Zona <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Lima Metropolitana"
                required
              />
              <p className="text-xs text-muted-foreground">
                Ej: Lima Metropolitana, Callao, Arequipa Centro
              </p>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Zona que cubre los distritos principales de Lima..."
                rows={3}
              />
            </div>

            <Separator />

            {/* Estado Activo */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Estado de la Zona</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.active
                    ? "La zona está activa y visible en checkout"
                    : "La zona está inactiva y no se mostrará en checkout"}
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

            {/* Acciones */}
            <div className="flex gap-3 pt-4">
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
                onClick={() => router.push(`/admin/envios/zonas/${zoneId}/grupos`)}
                disabled={saving}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  getShippingRateGroupById,
  updateShippingRateGroup,
  deleteShippingRateGroup,
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

export default function EditGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    order: 0,
    active: true,
  });

  const [groupInfo, setGroupInfo] = useState<{
    zoneName: string;
    zoneId: string;
    rateCount: number;
  } | null>(null);

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    setLoading(true);
    const result = await getShippingRateGroupById(groupId);

    if (!result.success || !result.data) {
      setError(result.error || "Grupo no encontrado");
      setLoading(false);
      return;
    }

    const group = result.data;
    setFormData({
      name: group.name,
      description: group.description || "",
      order: group.order,
      active: group.active,
    });

    setGroupInfo({
      zoneName: group.zone.name,
      zoneId: group.zone.id,
      rateCount: group.rates.length,
    });

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await updateShippingRateGroup(groupId, {
      name: formData.name,
      description: formData.description || null,
      order: formData.order,
      active: formData.active,
    });

    if (result.success) {
      setSuccess("Grupo actualizado correctamente");
      setTimeout(() => {
        router.push(`/admin/envios/zonas/${groupInfo?.zoneId}/grupos`);
      }, 1500);
    } else {
      setError(result.error || "Error al actualizar grupo");
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    const result = await deleteShippingRateGroup(groupId);

    if (result.success) {
      router.push(`/admin/envios/zonas/${groupInfo?.zoneId}`);
    } else {
      setError(result.error || "Error al eliminar grupo");
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
            <Link href={`/admin/envios/zonas/${groupInfo?.zoneId}/grupos`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Grupo de Tarifas</h1>
            <p className="text-muted-foreground">
              Zona: {groupInfo?.zoneName || "Cargando..."}
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Grupo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente el grupo y todas sus
                tarifas asociadas:
                <ul className="list-disc list-inside mt-2">
                  <li>{groupInfo?.rateCount || 0} tarifas de envío</li>
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
                {deleting ? "Eliminando..." : "Eliminar Grupo"}
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

      {/* Información */}
      {groupInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tarifas en este Grupo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{groupInfo.rateCount}</p>
          </CardContent>
        </Card>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del Grupo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre del Grupo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Envíos Standard"
                required
              />
              <p className="text-xs text-muted-foreground">
                Ej: Envíos Standard, Envíos Express, Envíos Económicos
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
                placeholder="Opciones de envío estándar..."
                rows={3}
              />
            </div>

            {/* Orden */}
            <div className="space-y-2">
              <Label htmlFor="order">
                Orden de Visualización <span className="text-destructive">*</span>
              </Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                }
                min={0}
                required
              />
              <p className="text-xs text-muted-foreground">
                Números menores aparecen primero (0, 1, 2...)
              </p>
            </div>

            <Separator />

            {/* Estado Activo */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Estado del Grupo</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.active
                    ? "El grupo está activo y visible en checkout"
                    : "El grupo está inactivo y no se mostrará en checkout"}
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
                onClick={() => router.push(`/admin/envios/zonas/${groupInfo?.zoneId}/grupos`)}
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
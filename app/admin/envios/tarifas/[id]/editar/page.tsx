"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  getShippingRateById,
  updateShippingRate,
  deleteShippingRate,
} from "@/actions/shipping-edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function EditRatePage() {
  const router = useRouter();
  const params = useParams();
  const rateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    baseCost: "",
    minOrderAmount: "",
    maxOrderAmount: "",
    freeShippingMin: "",
    estimatedDays: "",
    carrier: "",
    shippingType: "",
    timeWindow: "",
    order: 0,
    active: true,
  });

  const [rateInfo, setRateInfo] = useState<{
    groupName: string;
    zoneName: string;
    zoneId: string;
    groupId: string;
  } | null>(null);

  useEffect(() => {
    loadRate();
  }, [rateId]);

  const loadRate = async () => {
    setLoading(true);
    const result = await getShippingRateById(rateId);

    if (!result.success || !result.data) {
      setError(result.error || "Tarifa no encontrada");
      setLoading(false);
      return;
    }

    const rate = result.data;
    setFormData({
      name: rate.name,
      description: rate.description || "",
      baseCost: rate.baseCost.toString(),
      minOrderAmount: rate.minOrderAmount?.toString() || "",
      maxOrderAmount: rate.maxOrderAmount?.toString() || "",
      freeShippingMin: rate.freeShippingMin?.toString() || "",
      estimatedDays: rate.estimatedDays || "",
      carrier: rate.carrier || "",
      shippingType: rate.shippingType || "",
      timeWindow: rate.timeWindow || "",
      order: rate.order,
      active: rate.active,
    });

    setRateInfo({
      groupName: rate.group.name,
      zoneName: rate.group.zone.name,
      zoneId: rate.group.zone.id,
      groupId: rate.group.id,
    });

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await updateShippingRate(rateId, {
      name: formData.name,
      description: formData.description || null,
      baseCost: parseFloat(formData.baseCost),
      minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : null,
      maxOrderAmount: formData.maxOrderAmount ? parseFloat(formData.maxOrderAmount) : null,
      freeShippingMin: formData.freeShippingMin ? parseFloat(formData.freeShippingMin) : null,
      estimatedDays: formData.estimatedDays || null,
      carrier: formData.carrier || null,
      shippingType: formData.shippingType || null,
      timeWindow: formData.timeWindow || null,
      order: formData.order,
      active: formData.active,
    });

    if (result.success) {
      setSuccess("Tarifa actualizada correctamente");
      setTimeout(() => {
        router.push(`/admin/envios/zonas/${rateInfo?.zoneId}/grupos`);
      }, 1500);
    } else {
      setError(result.error || "Error al actualizar tarifa");
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    const result = await deleteShippingRate(rateId);

    if (result.success) {
      router.push(`/admin/envios/zonas/${rateInfo?.zoneId}`);
    } else {
      setError(result.error || "Error al eliminar tarifa");
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
            <Link href={`/admin/envios/zonas/${rateInfo?.zoneId}/grupos`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Tarifa de Envío</h1>
            <p className="text-muted-foreground">
              {rateInfo?.zoneName} • {rateInfo?.groupName}
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Tarifa
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente esta tarifa de envío.
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
                {deleting ? "Eliminando..." : "Eliminar Tarifa"}
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

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre de la Tarifa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Standard Diurno"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Entrega en horario laboral..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Costos y Rangos */}
        <Card>
          <CardHeader>
            <CardTitle>Costos y Rangos</CardTitle>
            <CardDescription>
              Define el costo base y los rangos de pedido aplicables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="baseCost">
                  Costo Base (S/.) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="baseCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.baseCost}
                  onChange={(e) =>
                    setFormData({ ...formData, baseCost: e.target.value })
                  }
                  placeholder="15.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="freeShippingMin">
                  Envío Gratis desde (S/.)
                </Label>
                <Input
                  id="freeShippingMin"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.freeShippingMin}
                  onChange={(e) =>
                    setFormData({ ...formData, freeShippingMin: e.target.value })
                  }
                  placeholder="699.00"
                />
                <p className="text-xs text-muted-foreground">
                  Pedidos mayores a este monto tienen envío gratis
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minOrderAmount">
                  Pedido Mínimo (S/.)
                </Label>
                <Input
                  id="minOrderAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minOrderAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, minOrderAmount: e.target.value })
                  }
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Monto mínimo para aplicar esta tarifa
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxOrderAmount">
                  Pedido Máximo (S/.)
                </Label>
                <Input
                  id="maxOrderAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxOrderAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, maxOrderAmount: e.target.value })
                  }
                  placeholder="999999.00"
                />
                <p className="text-xs text-muted-foreground">
                  Monto máximo para aplicar esta tarifa
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalles del Envío */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Envío</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="estimatedDays">Tiempo Estimado</Label>
                <Input
                  id="estimatedDays"
                  value={formData.estimatedDays}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedDays: e.target.value })
                  }
                  placeholder="1-2 días"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeWindow">Ventana Horaria</Label>
                <Input
                  id="timeWindow"
                  value={formData.timeWindow}
                  onChange={(e) =>
                    setFormData({ ...formData, timeWindow: e.target.value })
                  }
                  placeholder="11am-4pm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="carrier">Courier</Label>
                <Input
                  id="carrier"
                  value={formData.carrier}
                  onChange={(e) =>
                    setFormData({ ...formData, carrier: e.target.value })
                  }
                  placeholder="Olva Courier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingType">Tipo de Envío</Label>
                <Input
                  id="shippingType"
                  value={formData.shippingType}
                  onChange={(e) =>
                    setFormData({ ...formData, shippingType: e.target.value })
                  }
                  placeholder="Terrestre"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Estado de la Tarifa</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.active
                    ? "La tarifa está activa y visible en checkout"
                    : "La tarifa está inactiva y no se mostrará en checkout"}
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
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex gap-3">
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
            onClick={() => router.push(`/admin/envios/zonas/${rateInfo?.zoneId}/grupos`)}
            disabled={saving}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
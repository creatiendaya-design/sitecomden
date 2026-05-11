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

export default function EditRatePage() {
  const router = useRouter();
  const params = useParams();
  const rateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
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
    excludeFromRegularCheckout: false,
  });

  const [rateInfo, setRateInfo] = useState<{
    zoneName: string;
    zoneId: string;
  } | null>(null);

  useEffect(() => {
    loadRate();
  }, [rateId]);

  const loadRate = async () => {
    setLoading(true);
    const result = await getShippingRateById(rateId);

    if (!result.success || !result.data) {
      toast.error(result.error || "Tarifa no encontrada");
      setLoading(false);
      return;
    }

    const rate = result.data;
    setFormData({
      name: rate.name,
      description: rate.description || "",
      category: rate.category || "",
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
      excludeFromRegularCheckout: rate.excludeFromRegularCheckout ?? false,
    });

    setRateInfo({
      zoneName: rate.zone.name,
      zoneId: rate.zone.id,
    });

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const result = await updateShippingRate(rateId, {
      name: formData.name,
      description: formData.description || null,
      category: formData.category.trim() || null,
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
      excludeFromRegularCheckout: formData.excludeFromRegularCheckout,
    });

    if (result.success) {
      toast.success("Tarifa actualizada correctamente");
      router.push(`/admin/envios/zonas/${rateInfo?.zoneId}`);
    } else {
      toast.error(result.error || "Error al actualizar tarifa");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);

    const result = await deleteShippingRate(rateId);

    if (result.success) {
      toast.success("Tarifa eliminada");
      router.push(`/admin/envios/zonas/${rateInfo?.zoneId}`);
    } else {
      toast.error(result.error || "Error al eliminar tarifa");
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
        <Link
          href={`/admin/envios/zonas/${rateInfo?.zoneId}`}
          className="hover:text-foreground transition-colors truncate"
        >
          {rateInfo?.zoneName || "Zona"}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
        <span className="text-foreground font-medium shrink-0">
          Editar tarifa
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" asChild className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
            <Link href={`/admin/envios/zonas/${rateInfo?.zoneId}`} aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl font-bold">Editar tarifa</h1>
            <p className="text-xs sm:text-base text-muted-foreground truncate">
              Zona: {rateInfo?.zoneName}
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting} size="sm" className="shrink-0">
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Eliminar Tarifa</span>
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

      {/* Información Básica */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="name" className="text-sm">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Standard Diurno"
              required
              className="h-9"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="description" className="text-sm">Descripción (opcional)</Label>
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

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="category" className="text-sm">Categoría visual (opcional)</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="Ej: Express, Recojo en tienda"
              className="h-9"
            />
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Las tarifas con la misma categoría se agrupan en checkout. Vacío = lista plana.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Costos y Rangos */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Costos y Rangos</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Costo base y rangos de pedido aplicables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-2">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="baseCost" className="text-sm">
                Costo (S/.) <span className="text-destructive">*</span>
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
                className="h-9"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="freeShippingMin" className="text-sm">
                Gratis desde (S/.)
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
                className="h-9"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-2">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="minOrderAmount" className="text-sm">
                Pedido Mín. (S/.)
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
                className="h-9"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="maxOrderAmount" className="text-sm">
                Pedido Máx. (S/.)
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
                placeholder="Sin límite"
                className="h-9"
                inputMode="decimal"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalles del Envío */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Detalles del Envío</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="estimatedDays" className="text-sm">Tiempo Estimado</Label>
              <Input
                id="estimatedDays"
                value={formData.estimatedDays}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedDays: e.target.value })
                }
                placeholder="1-2 días"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="timeWindow" className="text-sm">Ventana Horaria</Label>
              <Input
                id="timeWindow"
                value={formData.timeWindow}
                onChange={(e) =>
                  setFormData({ ...formData, timeWindow: e.target.value })
                }
                placeholder="11am-4pm"
                className="h-9"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="carrier" className="text-sm">Courier</Label>
              <Input
                id="carrier"
                value={formData.carrier}
                onChange={(e) =>
                  setFormData({ ...formData, carrier: e.target.value })
                }
                placeholder="Olva Courier"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="shippingType" className="text-sm">Tipo de Envío</Label>
              <Input
                id="shippingType"
                value={formData.shippingType}
                onChange={(e) =>
                  setFormData({ ...formData, shippingType: e.target.value })
                }
                placeholder="Terrestre"
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="order" className="text-sm">
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
              className="h-9"
              inputMode="numeric"
            />
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Números menores aparecen primero (0, 1, 2...)
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0 flex-1">
              <Label htmlFor="active" className="text-sm">Estado de la Tarifa</Label>
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

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0 flex-1 pr-2">
              <Label htmlFor="excludeFromRegularCheckout" className="text-sm">
                Solo para formularios COD
              </Label>
              <p className="text-[11px] sm:text-sm text-muted-foreground">
                {formData.excludeFromRegularCheckout
                  ? "NO aparecerá en checkout regular. Solo en modal COD asignado."
                  : "Disponible en checkout regular y plantillas COD."}
              </p>
            </div>
            <Switch
              id="excludeFromRegularCheckout"
              checked={formData.excludeFromRegularCheckout}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, excludeFromRegularCheckout: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Acciones desktop */}
      <div className="hidden sm:flex gap-3">
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
          onClick={() => router.push(`/admin/envios/zonas/${rateInfo?.zoneId}`)}
          disabled={saving}
        >
          Cancelar
        </Button>
      </div>

      {/* Sticky bottom action bar mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur p-3 sm:hidden">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/admin/envios/zonas/${rateInfo?.zoneId}`)}
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

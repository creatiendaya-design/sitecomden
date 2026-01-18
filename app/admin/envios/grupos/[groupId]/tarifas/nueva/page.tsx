"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation"; // ← Agregar useParams
import { createShippingRate } from "@/actions/shipping-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function NewShippingRatePage() {
  const params = useParams<{ groupId: string }>(); // ← Usar useParams hook
  const groupId = params.groupId; // ← Obtener groupId
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!formData.name.trim()) {
        setError("El nombre es obligatorio");
        setLoading(false);
        return;
      }

      if (!formData.baseCost || Number(formData.baseCost) < 0) {
        setError("El costo base debe ser mayor o igual a 0");
        setLoading(false);
        return;
      }

      const result = await createShippingRate({
        groupId: groupId, // ← Usar groupId en lugar de params.groupId
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        baseCost: Number(formData.baseCost),
        minOrderAmount: formData.minOrderAmount
          ? Number(formData.minOrderAmount)
          : undefined,
        maxOrderAmount: formData.maxOrderAmount
          ? Number(formData.maxOrderAmount)
          : undefined,
        freeShippingMin: formData.freeShippingMin
          ? Number(formData.freeShippingMin)
          : undefined,
        estimatedDays: formData.estimatedDays.trim() || undefined,
        carrier: formData.carrier.trim() || undefined,
        shippingType: formData.shippingType.trim() || undefined,
        timeWindow: formData.timeWindow.trim() || undefined,
        order: formData.order,
        active: formData.active,
      });

      if (!result.success) {
        setError(result.error || "Error al crear tarifa");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/admin/envios/grupos/${groupId}/tarifas`);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al crear tarifa");
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "order" ? parseInt(value) || 0 : value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/envios/grupos/${groupId}/tarifas`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nueva Tarifa de Envío</h1>
          <p className="text-muted-foreground">
            Configura una tarifa de envío específica
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Tarifa creada exitosamente. Redirigiendo...
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
            <CardDescription>Datos principales de la tarifa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nombre */}
            <div>
              <Label htmlFor="name">
                Nombre de la Tarifa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej: Standard Diurno, Express, Cruz del Sur"
                required
              />
            </div>

            {/* Descripción */}
            <div>
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Ej: Entrega entre 11am y 4pm"
                rows={2}
              />
            </div>

            {/* Costo Base */}
            <div>
              <Label htmlFor="baseCost">
                Costo Base (S/.) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="baseCost"
                name="baseCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.baseCost}
                onChange={handleInputChange}
                placeholder="15.00"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Costo de envío con esta tarifa
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Condiciones de Aplicación */}
        <Card>
          <CardHeader>
            <CardTitle>Condiciones de Aplicación</CardTitle>
            <CardDescription>
              Define cuándo aplica esta tarifa según el monto del pedido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Monto Mínimo */}
              <div>
                <Label htmlFor="minOrderAmount">
                  Monto mínimo pedido (S/.)
                </Label>
                <Input
                  id="minOrderAmount"
                  name="minOrderAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minOrderAmount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dejar vacío para sin mínimo
                </p>
              </div>

              {/* Monto Máximo */}
              <div>
                <Label htmlFor="maxOrderAmount">
                  Monto máximo pedido (S/.)
                </Label>
                <Input
                  id="maxOrderAmount"
                  name="maxOrderAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxOrderAmount}
                  onChange={handleInputChange}
                  placeholder="699.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dejar vacío para sin máximo
                </p>
              </div>
            </div>

            {/* Envío Gratis Desde */}
            <div>
              <Label htmlFor="freeShippingMin">
                Envío gratis desde (S/.)
              </Label>
              <Input
                id="freeShippingMin"
                name="freeShippingMin"
                type="number"
                step="0.01"
                min="0"
                value={formData.freeShippingMin}
                onChange={handleInputChange}
                placeholder="699.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                El envío será gratis si el pedido supera este monto
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Ejemplo:</strong> Mínimo S/. 0, Máximo S/. 699, Gratis
                desde S/. 699 → Cobra entre S/. 0-699, gratis desde S/. 699
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Información Adicional */}
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
            <CardDescription>
              Detalles que verá el cliente al elegir esta tarifa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Tiempo Estimado */}
              <div>
                <Label htmlFor="estimatedDays">Tiempo estimado</Label>
                <Input
                  id="estimatedDays"
                  name="estimatedDays"
                  value={formData.estimatedDays}
                  onChange={handleInputChange}
                  placeholder="1-2 días, 3-5 días, 24 horas"
                />
              </div>

              {/* Courier/Empresa */}
              <div>
                <Label htmlFor="carrier">Courier/Empresa</Label>
                <Input
                  id="carrier"
                  name="carrier"
                  value={formData.carrier}
                  onChange={handleInputChange}
                  placeholder="Cruz del Sur, Shalom, Olva"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Tipo de Envío */}
              <div>
                <Label htmlFor="shippingType">Tipo de envío</Label>
                <Input
                  id="shippingType"
                  name="shippingType"
                  value={formData.shippingType}
                  onChange={handleInputChange}
                  placeholder="standard, express, overnight"
                />
              </div>

              {/* Ventana Horaria */}
              <div>
                <Label htmlFor="timeWindow">Ventana horaria</Label>
                <Input
                  id="timeWindow"
                  name="timeWindow"
                  value={formData.timeWindow}
                  onChange={handleInputChange}
                  placeholder="11am-4pm, 7pm-10pm"
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
            {/* Orden */}
            <div>
              <Label htmlFor="order">Orden de visualización</Label>
              <Input
                id="order"
                name="order"
                type="number"
                min="0"
                value={formData.order}
                onChange={handleInputChange}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Las tarifas se mostrarán en orden ascendente
              </p>
            </div>

            {/* Estado Activo */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, active: checked === true }))
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="active" className="cursor-pointer">
                  Tarifa activa
                </Label>
                <p className="text-sm text-muted-foreground">
                  Las tarifas inactivas no se mostrarán en el checkout
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading || success}>
                {loading ? "Creando..." : "Crear Tarifa"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading || success}
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
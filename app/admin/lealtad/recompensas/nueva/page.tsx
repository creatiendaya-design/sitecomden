"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Save, Gift, Tag, Truck, Percent } from "lucide-react";
import { createReward } from "@/actions/loyalty";
import { toast } from "sonner";

type RewardType = "DISCOUNT" | "PERCENTAGE" | "FREE_SHIPPING" | "PRODUCT";

export default function NuevaRecompensaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    pointsCost: "",
    rewardType: "DISCOUNT" as RewardType,
    rewardValue: "",
    minPurchase: "",
    maxUses: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.pointsCost || !formData.rewardValue) {
      toast.error("Completa los campos requeridos");
      return;
    }

    setSaving(true);
    try {
      const result = await createReward({
        name: formData.name,
        description: formData.description || undefined,
        image: formData.image || undefined,
        pointsCost: parseInt(formData.pointsCost),
        rewardType: formData.rewardType,
        rewardValue: parseFloat(formData.rewardValue),
        minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : undefined,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
      });

      if (result.success) {
        toast.success("Recompensa creada exitosamente");
        router.push("/admin/lealtad/recompensas");
      } else {
        toast.error(result.error || "Error al crear recompensa");
      }
    } catch (error) {
      console.error("Error creando recompensa:", error);
      toast.error("Error al crear recompensa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Nueva Recompensa</h1>
          <p className="text-muted-foreground">
            Crea una nueva recompensa que los clientes puedan canjear con sus puntos
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/lealtad/recompensas">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Cancelar
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
            <CardDescription>
              Nombre y descripción de la recompensa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ej: S/. 10 de descuento"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe los detalles de la recompensa..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Esta descripción se mostrará a los clientes
              </p>
            </div>

            <div>
              <Label htmlFor="image">URL de Imagen (opcional)</Label>
              <Input
                id="image"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si no agregas una imagen, se mostrará un ícono por defecto
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tipo y Valor de Recompensa */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo y Valor</CardTitle>
            <CardDescription>
              Define qué tipo de recompensa es y cuánto vale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rewardType">
                Tipo de Recompensa <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.rewardType}
                onValueChange={(value: RewardType) => 
                  setFormData({ ...formData, rewardType: value, rewardValue: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISCOUNT">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      💵 Descuento Fijo (S/.)
                    </div>
                  </SelectItem>
                  <SelectItem value="PERCENTAGE">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      📊 Descuento Porcentaje (%)
                    </div>
                  </SelectItem>
                  <SelectItem value="FREE_SHIPPING">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      🚚 Envío Gratis
                    </div>
                  </SelectItem>
                  <SelectItem value="PRODUCT">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      🎁 Producto Gratis
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rewardValue">
                Valor <span className="text-red-500">*</span>
                {formData.rewardType === "PERCENTAGE" && " (Porcentaje)"}
                {formData.rewardType === "DISCOUNT" && " (Soles)"}
              </Label>
              <Input
                id="rewardValue"
                type="number"
                step="0.01"
                placeholder={getValuePlaceholder(formData.rewardType)}
                value={formData.rewardValue}
                onChange={(e) => setFormData({ ...formData, rewardValue: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {getValueHelpText(formData.rewardType)}
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">Vista Previa:</p>
              <p className="text-sm text-blue-800 mt-1">
                {getPreviewText(formData)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Costo y Restricciones */}
        <Card>
          <CardHeader>
            <CardTitle>Costo y Restricciones</CardTitle>
            <CardDescription>
              Define cuánto cuesta canjear esta recompensa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pointsCost">
                Costo en Puntos <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pointsCost"
                type="number"
                placeholder="100"
                value={formData.pointsCost}
                onChange={(e) => setFormData({ ...formData, pointsCost: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Puntos que el cliente necesita para canjear esta recompensa
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minPurchase">Compra Mínima (S/.)</Label>
                <Input
                  id="minPurchase"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.minPurchase}
                  onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Opcional - Monto mínimo de compra requerido
                </p>
              </div>

              <div>
                <Label htmlFor="maxUses">Usos Máximos</Label>
                <Input
                  id="maxUses"
                  type="number"
                  placeholder="Ilimitado"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Opcional - Límite de canjes totales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Resumen de la Recompensa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Nombre:</span>
              <span className="font-semibold">
                {formData.name || "Sin nombre"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tipo:</span>
              <span className="font-semibold">{getTypeName(formData.rewardType)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-semibold">
                {formData.rewardValue 
                  ? getValueDisplay(formData.rewardType, formData.rewardValue)
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Costo:</span>
              <span className="font-semibold text-primary text-lg">
                {formData.pointsCost || "0"} puntos
              </span>
            </div>
            {formData.minPurchase && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Compra mínima:</span>
                <span className="font-semibold">S/. {formData.minPurchase}</span>
              </div>
            )}
            {formData.maxUses && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Usos máximos:</span>
                <span className="font-semibold">{formData.maxUses}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild disabled={saving}>
            <Link href="/admin/lealtad/recompensas">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Crear Recompensa"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Utilidades
function getValuePlaceholder(type: RewardType): string {
  switch (type) {
    case "DISCOUNT":
      return "Ej: 10 (S/. 10 de descuento)";
    case "PERCENTAGE":
      return "Ej: 10 (10% de descuento)";
    case "FREE_SHIPPING":
      return "0 (envío gratis)";
    case "PRODUCT":
      return "ID del producto";
    default:
      return "";
  }
}

function getValueHelpText(type: RewardType): string {
  switch (type) {
    case "DISCOUNT":
      return "Cantidad en soles a descontar del total";
    case "PERCENTAGE":
      return "Porcentaje de descuento (sin el símbolo %)";
    case "FREE_SHIPPING":
      return "Deja en 0 para envío gratis";
    case "PRODUCT":
      return "ID del producto que será gratis";
    default:
      return "";
  }
}

function getPreviewText(formData: any): string {
  if (!formData.rewardValue) return "Configura el valor para ver la vista previa";

  const value = parseFloat(formData.rewardValue);
  
  switch (formData.rewardType) {
    case "DISCOUNT":
      return `El cliente recibirá S/. ${value.toFixed(2)} de descuento en su compra`;
    case "PERCENTAGE":
      return `El cliente recibirá ${value}% de descuento en su compra`;
    case "FREE_SHIPPING":
      return "El cliente recibirá envío gratis en su próximo pedido";
    case "PRODUCT":
      return "El cliente recibirá un producto gratis";
    default:
      return "";
  }
}

function getTypeName(type: RewardType): string {
  const names: Record<RewardType, string> = {
    DISCOUNT: "Descuento Fijo",
    PERCENTAGE: "Descuento Porcentaje",
    FREE_SHIPPING: "Envío Gratis",
    PRODUCT: "Producto Gratis",
  };
  return names[type];
}

function getValueDisplay(type: RewardType, value: string): string {
  const num = parseFloat(value);
  
  switch (type) {
    case "DISCOUNT":
      return `S/. ${num.toFixed(2)}`;
    case "PERCENTAGE":
      return `${num}%`;
    case "FREE_SHIPPING":
      return "Envío gratis";
    case "PRODUCT":
      return `Producto #${value}`;
    default:
      return value;
  }
}
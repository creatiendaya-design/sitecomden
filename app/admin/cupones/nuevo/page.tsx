"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function NewCouponPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    type: "PERCENTAGE",
    value: "",
    minPurchase: "",
    maxDiscount: "",
    usageLimit: "",
    usageLimitPerUser: "",
    startsAt: "",
    expiresAt: "",
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/coupons/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value) || 0,
          minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : null,
          maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
          usageLimitPerUser: formData.usageLimitPerUser
            ? parseInt(formData.usageLimitPerUser)
            : null,
          startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
          expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al crear cupón");
        return;
      }

      router.push("/admin/cupones");
      router.refresh();
    } catch (err) {
      setError("Error al crear cupón");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/cupones">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Cupón</h1>
          <p className="text-muted-foreground">Crea un nuevo cupón de descuento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Cupón</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div>
                  <Label htmlFor="code">Código del Cupón *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="VERANO2024"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    El cliente ingresará este código en el checkout
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    placeholder="Ej: Descuento de verano para todos los productos"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="type">Tipo de Descuento *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Porcentaje (%)</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Monto Fijo (S/)</SelectItem>
                        <SelectItem value="FREE_SHIPPING">Envío Gratis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.type !== "FREE_SHIPPING" && (
                    <div>
                      <Label htmlFor="value">
                        Valor *{" "}
                        {formData.type === "PERCENTAGE" ? "(1-100)" : "(Soles)"}
                      </Label>
                      <Input
                        id="value"
                        type="number"
                        step="0.01"
                        min="0"
                        max={formData.type === "PERCENTAGE" ? "100" : undefined}
                        value={formData.value}
                        onChange={(e) =>
                          setFormData({ ...formData, value: e.target.value })
                        }
                        required
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Restricciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="minPurchase">Compra Mínima (S/)</Label>
                    <Input
                      id="minPurchase"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minPurchase}
                      onChange={(e) =>
                        setFormData({ ...formData, minPurchase: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>

                  {formData.type === "PERCENTAGE" && (
                    <div>
                      <Label htmlFor="maxDiscount">Descuento Máximo (S/)</Label>
                      <Input
                        id="maxDiscount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.maxDiscount}
                        onChange={(e) =>
                          setFormData({ ...formData, maxDiscount: e.target.value })
                        }
                        placeholder="Sin límite"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="usageLimit">Límite Total de Usos</Label>
                    <Input
                      id="usageLimit"
                      type="number"
                      min="1"
                      value={formData.usageLimit}
                      onChange={(e) =>
                        setFormData({ ...formData, usageLimit: e.target.value })
                      }
                      placeholder="Ilimitado"
                    />
                  </div>

                  <div>
                    <Label htmlFor="usageLimitPerUser">Usos por Usuario</Label>
                    <Input
                      id="usageLimitPerUser"
                      type="number"
                      min="1"
                      value={formData.usageLimitPerUser}
                      onChange={(e) =>
                        setFormData({ ...formData, usageLimitPerUser: e.target.value })
                      }
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="startsAt">Fecha de Inicio</Label>
                    <Input
                      id="startsAt"
                      type="datetime-local"
                      value={formData.startsAt}
                      onChange={(e) =>
                        setFormData({ ...formData, startsAt: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiresAt">Fecha de Expiración</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) =>
                        setFormData({ ...formData, expiresAt: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Cupón Activo</Label>
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

            <Card>
              <CardContent className="space-y-2 p-6">
                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Creando..." : "Crear Cupón"}
                </Button>
                <Button type="button" variant="outline" className="w-full" asChild>
                  <Link href="/admin/cupones">Cancelar</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
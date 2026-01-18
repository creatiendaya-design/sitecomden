"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation"; // ← Agregar useParams
import { createRateGroup } from "@/actions/shipping-system";
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

export default function NewRateGroupPage() {
  const params = useParams<{ id: string }>(); // ← Usar useParams hook
  const id = params.id; // ← Obtener id
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
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

      const result = await createRateGroup({
        zoneId: id, // ← Usar id en lugar de params.id
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        order: formData.order,
        active: formData.active,
      });

      if (!result.success) {
        setError(result.error || "Error al crear grupo");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/admin/envios/zonas/${id}/grupos`);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("Error inesperado al crear grupo");
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
          <Link href={`/admin/envios/zonas/${id}/grupos`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Grupo de Tarifas</h1>
          <p className="text-muted-foreground">
            Crea un grupo para organizar tus tarifas
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
            Grupo creado exitosamente. Redirigiendo...
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del Grupo</CardTitle>
            <CardDescription>
              Los grupos te permiten organizar tarifas relacionadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nombre */}
            <div>
              <Label htmlFor="name">
                Nombre del Grupo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej: Envíos Standard, Envíos por Courier"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nombre descriptivo del grupo de tarifas
              </p>
            </div>

            {/* Descripción */}
            <div>
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Ej: Opciones de envío estándar con delivery propio"
                rows={3}
              />
            </div>

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
                Los grupos se mostrarán en orden ascendente (0, 1, 2...)
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
                  Grupo activo
                </Label>
                <p className="text-sm text-muted-foreground">
                  Los grupos inactivos no se mostrarán en el checkout
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading || success}>
                {loading ? "Creando..." : "Crear Grupo"}
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

            {/* Info */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Próximo paso:</strong> Después de crear el grupo,
                podrás agregar tarifas individuales (Standard Diurno, Express,
                etc.)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
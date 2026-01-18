"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createShippingZone } from "@/actions/shipping-edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CreateZonePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validación
    if (!formData.name.trim()) {
      setError("El nombre es obligatorio");
      setSaving(false);
      return;
    }

    const result = await createShippingZone({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      active: formData.active,
    });

    if (result.success && result.data) {
      // Redirigir a la página de grupos de la zona recién creada
      router.push(`/admin/envios/zonas/${result.data.id}/grupos`);
    } else {
      setError(result.error || "Error al crear zona");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/envios/zonas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Crear Zona de Envío
          </h1>
          <p className="text-muted-foreground">
            Define una nueva zona geográfica para tus envíos
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info Card */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">¿Qué es una Zona de Envío?</CardTitle>
          <CardDescription>
            Las zonas te permiten agrupar distritos con tarifas de envío similares
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Ejemplo 1:</strong> Zona "Lima Metropolitana" con distritos como
            Miraflores, San Isidro, Barranco.
          </p>
          <p>
            <strong>Ejemplo 2:</strong> Zona "Callao" con La Perla, Bellavista,
            Carmen de la Legua.
          </p>
          <p className="text-muted-foreground pt-2">
            💡 Después de crear la zona, podrás agregar distritos y configurar
            tarifas de envío.
          </p>
        </CardContent>
      </Card>

      {/* Formulario */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información de la Zona</CardTitle>
            <CardDescription>
              Completa los datos básicos de la nueva zona
            </CardDescription>
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
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Ejemplos: Lima Metropolitana, Callao, Arequipa Centro, Lima Norte
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
                placeholder="Zona que cubre los distritos principales de Lima con envío rápido..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Describe qué distritos incluirá esta zona o características
                especiales
              </p>
            </div>

            <Separator />

            {/* Estado Activo */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Estado de la Zona</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.active
                    ? "La zona estará activa y visible en checkout desde el inicio"
                    : "La zona estará inactiva y no se mostrará en checkout"}
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
              <Button type="submit" disabled={saving} size="lg">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando Zona...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Crear Zona
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/envios/zonas")}
                disabled={saving}
                size="lg"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Próximos pasos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próximos Pasos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              1
            </div>
            <div className="flex-1">
              <p className="font-medium">Crear la zona</p>
              <p className="text-sm text-muted-foreground">
                Completa el formulario y haz clic en "Crear Zona"
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              2
            </div>
            <div className="flex-1">
              <p className="font-medium">Asignar distritos</p>
              <p className="text-sm text-muted-foreground">
                Agrega los distritos que pertenecen a esta zona
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              3
            </div>
            <div className="flex-1">
              <p className="font-medium">Crear grupos y tarifas</p>
              <p className="text-sm text-muted-foreground">
                Define grupos (Standard, Express) y sus tarifas de envío
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
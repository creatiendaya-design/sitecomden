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
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Loader2, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function CreateZonePage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setSaving(true);

    const result = await createShippingZone({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      active: formData.active,
    });

    if (result.success && result.data) {
      toast.success("Zona creada correctamente");
      router.push(`/admin/envios/zonas/${result.data.id}?tab=distritos`);
    } else {
      toast.error(result.error || "Error al crear zona");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 p-4 sm:p-0 pb-24 sm:pb-0 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
        <Link href="/admin/envios" className="hover:text-foreground transition-colors">
          Envíos
        </Link>
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <Link href="/admin/envios/zonas" className="hover:text-foreground transition-colors">
          Zonas
        </Link>
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="text-foreground font-medium">Nueva</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
          <Link href="/admin/envios/zonas" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 sm:h-8 sm:w-8 text-primary shrink-0" />
            <span className="truncate">Crear zona</span>
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground hidden sm:block">
            Define una nueva zona geográfica para tus envíos
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-lg">¿Qué es una Zona de Envío?</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Las zonas agrupan distritos con tarifas similares
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs sm:text-sm px-4 pb-4 sm:px-6 sm:pb-6">
          <p>
            <strong>Ej. 1:</strong> &ldquo;Lima Metropolitana&rdquo; con Miraflores, San Isidro, Barranco.
          </p>
          <p>
            <strong>Ej. 2:</strong> &ldquo;Callao&rdquo; con La Perla, Bellavista, Carmen de la Legua.
          </p>
          <p className="text-muted-foreground pt-1.5">
            💡 Después podrás agregar distritos y configurar tarifas.
          </p>
        </CardContent>
      </Card>

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
              autoFocus
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
            <Button type="submit" disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
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

      {/* Próximos pasos */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-lg">Próximos Pasos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 sm:space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
          <Step n={1} title="Crear la zona" desc="Completa el formulario y haz clic en Crear" />
          <Step n={2} title="Asignar distritos" desc="Agrega los distritos que pertenecen a esta zona" />
          <Step n={3} title="Crear tarifas" desc="Define costos de envío (Standard, Express)" />
        </CardContent>
      </Card>

      {/* Sticky bottom action bar mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur p-3 sm:hidden">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/envios/zonas")}
            disabled={saving}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Crear
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-2.5 sm:gap-3">
      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm sm:text-base">{title}</p>
        <p className="text-[11px] sm:text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

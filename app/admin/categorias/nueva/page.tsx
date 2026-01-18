"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Save, Info } from "lucide-react";
import Link from "next/link";
import ImageUpload from "@/components/admin/ImageUpload";
import ManualProductSelector from "@/components/admin/ManualProductSelector";
import SmartConditionsBuilder from "@/components/admin/SmartConditionsBuilder";

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export default function NewCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    image: string | { url: string; alt?: string; name?: string } | "";
    metaTitle: string;
    metaDescription: string;
    collectionType: string;
    active: boolean;
    order: number;
  }>({
    name: "",
    slug: "",
    description: "",
    image: "",
    metaTitle: "",
    metaDescription: "",
    collectionType: "MANUAL",
    active: true,
    order: 0,
  });

  // Estado para productos manuales
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Estado para condiciones inteligentes
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [conditionRelation, setConditionRelation] = useState<"AND" | "OR">("AND");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/categories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          selectedProductIds:
            formData.collectionType === "MANUAL" ? selectedProductIds : [],
          conditions: formData.collectionType === "SMART" ? conditions : [],
          conditionRelation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al crear categoría");
        return;
      }

      router.push("/admin/categorias");
      router.refresh();
    } catch (err) {
      setError("Error al crear categoría");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/categorias">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nueva Categoría</h1>
          <p className="text-muted-foreground">Crea una nueva categoría o colección</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Información Básica */}
            <Card>
              <CardHeader>
                <CardTitle>Información de la Categoría</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tipo de Colección */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Colección</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={formData.collectionType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, collectionType: value })
                  }
                >
                  <div className="flex items-start space-x-3 rounded-lg border p-4">
                    <RadioGroupItem value="MANUAL" id="manual" />
                    <div className="space-y-1">
                      <Label htmlFor="manual" className="font-semibold cursor-pointer">
                        Manual
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Agrega productos a esta colección uno por uno. Tendrás control total sobre qué productos se muestran.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 rounded-lg border p-4">
                    <RadioGroupItem value="SMART" id="smart" />
                    <div className="space-y-1">
                      <Label htmlFor="smart" className="font-semibold cursor-pointer">
                        Inteligente
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Los productos existentes y futuros que cumplan las condiciones que definas se añadirán automáticamente a esta colección.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Selector Manual de Productos */}
            {formData.collectionType === "MANUAL" && (
              <Card>
                <CardHeader>
                  <CardTitle>Productos</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Busca y selecciona los productos que deseas agregar a esta colección
                  </p>
                </CardHeader>
                <CardContent>
                  <ManualProductSelector
                    selectedProductIds={selectedProductIds}
                    onSelectionChange={setSelectedProductIds}
                  />
                </CardContent>
              </Card>
            )}

            {/* Constructor de Condiciones Inteligentes */}
            {formData.collectionType === "SMART" && (
              <Card>
                <CardHeader>
                  <CardTitle>Condiciones</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Define las reglas para que los productos se agreguen automáticamente
                  </p>
                </CardHeader>
                <CardContent>
                  <SmartConditionsBuilder
                    conditions={conditions}
                    onConditionsChange={setConditions}
                    conditionRelation={conditionRelation}
                    onRelationChange={setConditionRelation}
                  />
                </CardContent>
              </Card>
            )}

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle>SEO (Optimización para Motores de Búsqueda)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="metaTitle">Meta Título</Label>
                  <Input
                    id="metaTitle"
                    name="metaTitle"
                    value={formData.metaTitle}
                    onChange={handleInputChange}
                    placeholder={formData.name || "Título para motores de búsqueda"}
                    maxLength={60}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formData.metaTitle.length}/60 caracteres. Si está vacío, se usará el nombre de la categoría.
                  </p>
                </div>

                <div>
                  <Label htmlFor="metaDescription">Meta Descripción</Label>
                  <Textarea
                    id="metaDescription"
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleInputChange}
                    placeholder={formData.description || "Descripción para motores de búsqueda"}
                    rows={3}
                    maxLength={160}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formData.metaDescription.length}/160 caracteres. Si está vacío, se usará la descripción.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Imagen */}
            <Card>
              <CardHeader>
                <CardTitle>Imagen</CardTitle>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  images={formData.image ? (
                    typeof formData.image === "string" 
                      ? [{ url: formData.image, alt: "", name: "" }]
                      : [formData.image]
                  ) : []}
                  onChange={(images) => {
                    const img = images[0];
                    setFormData({ 
                      ...formData, 
                      image: img || ""
                    });
                  }}
                  maxImages={1}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Activa</Label>
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="order">Orden de visualización</Label>
                  <Input
                    id="order"
                    name="order"
                    type="number"
                    value={formData.order}
                    onChange={handleInputChange}
                    className="mt-2"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Menor número aparece primero
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-6">
                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Guardando..." : "Crear Categoría"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link href="/admin/categorias">Cancelar</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
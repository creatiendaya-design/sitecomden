"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Plus, X, Trash2 } from "lucide-react";
import Link from "next/link";
import BulkEditModal from "@/components/admin/BulkEditModal";
import VariantsTable from "@/components/admin/VariantsTable";
import ImageUpload from "@/components/admin/ImageUpload";
import RichTextEditor from "./RichTextEditor";

interface ProductOption {
  name: string;
  values: string[];
}

interface Variant {
  options: Record<string, string>;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  image?: string;
}

interface NewProductFormProps {
  categories: Array<{ id: string; name: string }>;
}

export default function NewProductForm({ categories }: NewProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    basePrice: "",
    compareAtPrice: "",
    sku: "",
    stock: "",
    categoryId: "",
    images: [] as string[],
    active: true,
    featured: false,
    hasVariants: false,
    metaTitle: "",
    metaDescription: "",
  });

  // Gestión de variantes
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [newOptionName, setNewOptionName] = useState("");
  // ✅ FIX: Estado independiente por cada opción
  const [newOptionValues, setNewOptionValues] = useState<Record<number, string>>({});
  const [variants, setVariants] = useState<Variant[]>([]);

  // Selección y edición masiva
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);

  const toggleSelectAll = () => {
    if (selectedVariants.length === variants.length) {
      setSelectedVariants([]);
    } else {
      setSelectedVariants(variants.map((_, i) => i));
    }
  };

  const toggleSelectVariant = (index: number) => {
    if (selectedVariants.includes(index)) {
      setSelectedVariants(selectedVariants.filter((i) => i !== index));
    } else {
      setSelectedVariants([...selectedVariants, index]);
    }
  };

  const handleBulkUpdate = (updates: Array<{ index: number; data: Partial<Variant> }>) => {
    const newVariants = [...variants];
    updates.forEach(({ index, data }) => {
      newVariants[index] = { ...newVariants[index], ...data };
    });
    setVariants(newVariants);
    setSelectedVariants([]);
  };

  const addOption = () => {
    if (!newOptionName.trim()) return;
    setOptions([...options, { name: newOptionName, values: [] }]);
    setNewOptionName("");
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
    generateVariants(options.filter((_, i) => i !== index));
  };

  const addValueToOption = (optionIndex: number, value: string) => {
    if (!value.trim()) return;
    const newOptions = [...options];
    newOptions[optionIndex].values.push(value);
    setOptions(newOptions);
    generateVariants(newOptions);
    
    // ✅ FIX: Limpiar solo el input de esta opción
    setNewOptionValues(prev => ({ ...prev, [optionIndex]: "" }));
  };

  const removeValueFromOption = (optionIndex: number, valueIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].values = newOptions[optionIndex].values.filter(
      (_, i) => i !== valueIndex
    );
    setOptions(newOptions);
    generateVariants(newOptions);
  };

  const generateVariants = (opts: ProductOption[]) => {
    if (opts.length === 0 || opts.some((o) => o.values.length === 0)) {
      setVariants([]);
      return;
    }

    const combinations: Record<string, string>[] = [{}];

    opts.forEach((option) => {
      const newCombinations: Record<string, string>[] = [];
      combinations.forEach((combo) => {
        option.values.forEach((value) => {
          newCombinations.push({ ...combo, [option.name]: value });
        });
      });
      combinations.length = 0;
      combinations.push(...newCombinations);
    });

    const newVariants: Variant[] = combinations.map((combo) => {
      const existing = variants.find(
        (v) => JSON.stringify(v.options) === JSON.stringify(combo)
      );
      return (
        existing || {
          options: combo,
          price: formData.basePrice || "",
          compareAtPrice: "",
          stock: "0",
          sku: "",
        }
      );
    });

    setVariants(newVariants);
  };

  const updateVariant = (
    index: number,
    field: Exclude<keyof Variant, 'id' | 'options'>,
    value: string
  ) => {
    const newVariants = [...variants];
    newVariants[index][field] = value as any;
    setVariants(newVariants);
  };

  const updateVariantImage = (index: number, imageUrl: string) => {
    const newVariants = [...variants];
    newVariants[index].image = imageUrl;
    setVariants(newVariants);
  };

  const removeVariantImage = (index: number) => {
    const newVariants = [...variants];
    newVariants[index].image = undefined;
    setVariants(newVariants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const productData = {
        ...formData,
        basePrice: parseFloat(formData.basePrice) || 0,
        compareAtPrice: formData.compareAtPrice
          ? parseFloat(formData.compareAtPrice)
          : null,
        stock: formData.hasVariants ? 0 : parseInt(formData.stock),
        hasVariants: formData.hasVariants,
        options: formData.hasVariants ? options : [],
        variants: formData.hasVariants
          ? variants.map((v) => ({
              ...v,
              price: parseFloat(v.price) || 0,
              compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
              stock: parseInt(v.stock) || 0,
            }))
          : [],
      };

      const response = await fetch("/api/admin/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al crear producto");
        return;
      }

      router.push("/admin/productos");
      router.refresh();
    } catch (err) {
      setError("Error al crear producto");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/productos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Producto</h1>
          <p className="text-muted-foreground">Agrega un nuevo producto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
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
                  <Label htmlFor="categoryId">Categoría</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No hay categorías disponibles
                        </div>
                      ) : (
                        categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="shortDescription">Descripción Corta</Label>
                  <Textarea
                    id="shortDescription"
                    name="shortDescription"
                    value={formData.shortDescription}
                    onChange={handleInputChange}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Aparece en listados y tarjetas de producto (máx. 160 caracteres)
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Descripción Completa</Label>
                  <RichTextEditor
                    content={formData.description}
                    onChange={(content) =>
                      setFormData((prev) => ({ ...prev, description: content }))
                    }
                    placeholder="Describe tu producto en detalle. Usa el editor para dar formato al texto..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Usa el editor para agregar formato, imágenes, listas y más
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Imágenes del Producto</CardTitle>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  images={formData.images}
                  onChange={(images) => {
                    // Si images es un array de objetos con url, extraer las URLs
                    const imageUrls = Array.isArray(images)
                      ? images.map((img: any) => (typeof img === 'string' ? img : img.url || img))
                      : [];
                    setFormData({ ...formData, images: imageUrls });
                  }}
                  maxImages={5}
                />
              </CardContent>
            </Card>

            {/* Pricing - Solo si NO tiene variantes */}
            {!formData.hasVariants && (
              <Card>
                <CardHeader>
                  <CardTitle>Precio e Inventario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="basePrice">Precio *</Label>
                      <Input
                        id="basePrice"
                        name="basePrice"
                        type="number"
                        step="0.01"
                        value={formData.basePrice}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="compareAtPrice">Precio Anterior</Label>
                      <Input
                        id="compareAtPrice"
                        name="compareAtPrice"
                        type="number"
                        step="0.01"
                        value={formData.compareAtPrice}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock">Stock *</Label>
                      <Input
                        id="stock"
                        name="stock"
                        type="number"
                        value={formData.stock}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Variants */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Variantes</CardTitle>
                  <Switch
                    checked={formData.hasVariants}
                    onCheckedChange={(checked) => {
                      handleSwitchChange("hasVariants", checked);
                      if (!checked) {
                        setOptions([]);
                        setVariants([]);
                        setSelectedVariants([]);
                      }
                    }}
                  />
                </div>
              </CardHeader>
              {formData.hasVariants && (
                <CardContent className="space-y-6">
                  {/* Add Option */}
                  <div>
                    <Label>Nueva Opción (Color, Talla, etc.)</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="Nombre"
                        value={newOptionName}
                        onChange={(e) => setNewOptionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addOption();
                          }
                        }}
                      />
                      <Button type="button" onClick={addOption}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Options */}
                  {options.map((option, optionIndex) => (
                    <Card key={optionIndex} className="border-dashed">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{option.name}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(optionIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Input
                            placeholder="Valor"
                            value={newOptionValues[optionIndex] || ""}
                            onChange={(e) => setNewOptionValues(prev => ({ 
                              ...prev, 
                              [optionIndex]: e.target.value 
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addValueToOption(optionIndex, newOptionValues[optionIndex] || "");
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              addValueToOption(optionIndex, newOptionValues[optionIndex] || "");
                            }}
                            disabled={!(newOptionValues[optionIndex] || "").trim()}
                          >
                            +
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {option.values.map((value, valueIndex) => (
                            <div
                              key={valueIndex}
                              className="flex items-center gap-1 rounded-md border px-3 py-1"
                            >
                              <span className="text-sm">{value}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeValueFromOption(optionIndex, valueIndex)
                                }
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* ✅ NUEVA TABLA DE VARIANTES */}
                  {variants.length > 0 && (
                    <div>
                      <VariantsTable
                        variants={variants}
                        selectedVariants={selectedVariants}
                        onToggleSelect={toggleSelectVariant}
                        onToggleSelectAll={toggleSelectAll}
                        onUpdateVariant={updateVariant}
                        onUpdateVariantImage={updateVariantImage}
                        onRemoveVariantImage={removeVariantImage}
                        onOpenBulkEdit={() => setShowBulkEdit(true)}
                      />
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* ✅ SEO */}
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
                    {formData.metaTitle.length}/60 caracteres
                  </p>
                </div>

                <div>
                  <Label htmlFor="metaDescription">Meta Descripción</Label>
                  <Textarea
                    id="metaDescription"
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleInputChange}
                    placeholder={formData.shortDescription || "Descripción para motores de búsqueda"}
                    rows={3}
                    maxLength={160}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formData.metaDescription.length}/160 caracteres
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Activo</Label>
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) =>
                      handleSwitchChange("active", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Destacado</Label>
                  <Switch
                    checked={formData.featured}
                    onCheckedChange={(checked) =>
                      handleSwitchChange("featured", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-6">
                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Guardando..." : "Crear"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link href="/admin/productos">Cancelar</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Bulk Edit Modal */}
      <BulkEditModal
        open={showBulkEdit}
        onOpenChange={setShowBulkEdit}
        selectedVariants={selectedVariants}
        variants={variants}
        onUpdate={handleBulkUpdate}
      />
    </div>
  );
}
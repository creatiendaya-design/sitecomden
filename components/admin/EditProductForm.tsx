"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Plus, X, Trash2 } from "lucide-react";
import Link from "next/link";
import ImageUpload from "@/components/admin/ImageUpload";
import BulkEditModal from "@/components/admin/BulkEditModal";
import RichTextEditor from "@/components/admin/RichTextEditor";

interface ProductOption {
  name: string;
  values: string[];
}

interface Variant {
  id?: string;
  options: Record<string, string>;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  image?: string;
}

interface EditProductFormProps {
  product: any;
  categories: Array<{
    id: string;
    name: string;
  }>;
}

export default function EditProductForm({ product, categories }: EditProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Estado para categoría seleccionada
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    product.categories?.[0]?.category?.id || ""
  );

  const [formData, setFormData] = useState({
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    shortDescription: product.shortDescription || "",
    basePrice: product.basePrice.toString(),
    compareAtPrice: product.compareAtPrice?.toString() || "",
    sku: product.sku || "",
    stock: product.stock.toString(),
    images: product.images || [],
    active: product.active,
    featured: product.featured,
    hasVariants: product.hasVariants,
    metaTitle: product.metaTitle || "",
    metaDescription: product.metaDescription || "",
  });

  // Gestión de variantes
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);

  // Cargar opciones y variantes existentes
  useEffect(() => {
    if (product.hasVariants) {
      // Cargar opciones
      const loadedOptions: ProductOption[] = product.options.map((opt: any) => ({
        name: opt.name,
        values: opt.values.map((v: any) => v.value),
      }));
      setOptions(loadedOptions);

      // Cargar variantes
      const loadedVariants: Variant[] = product.variants.map((v: any) => ({
        id: v.id,
        options: v.options as Record<string, string>,
        price: v.price.toString(),
        compareAtPrice: v.compareAtPrice?.toString() || "",
        stock: v.stock.toString(),
        sku: v.sku || "",
        image: v.image || undefined,
      }));
      setVariants(loadedVariants);
    }
  }, [product]);

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
    field: "price" | "compareAtPrice" | "stock" | "sku",
    value: string
  ) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
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
        categoryId: selectedCategoryId || null,
        options: formData.hasVariants ? options : [],
        variants: formData.hasVariants
          ? variants.map((v) => ({
              id: v.id,
              ...v,
              price: parseFloat(v.price) || 0,
              compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : null,
              stock: parseInt(v.stock) || 0,
            }))
          : [],
      };

      const response = await fetch(`/api/admin/products/${product.id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al actualizar producto");
        return;
      }

      router.push("/admin/productos");
      router.refresh();
    } catch (err) {
      setError("Error al actualizar producto");
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
          <h1 className="text-3xl font-bold">Editar Producto</h1>
          <p className="text-muted-foreground">{product.name}</p>
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
                  <Label htmlFor="shortDescription">Descripción Corta</Label>
                  <Textarea
                    id="shortDescription"
                    name="shortDescription"
                    value={formData.shortDescription}
                    onChange={handleInputChange}
                    rows={2}
                  />
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

            {/* ✅ CATEGORÍA */}
            <Card>
              <CardHeader>
                <CardTitle>Categoría</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="categoryId">Categoría del producto</Label>
                  <select
                    id="categoryId"
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Selecciona la categoría principal de este producto
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
                  onChange={(images) => setFormData({ ...formData, images })}
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

            {/* Variants Toggle */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Variantes</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Activa si tu producto tiene opciones como Color, Talla, etc.
                    </p>
                  </div>
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
            </Card>

            {/* Options Management */}
            {formData.hasVariants && (
              <Card>
                <CardHeader>
                  <CardTitle>Opciones del Producto</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Define las opciones (Color, Talla, etc.) para generar variantes
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add New Option */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre de opción (ej: Color)"
                      value={newOptionName}
                      onChange={(e) => setNewOptionName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOption();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={addOption}
                      disabled={!newOptionName.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Existing Options */}
                  <div className="space-y-4">
                    {options.map((option, optionIndex) => (
                      <div key={optionIndex} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-semibold">{option.name}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(optionIndex)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        {/* Add Value to Option */}
                        <div className="mb-2 flex gap-2">
                          <Input
                            placeholder={`Agregar valor (ej: ${
                              option.name === "Color"
                                ? "Rojo"
                                : option.name === "Talla"
                                ? "M"
                                : "Valor"
                            })`}
                            value={newOptionValue}
                            onChange={(e) => setNewOptionValue(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addValueToOption(optionIndex, newOptionValue);
                                setNewOptionValue("");
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              addValueToOption(optionIndex, newOptionValue);
                              setNewOptionValue("");
                            }}
                            disabled={!newOptionValue.trim()}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Option Values */}
                        <div className="flex flex-wrap gap-2">
                          {option.values.map((value, valueIndex) => (
                            <div
                              key={valueIndex}
                              className="flex items-center gap-1 rounded-md bg-muted px-3 py-1 text-sm"
                            >
                              <span>{value}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeValueFromOption(optionIndex, valueIndex)
                                }
                                className="ml-1 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {options.length > 0 && (
                    <div className="rounded-lg bg-muted p-3 text-sm">
                      <p className="font-semibold">
                        Se generarán{" "}
                        {options.reduce(
                          (acc, opt) => acc * (opt.values.length || 1),
                          1
                        )}{" "}
                        variantes
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cada combinación de opciones creará una variante
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Variants */}
            {formData.hasVariants && variants.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Variantes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedVariants.length === variants.length}
                          onCheckedChange={toggleSelectAll}
                        />
                        <h4 className="font-semibold">
                          {selectedVariants.length > 0
                            ? `Seleccionados: ${selectedVariants.length}`
                            : `Variantes (${variants.length})`}
                        </h4>
                      </div>
                      {selectedVariants.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkEdit(true)}
                        >
                          Edición masiva
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {variants.map((variant, index) => (
                        <div
                          key={index}
                          className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[auto_1fr_repeat(4,minmax(0,1fr))]"
                        >
                          <div className="flex items-center">
                            <Checkbox
                              checked={selectedVariants.includes(index)}
                              onCheckedChange={() => toggleSelectVariant(index)}
                            />
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm font-medium">
                              {Object.entries(variant.options)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" / ")}
                            </span>
                          </div>
                          <Input
                            placeholder="SKU"
                            value={variant.sku}
                            onChange={(e) =>
                              updateVariant(index, "sku", e.target.value)
                            }
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Precio"
                            value={variant.price}
                            onChange={(e) =>
                              updateVariant(index, "price", e.target.value)
                            }
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Precio Anterior"
                            value={variant.compareAtPrice}
                            onChange={(e) =>
                              updateVariant(index, "compareAtPrice", e.target.value)
                            }
                          />
                          <Input
                            type="number"
                            placeholder="Stock"
                            value={variant.stock}
                            onChange={(e) =>
                              updateVariant(index, "stock", e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ✅ SEO - MOVIDO AL FINAL */}
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
                    placeholder={formData.name}
                    maxLength={60}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formData.metaTitle.length}/60 caracteres. Si está vacío, se usará el nombre del producto.
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
                    {formData.metaDescription.length}/160 caracteres. Si está vacío, se usará la descripción corta.
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
                  {loading ? "Guardando..." : "Guardar Cambios"}
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
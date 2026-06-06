"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import ImageUpload from "@/components/admin/ImageUpload";
import type { LandingBlock } from "@/lib/types/landing-blocks";
import { ProductThemeTemplateSelector } from "@/components/admin/products/ProductThemeTemplateSelector";
import { CustomizationCard } from "@/components/admin/products/CustomizationCard";
import { SizeGuideCard } from "@/components/admin/products/SizeGuideCard";
import type { MockupOverrides } from "@/lib/customizer/types";
import CodFormTemplateCard from "@/components/admin/products/CodFormTemplateCard";
import ShippingRestrictionCard from "@/components/admin/products/ShippingRestrictionCard";
import ProductPromotionsCard from "@/components/admin/products/ProductPromotionsCard";
import ProductRelationsCard from "@/components/admin/products/ProductRelationsCard";
import type { ShippingRestriction } from "@/lib/cod-forms/types";
import type { CheckoutMode } from "@prisma/client";
import type { ProductScopedPromotion } from "@/lib/promotions/types";
import BulkEditModal from "@/components/admin/BulkEditModal";
import VariantsTable from "@/components/admin/VariantsTable";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/admin/RichTextEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
    ),
  }
);
import ProductOptionsEditor from "@/components/admin/ProductOptionsEditor";
// Tipos
interface ProductOptionValue {
  id: string;
  value: string;
  position: number;
  swatchType: 'NONE' | 'COLOR' | 'IMAGE';
  colorHex?: string;
  swatchImage?: string;
}

interface ProductOption {
  id: string;
  name: string;
  displayStyle: 'DROPDOWN' | 'BUTTONS' | 'SWATCHES';
  position: number;
  values: ProductOptionValue[];
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

interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  sku: string | null;
  stock: number;
  images: string[];
  active: boolean;
  featured: boolean;
  hasVariants: boolean;
  template: string | null;
  checkoutMode: string | null;
  codFormTemplateId: string | null;
  shippingRestriction: ShippingRestriction | null;
  metaTitle: string | null;
  metaDescription: string | null;
  weight: number | null;
  customizableTemplateId: string | null;
  customizableMockupOverrides: MockupOverrides | null;
  sizeGuideId: string | null;
  landingTemplateId?: string | null;
  /** Plan 19 — assigned product template (null = theme default). */
  themeProductTemplateId?: string | null;
  categories: Array<{ category: { id: string } }>;
  options: ProductOption[];
  variants: Array<{
    id: string;
    options: Record<string, string>;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    sku: string | null;
    image: string | null;
  }>;
  landingBlocks?: LandingBlock[];
}

interface EditProductFormProps {
  product: ProductData;
  categories: Array<{
    id: string;
    name: string;
  }>;
  /** @deprecated Plan 19 — legacy LandingTemplate props kept for prop
   *  compatibility with the page; no longer rendered. */
  showLegacyLandingEditor?: boolean;
  resolvedBlockTypes?: string[];
  initialPromotions?: ProductScopedPromotion[];
}

export default function EditProductForm({ product, categories, initialPromotions = [] }: EditProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    product.categories?.[0]?.category?.id || ""
  );

  const [customizableTemplateId, setCustomizableTemplateId] = useState<string | null>(
    product.customizableTemplateId ?? null
  );
  const [customizableMockupOverrides, setCustomizableMockupOverrides] = useState<MockupOverrides | null>(
    (product.customizableMockupOverrides as MockupOverrides | null) ?? null
  );
  const [sizeGuideId, setSizeGuideId] = useState<string | null>(
    product.sizeGuideId ?? null
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
    template: product.template || "STANDARD",
    checkoutMode: product.checkoutMode || "STANDARD",
    codFormTemplateId: product.codFormTemplateId ?? null,
    shippingRestriction: product.shippingRestriction ?? null,
    // Recortar datos legacy (p. ej. importados de CSV) que excedan los límites
    // del schema, para que el form refleje lo que realmente se guardará y no
    // falle la validación al reenviar un valor heredado demasiado largo.
    metaTitle: (product.metaTitle || "").slice(0, 60),
    metaDescription: (product.metaDescription || "").slice(0, 160),
    weight: product.weight?.toString() || "",
  });

  const [options, setOptions] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  
  // 🆕 Guardar snapshot de opciones para detectar cambios reales
  const [previousOptionsSnapshot, setPreviousOptionsSnapshot] = useState<string>("");

  // Selección y edición masiva
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);

  // Cargar opciones y variantes existentes
  useEffect(() => {
    if (product.hasVariants) {
      const loadedOptions: ProductOption[] = product.options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        displayStyle: opt.displayStyle || "DROPDOWN",
        position: opt.position,
        values: opt.values.map((v) => ({
          id: v.id,
          value: v.value,
          position: v.position,
          swatchType: v.swatchType || "NONE",
          colorHex: v.colorHex || undefined,
          swatchImage: v.swatchImage || undefined,
        })),
      }));
      setOptions(loadedOptions);

      // 🆕 Guardar snapshot inicial
      setPreviousOptionsSnapshot(createOptionsSnapshot(loadedOptions));

      const loadedVariants: Variant[] = product.variants.map((v) => ({
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

  // 🔑 SOLUCIÓN: Crear clave normalizada de opciones (orden consistente)
  const getVariantKey = (options: Record<string, string>) => {
    return JSON.stringify(
      Object.keys(options)
        .sort()
        .reduce((acc, key) => {
          acc[key] = options[key];
          return acc;
        }, {} as Record<string, string>)
    );
  };

  // 🆕 Crear snapshot solo de estructura (nombres y valores)
  // Ignora swatchType, colorHex, swatchImage, displayStyle
  const createOptionsSnapshot = (opts: ProductOption[]) => {
    return JSON.stringify(
      opts.map(opt => ({
        name: opt.name,
        values: opt.values.map(v => v.value).sort()
      })).sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  // 🆕 Generar variantes SOLO si cambió la estructura
  const generateVariants = (opts: ProductOption[]) => {
    if (opts.length === 0 || opts.some((o) => o.values.length === 0)) {
      return;
    }

    // 🆕 Crear snapshot de nueva estructura
    const newSnapshot = createOptionsSnapshot(opts);
    
    // 🆕 Si NO cambió la estructura, NO regenerar variantes
    if (newSnapshot === previousOptionsSnapshot) {
      console.log("✅ Solo cambiaron swatches, NO regenerar variantes");
      return; // ← NO hacer nada, preservar variantes
    }

    console.log("⚠️ Estructura de opciones cambió, regenerando variantes...");
    
    // Guardar nuevo snapshot
    setPreviousOptionsSnapshot(newSnapshot);

    const combinations: Record<string, string>[] = [{}];

    opts.forEach((option) => {
      const newCombinations: Record<string, string>[] = [];
      combinations.forEach((combo) => {
        option.values.forEach((valueObj) => {
          newCombinations.push({ ...combo, [option.name]: valueObj.value });
        });
      });
      combinations.length = 0;
      combinations.push(...newCombinations);
    });

    // 🔑 SOLUCIÓN: CREAR MAPA DE VARIANTES EXISTENTES usando clave normalizada
    const existingVariantsMap = new Map(
      variants.map((v) => [getVariantKey(v.options), v])
    );

    console.log(`📦 Variantes existentes en mapa: ${existingVariantsMap.size}`);

    // 🆕 Preservar datos de variantes existentes
    const newVariants: Variant[] = combinations.map((combo) => {
      const variantKey = getVariantKey(combo);
      const existing = existingVariantsMap.get(variantKey);
      
      if (existing) {
        // ✅ PRESERVAR todos los datos de la variante existente
        console.log(`  ✅ Preservando datos de variante: ${JSON.stringify(combo)} (precio: ${existing.price}, stock: ${existing.stock})`);
        return existing;
      } else {
        // Crear nueva variante con valores por defecto
        console.log(`  🆕 Creando nueva variante: ${JSON.stringify(combo)}`);
        return {
          options: combo,
          price: formData.basePrice || "",
          compareAtPrice: "",
          stock: "0",
          sku: "",
        };
      }
    });

    console.log(`✅ Total variantes después de regenerar: ${newVariants.length}`);
    console.log(`   - Preservadas: ${newVariants.filter(v => existingVariantsMap.has(getVariantKey(v.options))).length}`);
    console.log(`   - Nuevas: ${newVariants.filter(v => !existingVariantsMap.has(getVariantKey(v.options))).length}`);

    setVariants(newVariants);
  };

  // 🆕 Handler cuando cambian las opciones
  const handleOptionsChange = (newOptions: ProductOption[]) => {
    setOptions(newOptions);
    generateVariants(newOptions);
  };

  const updateVariant = (
    index: number,
    field: Exclude<keyof Variant, 'id' | 'options'>,
    value: string
  ) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
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
        weight: formData.weight ? parseFloat(formData.weight) : null,
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
        customizableTemplateId,
        customizableMockupOverrides,
        sizeGuideId,
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
    } catch {
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0 pb-24 sm:pb-0">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/admin/productos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-bold leading-tight">Editar Producto</h1>
          <p className="text-xs sm:text-base text-muted-foreground truncate">{product.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
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

            {/* Categoría */}
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
                  onChange={(images) =>
                    setFormData({ ...formData, images: images.map((img) => (typeof img === "string" ? img : img.url)) })
                  }
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

                  <div>
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.weight}
                      onChange={handleInputChange}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Usado para calcular tarifas de envío por peso
                    </p>
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
                        setPreviousOptionsSnapshot("");
                      }
                    }}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* OPCIONES CON SWATCHES */}
            {formData.hasVariants && (
              <ProductOptionsEditor
                options={options}
                onChange={handleOptionsChange}
              />
            )}

            {/* TABLA DE VARIANTES */}
            {formData.hasVariants && variants.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Variantes del Producto</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configura precio, stock e imágenes para cada variante
                  </p>
                </CardHeader>
                <CardContent>
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
                    placeholder={formData.name}
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
                    placeholder={formData.shortDescription}
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
          <div className="space-y-4 sm:space-y-6">
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
  <CardHeader>
    <CardTitle>Presentación</CardTitle>
    <p className="text-sm text-muted-foreground">
      Elige la plantilla de producto que define cómo se muestra este producto en la tienda
    </p>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Plan 19 — per-product theme template (Shopify OS 2.0). Replaces the
        legacy LandingTemplate selector, which no longer drives the
        storefront once the theme has PRODUCT sections. */}
    <ProductThemeTemplateSelector
      productId={product.id}
      currentTemplateId={product.themeProductTemplateId ?? null}
    />

    <div className="rounded-lg border p-3 bg-muted/30">
      <p className="text-xs text-muted-foreground">
        La plantilla define las secciones (galería, precio, descripción,
        secciones extra…) que se muestran en la ficha. Edítalas en el
        personalizador del tema. Sin plantilla propia, este producto usa la
        plantilla predeterminada del tema.
      </p>
    </div>
  </CardContent>
</Card>

<CustomizationCard
  productSlug={product.slug}
  templateId={customizableTemplateId}
  overrides={customizableMockupOverrides}
  options={(product.options as ProductOption[]).map((o) => ({
    id: o.id,
    name: o.name,
    values: o.values.map((v) => ({
      id: v.id,
      value: v.value,
      swatch: v.colorHex ?? null,
    })),
  }))}
  onTemplateChange={setCustomizableTemplateId}
  onOverridesChange={setCustomizableMockupOverrides}
/>

<SizeGuideCard value={sizeGuideId} onChange={setSizeGuideId} />

<CodFormTemplateCard
  checkoutMode={formData.checkoutMode as CheckoutMode}
  templateId={formData.codFormTemplateId}
  onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
/>
<ShippingRestrictionCard
  value={formData.shippingRestriction}
  onChange={(v) => setFormData({ ...formData, shippingRestriction: v })}
/>

<ProductPromotionsCard
  productId={product.id}
  productName={product.name}
  initialPromotions={initialPromotions}
/>

<ProductRelationsCard productId={product.id} />

            <Card className="hidden sm:block">
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

        {/* Sticky bottom save bar — mobile only */}
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur px-3 py-2.5 flex gap-2 shadow-lg">
          <Button
            type="button"
            variant="outline"
            asChild
            className="flex-1 h-10"
          >
            <Link href="/admin/productos">Cancelar</Link>
          </Button>
          <Button type="submit" className="flex-1 h-10" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Guardando…" : "Guardar"}
          </Button>
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
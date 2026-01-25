"use client";

import { useState } from "react";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Edit2 } from "lucide-react";

interface Variant {
  id?: string; // ✅ Opcional: existe solo en variantes ya guardadas
  options: Record<string, string>;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  image?: string;
}

interface VariantsTableProps {
  variants: Variant[];
  selectedVariants: number[];
  onToggleSelect: (index: number) => void;
  onToggleSelectAll: () => void;
  // ✅ FIX: Excluir 'id' y 'options' de los campos actualizables
  onUpdateVariant: (index: number, field: Exclude<keyof Variant, 'id' | 'options'>, value: string) => void;
  onUpdateVariantImage: (index: number, imageUrl: string) => void;
  onRemoveVariantImage: (index: number) => void;
  onOpenBulkEdit: () => void;
}

export default function VariantsTable({
  variants,
  selectedVariants,
  onToggleSelect,
  onToggleSelectAll,
  onUpdateVariant,
  onUpdateVariantImage,
  onRemoveVariantImage,
  onOpenBulkEdit,
}: VariantsTableProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const handleImageUpload = async (index: number, file: File) => {
    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Error al subir imagen");

      const data = await response.json();
      onUpdateVariantImage(index, data.url);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error al subir imagen");
    } finally {
      setUploadingIndex(null);
    }
  };

  const allSelected = selectedVariants.length === variants.length;
  const someSelected = selectedVariants.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
            aria-label="Seleccionar todas las variantes"
          />
          <h3 className="text-lg font-semibold">
            {someSelected
              ? `${selectedVariants.length} seleccionada${selectedVariants.length !== 1 ? "s" : ""}`
              : `${variants.length} variante${variants.length !== 1 ? "s" : ""}`}
          </h3>
        </div>
        {someSelected && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenBulkEdit}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Editar seleccionadas
          </Button>
        )}
      </div>

      {/* Table - Desktop */}
      <div className="hidden lg:block rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="w-12 p-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onToggleSelectAll}
                    aria-label="Seleccionar todas"
                  />
                </th>
                <th className="p-3 text-left text-sm font-medium">Variante</th>
                <th className="p-3 text-left text-sm font-medium w-32">Precio (S/)</th>
                <th className="p-3 text-left text-sm font-medium w-32">Precio Anterior</th>
                <th className="p-3 text-left text-sm font-medium w-40">SKU</th>
                <th className="p-3 text-left text-sm font-medium w-24">Stock</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, index) => (
                <tr
                  key={index}
                  className={`border-b transition-colors hover:bg-muted/50 ${
                    selectedVariants.includes(index) ? "bg-muted/30" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <td className="p-3">
                    <Checkbox
                      checked={selectedVariants.includes(index)}
                      onCheckedChange={() => onToggleSelect(index)}
                      aria-label={`Seleccionar ${Object.values(variant.options).join(" / ")}`}
                    />
                  </td>

                  {/* Variante con imagen */}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Imagen */}
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                        {variant.image ? (
                          <>
                            <Image
                              src={variant.image}
                              alt={Object.values(variant.options).join(" / ")}
                              fill
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => onRemoveVariantImage(index)}
                              className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
                              title="Eliminar imagen"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <label
                            htmlFor={`variant-image-${index}`}
                            className="flex h-full w-full cursor-pointer items-center justify-center hover:bg-muted/80"
                            title="Subir imagen"
                          >
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <input
                              type="file"
                              id={`variant-image-${index}`}
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingIndex === index}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(index, file);
                              }}
                            />
                          </label>
                        )}
                        {uploadingIndex === index && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          </div>
                        )}
                      </div>

                      {/* Nombre de variante */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {Object.entries(variant.options)
                            .map(([key, value]) => value)
                            .join(" / ")}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {Object.entries(variant.options)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(" • ")}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Precio */}
                  <td className="p-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={variant.price}
                      onChange={(e) => onUpdateVariant(index, "price", e.target.value)}
                      className="h-9"
                      placeholder="0.00"
                    />
                  </td>

                  {/* Precio Anterior */}
                  <td className="p-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={variant.compareAtPrice}
                      onChange={(e) =>
                        onUpdateVariant(index, "compareAtPrice", e.target.value)
                      }
                      className="h-9"
                      placeholder="0.00"
                    />
                  </td>

                  {/* SKU */}
                  <td className="p-3">
                    <Input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => onUpdateVariant(index, "sku", e.target.value)}
                      className="h-9"
                      placeholder="SKU"
                    />
                  </td>

                  {/* Stock */}
                  <td className="p-3">
                    <Input
                      type="number"
                      value={variant.stock}
                      onChange={(e) => onUpdateVariant(index, "stock", e.target.value)}
                      className="h-9"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards - Mobile */}
      <div className="space-y-3 lg:hidden">
        {variants.map((variant, index) => (
          <div
            key={index}
            className={`rounded-lg border p-4 ${
              selectedVariants.includes(index) ? "border-primary bg-muted/30" : ""
            }`}
          >
            <div className="mb-3 flex items-start gap-3">
              <Checkbox
                checked={selectedVariants.includes(index)}
                onCheckedChange={() => onToggleSelect(index)}
                className="mt-1"
              />

              {/* Imagen */}
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {variant.image ? (
                  <>
                    <Image
                      src={variant.image}
                      alt={Object.values(variant.options).join(" / ")}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveVariantImage(index)}
                      className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <label
                    htmlFor={`variant-image-mobile-${index}`}
                    className="flex h-full w-full cursor-pointer items-center justify-center"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <input
                      type="file"
                      id={`variant-image-mobile-${index}`}
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingIndex === index}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(index, file);
                      }}
                    />
                  </label>
                )}
                {uploadingIndex === index && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Nombre */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {Object.values(variant.options).join(" / ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Object.entries(variant.options)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" • ")}
                </p>
              </div>
            </div>

            {/* Campos */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Precio (S/)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={variant.price}
                  onChange={(e) => onUpdateVariant(index, "price", e.target.value)}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Precio Anterior</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={variant.compareAtPrice}
                  onChange={(e) =>
                    onUpdateVariant(index, "compareAtPrice", e.target.value)
                  }
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">SKU</Label>
                <Input
                  type="text"
                  value={variant.sku}
                  onChange={(e) => onUpdateVariant(index, "sku", e.target.value)}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Stock</Label>
                <Input
                  type="number"
                  value={variant.stock}
                  onChange={(e) => onUpdateVariant(index, "stock", e.target.value)}
                  className="mt-1 h-9"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
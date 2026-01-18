"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { X, Upload } from "lucide-react";

interface Variant {
  options: Record<string, string>;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  image?: string;
}

interface BulkEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVariants: number[];
  variants: Variant[];
  onUpdate: (updates: Array<{ index: number; data: Partial<Variant> }>) => void;
}

export default function BulkEditModal({
  open,
  onOpenChange,
  selectedVariants,
  variants,
  onUpdate,
}: BulkEditModalProps) {
  // Estado local de las variantes que se están editando
  const [editedVariants, setEditedVariants] = useState<Array<{ index: number; data: Variant }>>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Cargar variantes seleccionadas cuando se abre el modal
  useEffect(() => {
    if (open) {
      const selected = selectedVariants.map((index) => ({
        index,
        data: { ...variants[index] },
      }));
      setEditedVariants(selected);
    }
  }, [open, selectedVariants, variants]);

  const updateEditedVariant = (
    localIndex: number,
    field: keyof Variant,
    value: string
  ) => {
    const newEdited = [...editedVariants];
    if (field === "options") {
      return;
    }
    (newEdited[localIndex].data[field] as string) = value;
    setEditedVariants(newEdited);
  };

  const handleImageUpload = async (localIndex: number, file: File) => {
    setUploadingIndex(localIndex);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Error al subir imagen");

      const data = await response.json();

      // Actualizar solo esta variante
      const newEdited = [...editedVariants];
      newEdited[localIndex].data.image = data.url;
      setEditedVariants(newEdited);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error al subir imagen");
    } finally {
      setUploadingIndex(null);
    }
  };

  const removeVariantImage = (localIndex: number) => {
    const newEdited = [...editedVariants];
    newEdited[localIndex].data.image = undefined;
    setEditedVariants(newEdited);
  };

  const handleSave = () => {
    const updates = editedVariants.map((item) => ({
      index: item.index,
      data: item.data,
    }));
    onUpdate(updates);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Editando {selectedVariants.length} variante
            {selectedVariants.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {editedVariants.map((item, localIndex) => (
              <div
                key={item.index}
                className="rounded-lg border p-4 space-y-3"
              >
                {/* Header con nombre de variante */}
                <div className="flex items-center gap-4 border-b pb-3">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-slate-100">
                    {item.data.image ? (
                      <Image
                        src={item.data.image}
                        alt="Variante"
                        width={64}
                        height={64}
                        className="object-cover h-full w-full"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      {Object.entries(item.data.options)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" / ")}
                    </h4>
                  </div>
                </div>

                {/* Campos editables */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-xs">Precio (S/)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.data.price}
                      onChange={(e) =>
                        updateEditedVariant(localIndex, "price", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Precio Comparación (S/)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.data.compareAtPrice}
                      onChange={(e) =>
                        updateEditedVariant(
                          localIndex,
                          "compareAtPrice",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">SKU</Label>
                    <Input
                      value={item.data.sku}
                      onChange={(e) =>
                        updateEditedVariant(localIndex, "sku", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Stock</Label>
                    <Input
                      type="number"
                      value={item.data.stock}
                      onChange={(e) =>
                        updateEditedVariant(localIndex, "stock", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Imagen de variante */}
                <div className="col-span-full">
                  <Label className="text-xs">Imagen de variante (opcional)</Label>
                  <div className="mt-2">
                    {item.data.image ? (
                      <div className="relative inline-block">
                        <Image
                          src={item.data.image}
                          alt="Variante"
                          width={100}
                          height={100}
                          className="rounded-lg border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeVariantImage(localIndex)}
                          className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          id={`variant-image-${localIndex}`}
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(localIndex, file);
                          }}
                          className="hidden"
                        />
                        <label htmlFor={`variant-image-${localIndex}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingIndex === localIndex}
                            onClick={() =>
                              document.getElementById(`variant-image-${localIndex}`)?.click()
                            }
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {uploadingIndex === localIndex ? "Subiendo..." : "Subir Imagen"}
                          </Button>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t pt-4">
          <Button onClick={handleSave} className="flex-1">
            Guardar Cambios
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
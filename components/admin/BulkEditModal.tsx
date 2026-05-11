"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { GripVertical, Wand2 } from "lucide-react";

interface Variant {
  id?: string;
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

type DragField = "price" | "compareAtPrice" | "stock" | "sku";
type BulkField = DragField;

const FIELD_LABEL: Record<BulkField, string> = {
  price: "Precio",
  compareAtPrice: "Precio Anterior",
  sku: "SKU",
  stock: "Stock",
};

export default function BulkEditModal({
  open,
  onOpenChange,
  selectedVariants,
  variants,
  onUpdate,
}: BulkEditModalProps) {
  const [editedVariants, setEditedVariants] = useState<
    Array<{ index: number; data: Variant }>
  >([]);
  const [dragState, setDragState] = useState<{
    field: DragField | null;
    startIndex: number | null;
    endIndex: number | null;
    value: string | null;
  }>({
    field: null,
    startIndex: null,
    endIndex: null,
    value: null,
  });

  // Bulk-apply panel (works on touch — replacement for drag-to-fill on mobile)
  const [bulkField, setBulkField] = useState<BulkField>("price");
  const [bulkValue, setBulkValue] = useState("");

  useEffect(() => {
    if (open) {
      const selected = selectedVariants.map((index) => ({
        index,
        data: { ...variants[index] },
      }));
      setEditedVariants(selected);
      setBulkValue("");
    }
  }, [open, selectedVariants, variants]);

  const updateVariant = (
    localIndex: number,
    field: keyof Variant,
    value: string
  ) => {
    if (field === "options" || field === "id") return;
    const newEdited = [...editedVariants];
    (newEdited[localIndex].data[field] as string) = value;
    setEditedVariants(newEdited);
  };

  const applyBulk = () => {
    if (!editedVariants.length) return;
    const newEdited = editedVariants.map((item) => ({
      ...item,
      data: { ...item.data, [bulkField]: bulkValue },
    }));
    setEditedVariants(newEdited);
  };

  const handleDragStart = (
    field: DragField,
    localIndex: number,
    value: string
  ) => {
    setDragState({
      field,
      startIndex: localIndex,
      endIndex: localIndex,
      value,
    });
  };

  const handleDragEnter = (localIndex: number) => {
    if (dragState.startIndex !== null) {
      setDragState((prev) => ({ ...prev, endIndex: localIndex }));
    }
  };

  const handleDragEnd = () => {
    if (
      dragState.field &&
      dragState.startIndex !== null &&
      dragState.endIndex !== null &&
      dragState.value !== null
    ) {
      const start = Math.min(dragState.startIndex, dragState.endIndex);
      const end = Math.max(dragState.startIndex, dragState.endIndex);
      const newEdited = [...editedVariants];
      for (let i = start; i <= end; i++) {
        (newEdited[i].data[dragState.field] as string) = dragState.value;
      }
      setEditedVariants(newEdited);
    }
    setDragState({
      field: null,
      startIndex: null,
      endIndex: null,
      value: null,
    });
  };

  const isCellInDragRange = (localIndex: number): boolean => {
    if (dragState.startIndex === null || dragState.endIndex === null)
      return false;
    const start = Math.min(dragState.startIndex, dragState.endIndex);
    const end = Math.max(dragState.startIndex, dragState.endIndex);
    return localIndex >= start && localIndex <= end;
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
      <DialogContent className="flex flex-col p-0 max-w-[95vw] w-[95vw] sm:max-w-5xl sm:w-full max-h-[92vh] h-[92vh] gap-0">
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b shrink-0">
          <DialogTitle className="text-base sm:text-xl">
            Editar {selectedVariants.length} variante
            {selectedVariants.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            <span className="hidden sm:inline">
              Edita los campos directamente. Arrastra
              <GripVertical className="inline h-3 w-3 mx-1" />
              hacia abajo para rellenar múltiples celdas.
            </span>
            <span className="sm:hidden">
              Usa el panel de abajo para aplicar el mismo valor a todas las
              variantes, o edita cada una individualmente.
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Bulk apply panel - mobile primary tool */}
        <div className="border-b bg-muted/30 px-3 py-3 sm:px-6 sm:py-3 shrink-0">
          <Label className="text-xs font-medium text-muted-foreground">
            Aplicar a todas
          </Label>
          <div className="mt-1.5 flex gap-2">
            <Select
              value={bulkField}
              onValueChange={(v) => setBulkField(v as BulkField)}
            >
              <SelectTrigger className="h-9 w-[120px] sm:w-[160px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Precio</SelectItem>
                <SelectItem value="compareAtPrice">Precio Anterior</SelectItem>
                <SelectItem value="sku">SKU</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type={
                bulkField === "sku"
                  ? "text"
                  : bulkField === "stock"
                  ? "number"
                  : "number"
              }
              step={bulkField === "stock" || bulkField === "sku" ? undefined : "0.01"}
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder={`Nuevo ${FIELD_LABEL[bulkField].toLowerCase()}`}
              className="h-9 flex-1 min-w-0"
            />
            <Button
              type="button"
              size="sm"
              onClick={applyBulk}
              disabled={!bulkValue && bulkField !== "sku"}
              className="h-9 shrink-0"
            >
              <Wand2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Aplicar</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {/* ============ MOBILE: card list ============ */}
          <div className="sm:hidden divide-y">
            {editedVariants.map((item, localIndex) => {
              const title = Object.values(item.data.options).join(" / ");
              return (
                <div key={item.index} className="px-3 py-3">
                  {/* Variant header */}
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.data.image ? (
                        <Image
                          src={item.data.image}
                          alt={title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          —
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-sm truncate min-w-0 flex-1">
                      {title}
                    </p>
                  </div>

                  {/* Inputs 2x2 */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        Precio S/
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.data.price}
                        onChange={(e) =>
                          updateVariant(localIndex, "price", e.target.value)
                        }
                        placeholder="0.00"
                        className="mt-0.5 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        P. Anterior
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.data.compareAtPrice}
                        onChange={(e) =>
                          updateVariant(
                            localIndex,
                            "compareAtPrice",
                            e.target.value
                          )
                        }
                        placeholder="—"
                        className="mt-0.5 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        SKU
                      </Label>
                      <Input
                        type="text"
                        value={item.data.sku}
                        onChange={(e) =>
                          updateVariant(localIndex, "sku", e.target.value)
                        }
                        placeholder="—"
                        className="mt-0.5 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        Stock
                      </Label>
                      <Input
                        type="number"
                        value={item.data.stock}
                        onChange={(e) =>
                          updateVariant(localIndex, "stock", e.target.value)
                        }
                        placeholder="0"
                        className="mt-0.5 h-9"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ============ DESKTOP: table ============ */}
          <div className="hidden sm:block px-6 py-4">
            <div className="rounded-lg border overflow-hidden bg-background">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground w-[260px] sticky top-0 bg-muted/50 z-10">
                      Variante
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/50 z-10">
                      Precio
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/50 z-10">
                      P. Anterior
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/50 z-10">
                      SKU
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground w-[120px] sticky top-0 bg-muted/50 z-10">
                      Stock
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {editedVariants.map((item, localIndex) => (
                    <tr
                      key={item.index}
                      className={`transition-colors ${
                        isCellInDragRange(localIndex)
                          ? "bg-blue-50"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
                            {item.data.image ? (
                              <Image
                                src={item.data.image}
                                alt=""
                                width={40}
                                height={40}
                                className="object-cover h-full w-full"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                —
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium truncate">
                            {Object.values(item.data.options).join(" / ")}
                          </span>
                        </div>
                      </td>

                      <BulkEditCell
                        field="price"
                        type="number"
                        step="0.01"
                        value={item.data.price}
                        onChange={(v) => updateVariant(localIndex, "price", v)}
                        onDragStart={() =>
                          handleDragStart("price", localIndex, item.data.price)
                        }
                        onDragEnter={() => handleDragEnter(localIndex)}
                        onDragEnd={handleDragEnd}
                      />

                      <BulkEditCell
                        field="compareAtPrice"
                        type="number"
                        step="0.01"
                        value={item.data.compareAtPrice}
                        onChange={(v) =>
                          updateVariant(localIndex, "compareAtPrice", v)
                        }
                        placeholder="—"
                        onDragStart={() =>
                          handleDragStart(
                            "compareAtPrice",
                            localIndex,
                            item.data.compareAtPrice
                          )
                        }
                        onDragEnter={() => handleDragEnter(localIndex)}
                        onDragEnd={handleDragEnd}
                      />

                      <BulkEditCell
                        field="sku"
                        type="text"
                        value={item.data.sku}
                        onChange={(v) => updateVariant(localIndex, "sku", v)}
                        placeholder="—"
                        onDragStart={() =>
                          handleDragStart("sku", localIndex, item.data.sku)
                        }
                        onDragEnter={() => handleDragEnter(localIndex)}
                        onDragEnd={handleDragEnd}
                      />

                      <BulkEditCell
                        field="stock"
                        type="number"
                        value={item.data.stock}
                        onChange={(v) => updateVariant(localIndex, "stock", v)}
                        onDragStart={() =>
                          handleDragStart("stock", localIndex, item.data.stock)
                        }
                        onDragEnter={() => handleDragEnter(localIndex)}
                        onDragEnd={handleDragEnd}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t px-3 py-3 sm:px-6 sm:py-4 bg-muted/30 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BulkEditCellProps {
  field: DragField;
  type: "text" | "number";
  step?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

function BulkEditCell({
  type,
  step,
  value,
  placeholder,
  onChange,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: BulkEditCellProps) {
  return (
    <td className="px-3 py-2.5">
      <div className="flex items-center gap-1.5 group">
        <Input
          type={type}
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onDragEnter={onDragEnter}
          className="h-9"
        />
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded flex-shrink-0"
          title="Arrastra para rellenar"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </td>
  );
}

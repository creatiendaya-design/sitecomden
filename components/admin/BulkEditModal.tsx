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
import Image from "next/image";
import { GripVertical } from "lucide-react";

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

type DragField = 'price' | 'compareAtPrice' | 'stock' | 'sku';

export default function BulkEditModal({
  open,
  onOpenChange,
  selectedVariants,
  variants,
  onUpdate,
}: BulkEditModalProps) {
  const [editedVariants, setEditedVariants] = useState<Array<{ index: number; data: Variant }>>([]);
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

  useEffect(() => {
    if (open) {
      const selected = selectedVariants.map((index) => ({
        index,
        data: { ...variants[index] },
      }));
      setEditedVariants(selected);
    }
  }, [open, selectedVariants, variants]);

  const updateVariant = (localIndex: number, field: keyof Variant, value: string) => {
    if (field === "options" || field === "id") return;
    
    const newEdited = [...editedVariants];
    (newEdited[localIndex].data[field] as string) = value;
    setEditedVariants(newEdited);
  };

  const handleDragStart = (field: DragField, localIndex: number, value: string) => {
    setDragState({
      field,
      startIndex: localIndex,
      endIndex: localIndex,
      value,
    });
  };

  const handleDragEnter = (localIndex: number) => {
    if (dragState.startIndex !== null) {
      setDragState(prev => ({
        ...prev,
        endIndex: localIndex,
      }));
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
    if (dragState.startIndex === null || dragState.endIndex === null) return false;
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

  // Estilos inline para forzar visibilidad
  const inputStyle: React.CSSProperties = {
    height: '70px',
    fontSize: '20px',
    padding: '0 20px',
    border: '4px solid #64748b',
    borderRadius: '10px',
    width: '100%',
    outline: 'none',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    fontWeight: '500',
  };

  const inputFocusStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: '#2563eb',
    boxShadow: '0 0 0 5px rgba(37, 99, 235, 0.3)',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="flex flex-col p-0"
        style={{
          maxWidth: '95vw',
          width: '95vw',
          maxHeight: '90vh',
          height: '90vh',
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">
            Editando {selectedVariants.length} variante
            {selectedVariants.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription className="text-base">
            Edita los campos directamente. Arrastra el icono 
            <GripVertical className="inline h-3 w-3 mx-1" /> 
            hacia abajo para rellenar múltiples celdas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6">
          <div className="rounded-lg border overflow-hidden bg-white my-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-6 py-5 text-left text-base font-semibold text-slate-700 w-[400px] sticky top-0 bg-slate-50 z-10">
                    Título
                  </th>
                  <th className="px-6 py-5 text-left text-base font-semibold text-slate-700 w-[280px] sticky top-0 bg-slate-50 z-10">
                    Precio
                  </th>
                  <th className="px-6 py-5 text-left text-base font-semibold text-slate-700 w-[280px] sticky top-0 bg-slate-50 z-10">
                    Precio Anterior
                  </th>
                  <th className="px-6 py-5 text-left text-base font-semibold text-slate-700 w-[300px] sticky top-0 bg-slate-50 z-10">
                    SKU
                  </th>
                  <th className="px-6 py-5 text-left text-base font-semibold text-slate-700 w-[240px] sticky top-0 bg-slate-50 z-10">
                    Stock
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {editedVariants.map((item, localIndex) => (
                  <tr 
                    key={item.index} 
                    className={`hover:bg-slate-50/50 transition-colors ${
                      isCellInDragRange(localIndex) ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Título */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded border-2 bg-slate-100">
                          {item.data.image ? (
                            <Image
                              src={item.data.image}
                              alt=""
                              width={48}
                              height={48}
                              className="object-cover h-full w-full"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400 font-medium">
                              —
                            </div>
                          )}
                        </div>
                        <span className="text-lg font-medium text-slate-700">
                          {Object.entries(item.data.options)
                            .map(([k, v]) => v)
                            .join(" / ")}
                        </span>
                      </div>
                    </td>

                    {/* Precio */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3 group">
                        <input
                          type="number"
                          step="0.01"
                          value={item.data.price}
                          onChange={(e) => updateVariant(localIndex, "price", e.target.value)}
                          onDragEnter={() => handleDragEnter(localIndex)}
                          style={inputStyle}
                          onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                          onBlur={(e) => Object.assign(e.target.style, inputStyle)}
                        />
                        <div
                          draggable
                          onDragStart={() => handleDragStart('price', localIndex, item.data.price)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded flex-shrink-0"
                          title="Arrastra para rellenar"
                        >
                          <GripVertical className="h-6 w-6 text-slate-500" />
                        </div>
                      </div>
                    </td>

                    {/* Precio Anterior */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3 group">
                        <input
                          type="number"
                          step="0.01"
                          value={item.data.compareAtPrice}
                          onChange={(e) => updateVariant(localIndex, "compareAtPrice", e.target.value)}
                          onDragEnter={() => handleDragEnter(localIndex)}
                          placeholder="—"
                          style={inputStyle}
                          onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                          onBlur={(e) => Object.assign(e.target.style, inputStyle)}
                        />
                        <div
                          draggable
                          onDragStart={() => handleDragStart('compareAtPrice', localIndex, item.data.compareAtPrice)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded flex-shrink-0"
                          title="Arrastra para rellenar"
                        >
                          <GripVertical className="h-6 w-6 text-slate-500" />
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3 group">
                        <input
                          type="text"
                          value={item.data.sku}
                          onChange={(e) => updateVariant(localIndex, "sku", e.target.value)}
                          onDragEnter={() => handleDragEnter(localIndex)}
                          placeholder="—"
                          style={inputStyle}
                          onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                          onBlur={(e) => Object.assign(e.target.style, inputStyle)}
                        />
                        <div
                          draggable
                          onDragStart={() => handleDragStart('sku', localIndex, item.data.sku)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded flex-shrink-0"
                          title="Arrastra para rellenar"
                        >
                          <GripVertical className="h-6 w-6 text-slate-500" />
                        </div>
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3 group">
                        <input
                          type="number"
                          value={item.data.stock}
                          onChange={(e) => updateVariant(localIndex, "stock", e.target.value)}
                          onDragEnter={() => handleDragEnter(localIndex)}
                          style={inputStyle}
                          onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                          onBlur={(e) => Object.assign(e.target.style, inputStyle)}
                        />
                        <div
                          draggable
                          onDragStart={() => handleDragStart('stock', localIndex, item.data.stock)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded flex-shrink-0"
                          title="Arrastra para rellenar"
                        >
                          <GripVertical className="h-6 w-6 text-slate-500" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3 border-t px-6 py-4 bg-slate-50">
          <Button onClick={handleSave} className="flex-1" size="lg">
            Guardar Cambios
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            size="lg"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
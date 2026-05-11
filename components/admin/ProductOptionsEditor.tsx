"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Upload, ImagePlus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

// Tipos
type SwatchType = 'NONE' | 'COLOR' | 'IMAGE';
type OptionDisplayStyle = 'DROPDOWN' | 'BUTTONS' | 'SWATCHES';

interface OptionValue {
  id: string;
  value: string;
  position: number;
  swatchType: SwatchType;
  colorHex?: string;
  swatchImage?: string;
}

interface ProductOption {
  id: string;
  name: string;
  displayStyle: OptionDisplayStyle;
  position: number;
  values: OptionValue[];
}

interface ProductOptionsEditorProps {
  options: ProductOption[];
  onChange: (options: ProductOption[]) => void;
}

export default function ProductOptionsEditor({
  options,
  onChange
}: ProductOptionsEditorProps) {
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addOption = () => {
    const newOption: ProductOption = {
      id: `temp_${Date.now()}`,
      name: "",
      displayStyle: "DROPDOWN",
      position: options.length,
      values: []
    };
    onChange([...options, newOption]);
    setExpandedOptions(new Set([...expandedOptions, newOption.id]));
  };

  const updateOption = (index: number, field: keyof ProductOption, value: any) => {
    const newOptions = [...options];
    (newOptions[index] as any)[field] = value;
    onChange(newOptions);
  };

  const deleteOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onChange(newOptions);
  };

  const addValue = (optionIndex: number) => {
    const newOptions = [...options];
    const option = newOptions[optionIndex];

    const newValue: OptionValue = {
      id: `temp_${Date.now()}`,
      value: "",
      position: option.values.length,
      swatchType: "NONE",
      colorHex: undefined,
      swatchImage: undefined
    };

    option.values.push(newValue);
    onChange(newOptions);
  };

  const updateValue = (optionIndex: number, valueIndex: number, field: keyof OptionValue, value: any) => {
    const newOptions = [...options];
    (newOptions[optionIndex].values[valueIndex] as any)[field] = value;
    onChange(newOptions);
  };

  const deleteValue = (optionIndex: number, valueIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].values = newOptions[optionIndex].values.filter((_, i) => i !== valueIndex);
    onChange(newOptions);
  };

  const reorderValues = (optionIndex: number, oldIdx: number, newIdx: number) => {
    const newOptions = [...options];
    const reordered = arrayMove(newOptions[optionIndex].values, oldIdx, newIdx).map((v, i) => ({
      ...v,
      position: i,
    }));
    newOptions[optionIndex] = { ...newOptions[optionIndex], values: reordered };
    onChange(newOptions);
  };

  const toggleExpanded = (optionId: string) => {
    const newExpanded = new Set(expandedOptions);
    if (newExpanded.has(optionId)) {
      newExpanded.delete(optionId);
    } else {
      newExpanded.add(optionId);
    }
    setExpandedOptions(newExpanded);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed');

    const data = await response.json();
    return data.url;
  };

  const handleOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = options.findIndex((o) => o.id === active.id);
    const newIdx = options.findIndex((o) => o.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(options, oldIdx, newIdx).map((o, i) => ({
      ...o,
      position: i,
    }));
    onChange(reordered);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Label className="text-base font-semibold">Opciones del Producto</Label>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Define color, talla, material, etc.
          </p>
        </div>
        <Button
          type="button"
          onClick={addOption}
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Agregar Opción</span>
        </Button>
      </div>

      {options.length === 0 && (
        <div className="text-center py-10 sm:py-12 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-4">
            No hay opciones configuradas
          </p>
          <Button type="button" onClick={addOption} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Primera Opción
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleOptionDragEnd}
      >
        <SortableContext
          items={options.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {options.map((option, optionIndex) => (
              <SortableOption
                key={option.id}
                option={option}
                optionIndex={optionIndex}
                isExpanded={expandedOptions.has(option.id)}
                sensors={sensors}
                onToggleExpanded={() => toggleExpanded(option.id)}
                onUpdateOption={updateOption}
                onDeleteOption={deleteOption}
                onAddValue={addValue}
                onUpdateValue={updateValue}
                onDeleteValue={deleteValue}
                onReorderValues={reorderValues}
                onUploadImage={uploadImage}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface SortableOptionProps {
  option: ProductOption;
  optionIndex: number;
  isExpanded: boolean;
  sensors: ReturnType<typeof useSensors>;
  onToggleExpanded: () => void;
  onUpdateOption: (index: number, field: keyof ProductOption, value: any) => void;
  onDeleteOption: (index: number) => void;
  onAddValue: (optionIndex: number) => void;
  onUpdateValue: (optionIndex: number, valueIndex: number, field: keyof OptionValue, value: any) => void;
  onDeleteValue: (optionIndex: number, valueIndex: number) => void;
  onReorderValues: (optionIndex: number, oldIdx: number, newIdx: number) => void;
  onUploadImage: (file: File) => Promise<string>;
}

function SortableOption({
  option,
  optionIndex,
  isExpanded,
  sensors,
  onToggleExpanded,
  onUpdateOption,
  onDeleteOption,
  onAddValue,
  onUpdateValue,
  onDeleteValue,
  onReorderValues,
  onUploadImage,
}: SortableOptionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleValueDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = option.values.findIndex((v) => v.id === active.id);
    const newIdx = option.values.findIndex((v) => v.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorderValues(optionIndex, oldIdx, newIdx);
  };

  const displayStyleLabel: Record<OptionDisplayStyle, string> = {
    DROPDOWN: "Dropdown",
    BUTTONS: "Botones",
    SWATCHES: "Swatches",
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-card overflow-hidden">
      {/* Summary header — always visible, single row */}
      <div
        className={`flex items-center gap-2 p-2 sm:p-2.5 ${
          isExpanded ? "bg-muted/40 border-b" : "bg-muted/20"
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground touch-none shrink-0 p-0.5"
          aria-label="Arrastrar opción"
        >
          <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex-1 min-w-0 text-left py-0.5"
        >
          <p className="font-medium text-sm truncate">
            {option.name || (
              <span className="italic text-muted-foreground">Sin nombre</span>
            )}
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
            {option.values.length} valor
            {option.values.length !== 1 ? "es" : ""} ·{" "}
            {displayStyleLabel[option.displayStyle]}
          </p>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleExpanded}
          className="h-8 w-8 shrink-0"
          aria-label={isExpanded ? "Colapsar" : "Expandir"}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDeleteOption(optionIndex)}
          className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          aria-label="Eliminar opción"
        >
          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {/* Editable Name + Style fields — only when expanded */}
      {isExpanded && (
        <div className="grid grid-cols-1 gap-2 p-3 border-b sm:grid-cols-2 sm:gap-3 sm:p-4">
          <div>
            <Label className="text-[11px] sm:text-xs text-muted-foreground">
              Nombre
            </Label>
            <Input
              placeholder="Color, Talla, Material…"
              value={option.name}
              onChange={(e) =>
                onUpdateOption(optionIndex, "name", e.target.value)
              }
              className="mt-0.5 h-9"
            />
          </div>
          <div>
            <Label className="text-[11px] sm:text-xs text-muted-foreground">
              Estilo de visualización
            </Label>
            <Select
              value={option.displayStyle}
              onValueChange={(value) =>
                onUpdateOption(optionIndex, "displayStyle", value)
              }
            >
              <SelectTrigger className="mt-0.5 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DROPDOWN">Dropdown</SelectItem>
                <SelectItem value="BUTTONS">Botones</SelectItem>
                <SelectItem value="SWATCHES">Swatches</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Valores de la Opción */}
      {isExpanded && (
        <div className="p-3 space-y-2 sm:p-4 sm:space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleValueDragEnd}
          >
            <SortableContext
              items={option.values.map((v) => v.id)}
              strategy={verticalListSortingStrategy}
            >
              {option.values.map((value, valueIndex) => (
                <SortableOptionValue
                  key={value.id}
                  value={value}
                  optionIndex={optionIndex}
                  valueIndex={valueIndex}
                  onUpdateValue={onUpdateValue}
                  onDeleteValue={onDeleteValue}
                  onUploadImage={onUploadImage}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button
            type="button"
            onClick={() => onAddValue(optionIndex)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Valor
          </Button>
        </div>
      )}
    </div>
  );
}

interface SortableOptionValueProps {
  value: OptionValue;
  optionIndex: number;
  valueIndex: number;
  onUpdateValue: (optionIndex: number, valueIndex: number, field: keyof OptionValue, value: any) => void;
  onDeleteValue: (optionIndex: number, valueIndex: number) => void;
  onUploadImage: (file: File) => Promise<string>;
}

function SortableOptionValue({
  value,
  optionIndex,
  valueIndex,
  onUpdateValue,
  onDeleteValue,
  onUploadImage,
}: SortableOptionValueProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: value.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const hasSwatch = value.swatchType !== "NONE";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border bg-background overflow-hidden"
    >
      {/* Main row: handle + value input + swatch type + delete */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground touch-none shrink-0 p-0.5"
          aria-label="Arrastrar valor"
        >
          <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <Input
          placeholder="Valor (ej: Rojo, M)"
          value={value.value}
          onChange={(e) =>
            onUpdateValue(optionIndex, valueIndex, "value", e.target.value)
          }
          className="h-9 flex-1 min-w-0"
        />

        <Select
          value={value.swatchType}
          onValueChange={(v) =>
            onUpdateValue(optionIndex, valueIndex, "swatchType", v)
          }
        >
          <SelectTrigger className="h-9 w-[80px] sm:w-[112px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Sin</SelectItem>
            <SelectItem value="COLOR">Color</SelectItem>
            <SelectItem value="IMAGE">Imagen</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDeleteValue(optionIndex, valueIndex)}
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
          aria-label="Eliminar valor"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Swatch panel — only when COLOR or IMAGE */}
      {hasSwatch && value.swatchType === "COLOR" && (
        <div className="border-t bg-muted/30 px-2 py-2 flex items-center gap-2">
          <label
            className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-md border shrink-0"
            style={{ backgroundColor: value.colorHex || "#ffffff" }}
            aria-label="Elegir color"
          >
            <input
              type="color"
              value={value.colorHex || "#000000"}
              onChange={(e) =>
                onUpdateValue(optionIndex, valueIndex, "colorHex", e.target.value)
              }
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <Input
            placeholder="#FF0000"
            value={value.colorHex || ""}
            onChange={(e) =>
              onUpdateValue(optionIndex, valueIndex, "colorHex", e.target.value)
            }
            maxLength={7}
            className="h-9 font-mono text-sm uppercase flex-1 min-w-0"
          />
        </div>
      )}

      {hasSwatch && value.swatchType === "IMAGE" && (
        <div className="border-t bg-muted/30 px-2 py-2 flex items-center gap-2">
          {value.swatchImage ? (
            <img
              src={value.swatchImage}
              alt="Preview"
              className="h-9 w-9 rounded-md border object-cover shrink-0"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background shrink-0">
              <ImagePlus className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 flex-1 sm:flex-initial"
            asChild
          >
            <label className="cursor-pointer flex items-center justify-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {value.swatchImage ? "Cambiar imagen" : "Subir imagen"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const url = await onUploadImage(file);
                      onUpdateValue(
                        optionIndex,
                        valueIndex,
                        "swatchImage",
                        url
                      );
                    } catch {
                      alert("Error al subir imagen");
                    }
                  }
                }}
              />
            </label>
          </Button>
        </div>
      )}
    </div>
  );
}

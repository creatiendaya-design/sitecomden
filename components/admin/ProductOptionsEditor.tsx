"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Opciones del Producto</Label>
          <p className="text-sm text-gray-500">Define color, talla, material, etc.</p>
        </div>
        <Button type="button" onClick={addOption} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Opción
        </Button>
      </div>

      {options.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">No hay opciones configuradas</p>
          <Button type="button" onClick={addOption} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Primera Opción
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {options.map((option, optionIndex) => {
          const isExpanded = expandedOptions.has(option.id);
          
          return (
            <div key={option.id} className="border rounded-lg bg-white">
              {/* Header de la Opción */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
                <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Nombre (ej: Color, Talla)"
                    value={option.name}
                    onChange={(e) => updateOption(optionIndex, 'name', e.target.value)}
                  />
                  
                  <Select
                    value={option.displayStyle}
                    onValueChange={(value) => updateOption(optionIndex, 'displayStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DROPDOWN">Dropdown</SelectItem>
                      <SelectItem value="BUTTONS">Botones</SelectItem>
                      <SelectItem value="SWATCHES">Swatches</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {option.values.length} valor{option.values.length !== 1 ? 'es' : ''}
                  </span>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(option.id)}
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
                    size="sm"
                    onClick={() => deleteOption(optionIndex)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Valores de la Opción */}
              {isExpanded && (
                <div className="p-4 space-y-3">
                  {option.values.map((value, valueIndex) => (
                    <div key={value.id} className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50">
                      <GripVertical className="h-5 w-5 text-gray-400 cursor-move mt-2" />
                      
                      <div className="flex-1 space-y-3">
                        {/* Nombre del Valor */}
                        <Input
                          placeholder="Valor (ej: Rojo, M, Algodón)"
                          value={value.value}
                          onChange={(e) => updateValue(optionIndex, valueIndex, 'value', e.target.value)}
                        />

                        {/* Tipo de Swatch */}
                        <div className="grid grid-cols-3 gap-3">
                          <Select
                            value={value.swatchType}
                            onValueChange={(v) => updateValue(optionIndex, valueIndex, 'swatchType', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">Sin Swatch</SelectItem>
                              <SelectItem value="COLOR">Color</SelectItem>
                              <SelectItem value="IMAGE">Imagen</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Color Picker */}
                          {value.swatchType === 'COLOR' && (
                            <div className="col-span-2 flex items-center gap-2">
                              <input
                                type="color"
                                value={value.colorHex || '#000000'}
                                onChange={(e) => updateValue(optionIndex, valueIndex, 'colorHex', e.target.value)}
                                className="h-10 w-16 rounded border cursor-pointer"
                              />
                              <Input
                                placeholder="#FF0000"
                                value={value.colorHex || ''}
                                onChange={(e) => updateValue(optionIndex, valueIndex, 'colorHex', e.target.value)}
                                maxLength={7}
                              />
                            </div>
                          )}

                          {/* Upload Imagen */}
                          {value.swatchType === 'IMAGE' && (
                            <div className="col-span-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const url = await uploadImage(file);
                                      updateValue(optionIndex, valueIndex, 'swatchImage', url);
                                    } catch (error) {
                                      alert('Error al subir imagen');
                                    }
                                  }
                                }}
                                className="text-sm"
                              />
                              {value.swatchImage && (
                                <div className="mt-2">
                                  <img 
                                    src={value.swatchImage} 
                                    alt="Preview" 
                                    className="h-12 w-12 rounded border object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteValue(optionIndex, valueIndex)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    onClick={() => addValue(optionIndex)}
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
        })}
      </div>
    </div>
  );
}
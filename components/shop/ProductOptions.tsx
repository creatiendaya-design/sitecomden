"use client";

import { useState } from "react";
import Image from "next/image";

// Tipos basados en el schema de Prisma
type SwatchType = 'NONE' | 'COLOR' | 'IMAGE';
type OptionDisplayStyle = 'DROPDOWN' | 'BUTTONS' | 'SWATCHES';

interface ProductOptionValue {
  id: string;
  value: string;
  swatchType: SwatchType;
  colorHex?: string | null;
  swatchImage?: string | null;
  position: number;
}

interface ProductOption {
  id: string;
  name: string;
  displayStyle: OptionDisplayStyle;
  position: number;
  values: ProductOptionValue[];
}

interface ProductOptionsProps {
  options: ProductOption[];
  selectedOptions: Record<string, string>; // { optionId: valueId }
  onOptionChange: (optionId: string, valueId: string) => void;
}

export default function ProductOptions({ 
  options, 
  selectedOptions, 
  onOptionChange 
}: ProductOptionsProps) {
  return (
    <div className="space-y-6">
      {options.map((option) => (
        <div key={option.id} className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">
            {option.name}
          </label>

          {/* Renderizar según el displayStyle */}
          {option.displayStyle === 'SWATCHES' && (
            <SwatchesView
              option={option}
              selectedValueId={selectedOptions[option.id]}
              onSelect={(valueId) => onOptionChange(option.id, valueId)}
            />
          )}

          {option.displayStyle === 'BUTTONS' && (
            <ButtonsView
              option={option}
              selectedValueId={selectedOptions[option.id]}
              onSelect={(valueId) => onOptionChange(option.id, valueId)}
            />
          )}

          {option.displayStyle === 'DROPDOWN' && (
            <DropdownView
              option={option}
              selectedValueId={selectedOptions[option.id]}
              onSelect={(valueId) => onOptionChange(option.id, valueId)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ========================================
// VISTA: SWATCHES (Colores o Imágenes)
// ========================================
function SwatchesView({ 
  option, 
  selectedValueId, 
  onSelect 
}: {
  option: ProductOption;
  selectedValueId: string;
  onSelect: (valueId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {option.values.map((value) => {
        const isSelected = selectedValueId === value.id;

        return (
          <button
            key={value.id}
            onClick={() => onSelect(value.id)}
            className={`
              group relative flex items-center gap-2 
              px-3 py-2 rounded-lg border-2 transition-all
              hover:border-gray-400
              ${isSelected 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 bg-white'
              }
            `}
            title={value.value}
          >
            {/* Renderizar swatch según tipo */}
            {value.swatchType === 'COLOR' && value.colorHex && (
              <div 
                className="w-6 h-6 rounded-full border-2 border-gray-200"
                style={{ backgroundColor: value.colorHex }}
              />
            )}

            {value.swatchType === 'IMAGE' && value.swatchImage && (
              <div className="relative w-6 h-6 rounded border-2 border-gray-200 overflow-hidden">
                <Image
                  src={value.swatchImage}
                  alt={value.value}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Texto del valor */}
            <span className="text-sm font-medium">
              {value.value}
            </span>

            {/* Indicador de selección */}
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ========================================
// VISTA: BUTTONS (Botones simples)
// ========================================
function ButtonsView({ 
  option, 
  selectedValueId, 
  onSelect 
}: {
  option: ProductOption;
  selectedValueId: string;
  onSelect: (valueId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {option.values.map((value) => {
        const isSelected = selectedValueId === value.id;

        return (
          <button
            key={value.id}
            onClick={() => onSelect(value.id)}
            className={`
              px-4 py-2 rounded-lg border-2 transition-all
              hover:border-gray-400
              ${isSelected 
                ? 'border-blue-500 bg-blue-500 text-white' 
                : 'border-gray-300 bg-white text-gray-700'
              }
            `}
          >
            {value.value}
          </button>
        );
      })}
    </div>
  );
}

// ========================================
// VISTA: DROPDOWN (Select tradicional)
// ========================================
function DropdownView({ 
  option, 
  selectedValueId, 
  onSelect 
}: {
  option: ProductOption;
  selectedValueId: string;
  onSelect: (valueId: string) => void;
}) {
  return (
    <select
      value={selectedValueId || ''}
      onChange={(e) => onSelect(e.target.value)}
      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
    >
      <option value="">Seleccionar {option.name}</option>
      {option.values.map((value) => (
        <option key={value.id} value={value.id}>
          {value.value}
        </option>
      ))}
    </select>
  );
}
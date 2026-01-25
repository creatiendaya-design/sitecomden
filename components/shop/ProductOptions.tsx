"use client";

import { useState } from "react";
import Image from "next/image";

// 🔧 TIPOS EXPLÍCITOS
interface OptionValue {
  id: string;
  value: string;
  position: number;
  swatchType: string;
  colorHex: string | null;
  swatchImage: string | null;
}

interface Option {
  id: string;
  name: string;
  displayStyle: string;
  position: number;
  values: OptionValue[];
}

export interface ProductOptionsProps {
  options: Option[];
  selectedOptions: Record<string, string>;
  onOptionChange: (optionId: string, valueId: string) => void;
}

export default function ProductOptions({
  options,
  selectedOptions,
  onOptionChange,
}: ProductOptionsProps) {
  return (
    <div className="space-y-6">
      {options.map((option) => (
        <div key={option.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-base font-semibold text-slate-900">
              {option.name}
            </label>
            {selectedOptions[option.id] && (
              <span className="text-sm text-slate-600">
                {option.values.find((v) => v.id === selectedOptions[option.id])
                  ?.value}
              </span>
            )}
          </div>

          {/* SWATCHES */}
          {option.displayStyle === "SWATCHES" && (
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selectedOptions[option.id] === value.id;

                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => onOptionChange(option.id, value.id)}
                    className={`
                      group relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all
                      ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 shadow-md"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }
                    `}
                    title={value.value}
                  >
                    {/* COLOR Swatch */}
                    {value.swatchType === "COLOR" && value.colorHex && (
                      <>
                        <div
                          className={`
                            h-10 w-10 rounded-full border-2 border-slate-200 shadow-sm
                            ${isSelected ? "ring-2 ring-blue-600 ring-offset-2" : ""}
                          `}
                          style={{ backgroundColor: value.colorHex }}
                        />
                        <span className="text-xs font-medium text-slate-700">
                          {value.value}
                        </span>
                        {isSelected && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                            ✓
                          </span>
                        )}
                      </>
                    )}

                    {/* IMAGE Swatch */}
                    {value.swatchType === "IMAGE" && value.swatchImage && (
                      <>
                        <div
                          className={`
                            relative h-10 w-10 overflow-hidden rounded-md border-2 border-slate-200 shadow-sm
                            ${isSelected ? "ring-2 ring-blue-600 ring-offset-2" : ""}
                          `}
                        >
                          <Image
                            src={value.swatchImage}
                            alt={value.value}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700">
                          {value.value}
                        </span>
                        {isSelected && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                            ✓
                          </span>
                        )}
                      </>
                    )}

                    {/* NONE - Solo texto en swatch */}
                    {value.swatchType === "NONE" && (
                      <>
                        <span className="text-sm font-medium text-slate-900">
                          {value.value}
                        </span>
                        {isSelected && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                            ✓
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* BUTTONS */}
          {option.displayStyle === "BUTTONS" && (
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selectedOptions[option.id] === value.id;

                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => onOptionChange(option.id, value.id)}
                    className={`
                      rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all
                      ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white shadow-md"
                          : "border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
                      }
                    `}
                  >
                    {value.value}
                  </button>
                );
              })}
            </div>
          )}

          {/* DROPDOWN */}
          {option.displayStyle === "DROPDOWN" && (
            <select
              value={selectedOptions[option.id] || ""}
              onChange={(e) => onOptionChange(option.id, e.target.value)}
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <option value="">Selecciona {option.name}</option>
              {option.values.map((value) => (
                <option key={value.id} value={value.id}>
                  {value.value}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
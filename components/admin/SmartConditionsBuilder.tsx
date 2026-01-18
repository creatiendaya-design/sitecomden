"use client";

import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, AlertCircle, Package } from "lucide-react";

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface SmartConditionsBuilderProps {
  conditions: Condition[];
  onConditionsChange: (conditions: Condition[]) => void;
  conditionRelation: "AND" | "OR";
  onRelationChange: (relation: "AND" | "OR") => void;
}

const FIELD_OPTIONS = [
  { value: "price", label: "Precio" },
  { value: "compareAtPrice", label: "Precio de comparación" },
  { value: "weight", label: "Peso" },
  { value: "stock", label: "Existencias" },
  { value: "name", label: "Título" },
  { value: "sku", label: "SKU" },
  { value: "featured", label: "Destacado" },
];

const OPERATOR_OPTIONS: Record<string, { value: string; label: string }[]> = {
  price: [
    { value: "greater_than", label: "es mayor que" },
    { value: "less_than", label: "es menor que" },
    { value: "equals", label: "es igual a" },
  ],
  compareAtPrice: [
    { value: "greater_than", label: "es mayor que" },
    { value: "less_than", label: "es menor que" },
    { value: "equals", label: "es igual a" },
  ],
  weight: [
    { value: "greater_than", label: "es mayor que" },
    { value: "less_than", label: "es menor que" },
    { value: "equals", label: "es igual a" },
  ],
  stock: [
    { value: "greater_than", label: "es mayor que" },
    { value: "less_than", label: "es menor que" },
    { value: "equals", label: "es igual a" },
    { value: "greater_than_or_equal", label: "es mayor o igual que" },
    { value: "less_than_or_equal", label: "es menor o igual que" },
  ],
  name: [
    { value: "contains", label: "contiene" },
    { value: "not_contains", label: "no contiene" },
    { value: "equals", label: "es igual a" },
    { value: "starts_with", label: "comienza con" },
    { value: "ends_with", label: "termina con" },
  ],
  sku: [
    { value: "contains", label: "contiene" },
    { value: "equals", label: "es igual a" },
    { value: "starts_with", label: "comienza con" },
  ],
  featured: [
    { value: "equals", label: "es" },
  ],
};

export default function SmartConditionsBuilder({
  conditions,
  onConditionsChange,
  conditionRelation,
  onRelationChange,
}: SmartConditionsBuilderProps) {
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Preview de productos cuando cambian las condiciones
  useEffect(() => {
    const loadPreview = async () => {
      if (conditions.length === 0 || conditions.some(c => !c.value)) {
        setPreviewCount(null);
        return;
      }

      setLoadingPreview(true);
      try {
        const response = await fetch("/api/admin/categories/preview-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conditions, relation: conditionRelation }),
        });

        const data = await response.json();
        setPreviewCount(data.count || 0);
      } catch (error) {
        console.error("Error loading preview:", error);
        setPreviewCount(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    const timeoutId = setTimeout(loadPreview, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [conditions, conditionRelation]);

  const addCondition = () => {
    const newCondition: Condition = {
      id: Math.random().toString(36).substr(2, 9),
      field: "price",
      operator: "greater_than",
      value: "",
    };
    onConditionsChange([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    onConditionsChange(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    onConditionsChange(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const getOperatorOptions = (field: string) => {
    return OPERATOR_OPTIONS[field] || OPERATOR_OPTIONS.price;
  };

  return (
    <div className="space-y-4">
      {/* Relation Selector */}
      {conditions.length > 0 && (
        <div className="space-y-2">
          <Label>Los productos deben cumplir:</Label>
          <RadioGroup
            value={conditionRelation}
            onValueChange={(value: "AND" | "OR") => onRelationChange(value)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="AND" id="and" />
              <Label htmlFor="and" className="cursor-pointer">
                todas las condiciones
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="OR" id="or" />
              <Label htmlFor="or" className="cursor-pointer">
                cualquier condición
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Conditions */}
      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <div key={condition.id} className="flex gap-2 items-start">
            {/* Field */}
            <div className="flex-1">
              <Select
                value={condition.field}
                onValueChange={(value) => {
                  const operators = getOperatorOptions(value);
                  updateCondition(condition.id, {
                    field: value,
                    operator: operators[0].value,
                    value: "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operator */}
            <div className="flex-1">
              <Select
                value={condition.operator}
                onValueChange={(value) =>
                  updateCondition(condition.id, { operator: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getOperatorOptions(condition.field).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Value */}
            <div className="flex-1">
              {condition.field === "featured" ? (
                <Select
                  value={condition.value}
                  onValueChange={(value) =>
                    updateCondition(condition.id, { value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sí (Destacado)</SelectItem>
                    <SelectItem value="false">No (Normal)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={
                    ["price", "compareAtPrice", "weight", "stock"].includes(
                      condition.field
                    )
                      ? "number"
                      : "text"
                  }
                  placeholder={
                    condition.field === "price"
                      ? "$"
                      : condition.field === "stock"
                      ? "Cantidad"
                      : "Valor"
                  }
                  value={condition.value}
                  onChange={(e) =>
                    updateCondition(condition.id, { value: e.target.value })
                  }
                />
              )}
            </div>

            {/* Remove Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeCondition(condition.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Condition Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addCondition}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Agregar otra condición
      </Button>

      {/* Preview de productos */}
      {conditions.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-semibold">Vista previa</h4>
          </div>
          
          {loadingPreview ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : previewCount !== null ? (
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{previewCount}</p>
              <p className="text-sm text-muted-foreground mt-1">
                producto(s) cumple(n) {conditionRelation === "AND" ? "todas" : "cualquiera de"} las condiciones
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Completa los valores para ver el preview
            </p>
          )}
        </div>
      )}

      {/* Info Alert */}
      {conditions.length > 0 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-900">
            <p className="font-semibold mb-1">
              Esta colección incluirá todos los productos con al menos una variante que cumpla:{" "}
              {conditionRelation === "AND" ? "todas" : "cualquiera de"} las
              condiciones.
            </p>
            <p>
              Los productos se actualizarán automáticamente cuando cambien para
              cumplir o dejar de cumplir estas condiciones.
            </p>
          </div>
        </div>
      )}

      {conditions.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground mb-3">
            No hay condiciones definidas
          </p>
          <p className="text-sm text-muted-foreground">
            Agrega condiciones para filtrar productos automáticamente
          </p>
        </div>
      )}
    </div>
  );
}
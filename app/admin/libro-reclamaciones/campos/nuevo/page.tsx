"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus, X, Info } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { createFormField } from "@/actions/complaints";
import { Alert, AlertDescription } from "@/components/ui/alert";

const fieldTypes = [
  { value: "text", label: "Texto" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Teléfono" },
  { value: "textarea", label: "Área de texto" },
  { value: "select", label: "Selector (Select)" },
  { value: "select_with_other", label: "Selector + Otro (Select con input adicional)" },
  { value: "radio", label: "Radio buttons" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Fecha" },
];

const widthOptions = [
  { value: "full", label: "Ancho completo (100%)" },
  { value: "half", label: "Media (50%)" },
  { value: "third", label: "Tercio (33%)" },
  { value: "quarter", label: "Cuarto (25%)" },
  { value: "two-thirds", label: "Dos tercios (66%)" },
];

export default function NewFieldPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    fieldType: "text",
    section: "General",
    width: "full",
    placeholder: "",
    helpText: "",
    required: false,
    minLength: "",
    maxLength: "",
    pattern: "",
    otherLabel: "Otro (especificar)",
  });
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  const needsOptions = ["select", "select_with_other", "radio"].includes(formData.fieldType);
  const showOtherLabel = formData.fieldType === "select_with_other";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.label.trim()) {
      toast({
        title: "❌ Error",
        description: "El campo Label es obligatorio",
      });
      setLoading(false);
      return;
    }

    if (needsOptions && options.length === 0) {
      toast({
        title: "❌ Error",
        description: "Debes agregar al menos una opción",
      });
      setLoading(false);
      return;
    }

    try {
      const result = await createFormField({
        label: formData.label,
        fieldType: formData.fieldType,
        section: formData.section || undefined,
        width: formData.width,
        placeholder: formData.placeholder || undefined,
        helpText: formData.helpText || undefined,
        required: formData.required,
        options: needsOptions ? options : undefined,
        otherLabel: showOtherLabel ? formData.otherLabel : undefined,
        minLength: formData.minLength ? parseInt(formData.minLength) : undefined,
        maxLength: formData.maxLength ? parseInt(formData.maxLength) : undefined,
        pattern: formData.pattern || undefined,
      });

      if (result.success) {
        toast({
          title: "✅ Campo creado",
          description: "El campo se creó correctamente",
        });
        router.push("/admin/libro-reclamaciones");
      } else {
        toast({
          title: "❌ Error",
          description: result.error || "Error al crear campo",
        });
      }
    } catch (error) {
      console.error("Error creating field:", error);
      toast({
        title: "❌ Error",
        description: "Ocurrió un error inesperado",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setOptions([...options, newOption.trim()]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header - RESPONSIVE */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/libro-reclamaciones">
            <ArrowLeft className="h-4 w-4 md:mr-2" />
            <span className="hidden sm:inline">Volver</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Agregar Campo</h1>
          <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
            Crea un nuevo campo para el formulario
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Información del Campo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Section & Width - Grid en desktop */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="section">Sección *</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) =>
                    setFormData({ ...formData, section: e.target.value })
                  }
                  placeholder="Ej: Datos Personales"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Agrupa campos bajo un título
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="width">Ancho del Campo *</Label>
                <Select
                  value={formData.width}
                  onValueChange={(value) =>
                    setFormData({ ...formData, width: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {widthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="label">Label / Etiqueta *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="Ej: Tipo de documento"
                required
              />
            </div>

            {/* Field Type */}
            <div className="space-y-2">
              <Label htmlFor="fieldType">Tipo de Campo *</Label>
              <Select
                value={formData.fieldType}
                onValueChange={(value) =>
                  setFormData({ ...formData, fieldType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {showOtherLabel && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs md:text-sm">
                    Este tipo muestra un selector normal + una opción "Otro" que abre un campo de texto adicional
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Placeholder & Help Text */}
            <div className="space-y-2">
              <Label htmlFor="placeholder">Placeholder (opcional)</Label>
              <Input
                id="placeholder"
                value={formData.placeholder}
                onChange={(e) =>
                  setFormData({ ...formData, placeholder: e.target.value })
                }
                placeholder="Ej: Seleccione su tipo de documento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="helpText">Texto de Ayuda (opcional)</Label>
              <Textarea
                id="helpText"
                value={formData.helpText}
                onChange={(e) =>
                  setFormData({ ...formData, helpText: e.target.value })
                }
                placeholder="Ej: Texto que aparece debajo del campo"
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Required Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, required: checked as boolean })
                }
              />
              <Label htmlFor="required" className="cursor-pointer text-sm">
                Campo obligatorio
              </Label>
            </div>

            {/* Options (select, radio) */}
            {needsOptions && (
              <div className="space-y-2">
                <Label>Opciones *</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Ej: DNI"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddOption}
                    disabled={!newOption.trim()}
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {options.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {options.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-2 gap-2"
                      >
                        <span className="text-sm truncate flex-1">{option}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(index)}
                          className="flex-shrink-0 h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {showOtherLabel && (
                  <p className="text-xs text-muted-foreground">
                    La opción "Otro" se agregará automáticamente al final
                  </p>
                )}
              </div>
            )}

            {/* Other Label (only for select_with_other) */}
            {showOtherLabel && (
              <div className="space-y-2">
                <Label htmlFor="otherLabel">Texto para opción "Otro"</Label>
                <Input
                  id="otherLabel"
                  value={formData.otherLabel}
                  onChange={(e) =>
                    setFormData({ ...formData, otherLabel: e.target.value })
                  }
                  placeholder="Ej: Otro (especificar)"
                />
                <p className="text-xs text-muted-foreground">
                  Este texto aparecerá como última opción en el select
                </p>
              </div>
            )}

            {/* Validations (text, textarea, tel) */}
            {["text", "textarea", "tel"].includes(formData.fieldType) && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="minLength">Longitud Mínima</Label>
                    <Input
                      id="minLength"
                      type="number"
                      min="0"
                      value={formData.minLength}
                      onChange={(e) =>
                        setFormData({ ...formData, minLength: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLength">Longitud Máxima</Label>
                    <Input
                      id="maxLength"
                      type="number"
                      min="0"
                      value={formData.maxLength}
                      onChange={(e) =>
                        setFormData({ ...formData, maxLength: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pattern">Patrón RegEx</Label>
                  <Input
                    id="pattern"
                    value={formData.pattern}
                    onChange={(e) =>
                      setFormData({ ...formData, pattern: e.target.value })
                    }
                    placeholder="Ej: ^[0-9]{8}$"
                  />
                </div>
              </>
            )}

            {/* Submit Buttons - Stack en mobile */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="w-full sm:flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Campo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
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
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { updateFormField } from "@/actions/complaints";

const fieldTypes = [
  { value: "text", label: "Texto" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Teléfono" },
  { value: "textarea", label: "Área de texto" },
  { value: "select", label: "Selector" },
  { value: "radio", label: "Radio buttons" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Fecha" },
];

interface EditFieldPageProps {
  params: Promise<{ fieldId: string }>;
}

export default function EditFieldPage({ params }: EditFieldPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldId, setFieldId] = useState<string>("");
  const [formData, setFormData] = useState({
    label: "",
    fieldType: "text",
    placeholder: "",
    helpText: "",
    required: false,
    minLength: "",
    maxLength: "",
    pattern: "",
    active: true,
  });
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    params.then((p) => {
      setFieldId(p.fieldId);
      loadField(p.fieldId);
    });
  }, []);

  const loadField = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/complaints/fields/${id}`);
      const data = await response.json();

      if (data.success) {
        const field = data.field;
        setFormData({
          label: field.label,
          fieldType: field.fieldType,
          placeholder: field.placeholder || "",
          helpText: field.helpText || "",
          required: field.required,
          minLength: field.minLength?.toString() || "",
          maxLength: field.maxLength?.toString() || "",
          pattern: field.pattern || "",
          active: field.active,
        });
        setOptions(field.options || []);
      } else {
        toast({
          title: "❌ Error",
          description: "No se pudo cargar el campo",
        });
        router.push("/admin/libro-reclamaciones");
      }
    } catch (error) {
      console.error("Error loading field:", error);
      toast({
        title: "❌ Error",
        description: "Error al cargar el campo",
      });
    } finally {
      setLoading(false);
    }
  };

  const needsOptions = ["select", "radio"].includes(formData.fieldType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (!formData.label.trim()) {
      toast({
        title: "❌ Error",
        description: "El campo Label es obligatorio",
      });
      setSaving(false);
      return;
    }

    if (needsOptions && options.length === 0) {
      toast({
        title: "❌ Error",
        description: "Debes agregar al menos una opción",
      });
      setSaving(false);
      return;
    }

    try {
      const result = await updateFormField(fieldId, {
        label: formData.label,
        fieldType: formData.fieldType,
        placeholder: formData.placeholder || undefined,
        helpText: formData.helpText || undefined,
        required: formData.required,
        options: needsOptions ? options : undefined,
        minLength: formData.minLength ? parseInt(formData.minLength) : undefined,
        maxLength: formData.maxLength ? parseInt(formData.maxLength) : undefined,
        pattern: formData.pattern || undefined,
        active: formData.active,
      });

      if (result.success) {
        toast({
          title: "✅ Campo actualizado",
          description: "Los cambios se guardaron correctamente",
        });
        router.push("/admin/libro-reclamaciones");
      } else {
        toast({
          title: "❌ Error",
          description: result.error || "Error al actualizar campo",
        });
      }
    } catch (error) {
      console.error("Error updating field:", error);
      toast({
        title: "❌ Error",
        description: "Ocurrió un error inesperado",
      });
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/libro-reclamaciones">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Campo</h1>
          <p className="text-muted-foreground">
            Modifica los detalles del campo
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Campo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="label">Label / Etiqueta *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="Ej: Nombre completo"
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
            </div>

            {/* Placeholder */}
            <div className="space-y-2">
              <Label htmlFor="placeholder">Placeholder (opcional)</Label>
              <Input
                id="placeholder"
                value={formData.placeholder}
                onChange={(e) =>
                  setFormData({ ...formData, placeholder: e.target.value })
                }
                placeholder="Ej: Ingrese su nombre completo"
              />
            </div>

            {/* Help Text */}
            <div className="space-y-2">
              <Label htmlFor="helpText">Texto de Ayuda (opcional)</Label>
              <Textarea
                id="helpText"
                value={formData.helpText}
                onChange={(e) =>
                  setFormData({ ...formData, helpText: e.target.value })
                }
                placeholder="Ej: Ingrese su nombre tal como aparece en su DNI"
                rows={2}
              />
            </div>

            {/* Required & Active */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="required"
                  checked={formData.required}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, required: checked as boolean })
                  }
                />
                <Label htmlFor="required" className="cursor-pointer">
                  Campo obligatorio
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked as boolean })
                  }
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Campo activo (visible en el formulario)
                </Label>
              </div>
            </div>

            {/* Options */}
            {needsOptions && (
              <div className="space-y-2">
                <Label>Opciones *</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Ej: Producto defectuoso"
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
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {options.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {options.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-2"
                      >
                        <span>{option}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Validations */}
            {["text", "textarea", "tel"].includes(formData.fieldType) && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
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
                    placeholder="Ej: ^[0-9]{9}$"
                  />
                </div>
              </>
            )}

            {/* Submit */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
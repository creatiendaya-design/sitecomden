"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { FormField, ComplaintsConfig } from "@/types/complaints";

interface ComplaintsFormProps {
  fields: FormField[];
  config: ComplaintsConfig;
}

const widthClasses: Record<string, string> = {
  full: "w-full",
  half: "w-full md:w-1/2",
  third: "w-full md:w-1/3",
  quarter: "w-full md:w-1/4",
  "two-thirds": "w-full md:w-2/3",
};

export default function ComplaintsForm({ fields, config }: ComplaintsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Agrupar campos por sección
  const fieldsBySection = fields.reduce((acc, field) => {
    const section = field.section || "General";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FormField[]>);

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value === "")) {
      return "Este campo es obligatorio";
    }

    if (!value || value === "") {
      return null;
    }

    if (field.fieldType === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Ingrese un email válido";
      }
    }

    if (field.fieldType === "tel") {
      if (field.pattern) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          return "Formato de teléfono inválido";
        }
      }
    }

    if (field.minLength && value.length < field.minLength) {
      return `Mínimo ${field.minLength} caracteres`;
    }

    if (field.maxLength && value.length > field.maxLength) {
      return `Máximo ${field.maxLength} caracteres`;
    }

    if (field.pattern && field.fieldType !== "tel") {
      const regex = new RegExp(field.pattern);
      if (!regex.test(value)) {
        return "Formato inválido";
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const newErrors: Record<string, string> = {};
    
    fields.forEach((field) => {
      // Para select_with_other, validar el campo principal
      if (field.fieldType === "select_with_other") {
        const mainValue = formData[field.id];
        const otherValue = formData[`${field.id}_other`];
        
        // Si eligió "Otro" y el campo other está vacío
        if (mainValue === "__other__" && !otherValue) {
          newErrors[`${field.id}_other`] = "Por favor especifique";
        } else {
          const error = validateField(field, mainValue);
          if (error) {
            newErrors[field.id] = error;
          }
        }
      } else {
        const error = validateField(field, formData[field.id]);
        if (error) {
          newErrors[field.id] = error;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      toast({
        title: "Error",
        description: "Por favor corrige los errores en el formulario",
        variant: "destructive",
      });
      return;
    }

    // Procesar datos antes de enviar
    const processedData = { ...formData };
    
    // Para campos select_with_other, combinar valores
    fields.forEach((field) => {
      if (field.fieldType === "select_with_other") {
        if (processedData[field.id] === "__other__") {
          processedData[field.id] = processedData[`${field.id}_other`];
        }
        // Eliminar el campo auxiliar
        delete processedData[`${field.id}_other`];
      }
    });

    try {
      const response = await fetch("/api/complaints/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData: processedData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(
          `/libro-reclamaciones/gracias?number=${data.complaintNumber}`
        );
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al enviar reclamación",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting complaint:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const hasError = errors[field.id];
    const widthClass = widthClasses[field.width || "full"] || widthClasses.full;

    const fieldContent = (() => {
      switch (field.fieldType) {
        case "text":
        case "email":
        case "tel":
          return (
            <>
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Input
                id={field.id}
                type={field.fieldType}
                placeholder={field.placeholder}
                value={formData[field.id] || ""}
                onChange={(e) =>
                  setFormData({ ...formData, [field.id]: e.target.value })
                }
                className={hasError ? "border-red-500" : ""}
              />
              {field.helpText && (
                <p className="text-sm text-muted-foreground">{field.helpText}</p>
              )}
              {hasError && <p className="text-sm text-red-500">{hasError}</p>}
            </>
          );

        case "textarea":
          return (
            <>
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Textarea
                id={field.id}
                placeholder={field.placeholder}
                value={formData[field.id] || ""}
                onChange={(e) =>
                  setFormData({ ...formData, [field.id]: e.target.value })
                }
                rows={4}
                className={hasError ? "border-red-500" : ""}
              />
              {field.helpText && (
                <p className="text-sm text-muted-foreground">{field.helpText}</p>
              )}
              {hasError && <p className="text-sm text-red-500">{hasError}</p>}
            </>
          );

        case "select":
          return (
            <>
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Select
                value={formData[field.id] || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, [field.id]: value })
                }
              >
                <SelectTrigger className={hasError ? "border-red-500" : ""}>
                  <SelectValue
                    placeholder={field.placeholder || "Selecciona una opción"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.helpText && (
                <p className="text-sm text-muted-foreground">{field.helpText}</p>
              )}
              {hasError && <p className="text-sm text-red-500">{hasError}</p>}
            </>
          );

        case "select_with_other":
          const showOtherInput = formData[field.id] === "__other__";
          const otherError = errors[`${field.id}_other`];
          
          return (
            <>
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Select
                value={formData[field.id] || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, [field.id]: value })
                }
              >
                <SelectTrigger className={hasError ? "border-red-500" : ""}>
                  <SelectValue
                    placeholder={field.placeholder || "Selecciona una opción"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                  <SelectItem value="__other__">
                    {field.otherLabel || "Otro (especificar)"}
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {showOtherInput && (
                <Input
                  id={`${field.id}_other`}
                  placeholder="Especifique..."
                  value={formData[`${field.id}_other`] || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, [`${field.id}_other`]: e.target.value })
                  }
                  className={`mt-2 ${otherError ? "border-red-500" : ""}`}
                />
              )}
              
              {field.helpText && (
                <p className="text-sm text-muted-foreground">{field.helpText}</p>
              )}
              {hasError && <p className="text-sm text-red-500">{hasError}</p>}
              {otherError && <p className="text-sm text-red-500">{otherError}</p>}
            </>
          );

        case "radio":
          return (
            <>
              <Label>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <RadioGroup
                value={formData[field.id] || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, [field.id]: value })
                }
              >
                {field.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                    <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
              {field.helpText && (
                <p className="text-sm text-muted-foreground">{field.helpText}</p>
              )}
              {hasError && <p className="text-sm text-red-500">{hasError}</p>}
            </>
          );

        case "checkbox":
          return (
            <div className="flex items-start space-x-2">
              <Checkbox
                id={field.id}
                checked={formData[field.id] || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, [field.id]: checked })
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor={field.id} className="cursor-pointer">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.helpText && (
                  <p className="text-sm text-muted-foreground">{field.helpText}</p>
                )}
                {hasError && <p className="text-sm text-red-500">{hasError}</p>}
              </div>
            </div>
          );

        case "date":
          return (
            <>
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Input
                id={field.id}
                type="date"
                value={formData[field.id] || ""}
                onChange={(e) =>
                  setFormData({ ...formData, [field.id]: e.target.value })
                }
                className={hasError ? "border-red-500" : ""}
              />
              {field.helpText && (
                <p className="text-sm text-muted-foreground">{field.helpText}</p>
              )}
              {hasError && <p className="text-sm text-red-500">{hasError}</p>}
            </>
          );

        default:
          return null;
      }
    })();

    return (
      <div key={field.id} className={`space-y-2 ${widthClass} px-2`}>
        {fieldContent}
      </div>
    );
  };

  if (fields.length === 0) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="pt-6 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">
            El formulario no está configurado aún
          </p>
          <p className="text-muted-foreground">
            Por favor contacte al administrador
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Libro de Reclamaciones</CardTitle>
        <p className="text-muted-foreground">
          Complete el siguiente formulario con sus datos
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {Object.entries(fieldsBySection).map(([section, sectionFields]) => (
            <div key={section} className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-primary">
                  {section}
                </h3>
              </div>
              <div className="flex flex-wrap -mx-2">
                {sectionFields.map((field) => renderField(field))}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Reclamación
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Los campos marcados con <span className="text-red-500">*</span> son
            obligatorios
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Plus, 
  Trash2,
  GripVertical 
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FormField {
  id: string;
  label: string;
  fieldType: string;
  section?: string;
  order: number;
  width?: string;
  required: boolean;
}

const fieldTypeLabels: Record<string, string> = {
  heading: "Título",
  text: "Texto",
  email: "Email",
  tel: "Teléfono",
  textarea: "Área de texto",
  select: "Selector",
  select_with_other: "Selector + Otro",
  radio: "Radio",
  checkbox: "Checkbox",
  date: "Fecha",
};

const widthLabels: Record<string, string> = {
  full: "100%",
  half: "50%",
  third: "33%",
  quarter: "25%",
};

export default function OrganizarCamposPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [newSectionName, setNewSectionName] = useState("");
  const [deleteSection, setDeleteSection] = useState<string | null>(null);

  // Cargar campos
  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      const response = await fetch("/api/admin/complaints/fields");
      const data = await response.json();

      if (data.success) {
        setFields(data.fields);

        // Extraer secciones únicas
        const uniqueSections = Array.from(
          new Set(
            data.fields
              .map((f: FormField) => f.section || "Sin sección")
              .filter(Boolean)
          )
        ) as string[];

        setSections(uniqueSections.length > 0 ? uniqueSections : ["Sin sección"]);
      }
    } catch (error) {
      console.error("Error loading fields:", error);
      toast({
        title: "Error",
        description: "Error al cargar campos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cambiar sección de un campo
  const handleChangeSection = (fieldId: string, newSection: string) => {
    setFields(
      fields.map((f) => (f.id === fieldId ? { ...f, section: newSection } : f))
    );
  };

  // Agregar nueva sección
  const handleAddSection = () => {
    const trimmedName = newSectionName.trim();
    
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Ingresa un nombre de sección",
        variant: "destructive",
      });
      return;
    }

    if (sections.includes(trimmedName)) {
      toast({
        title: "Error",
        description: "Esta sección ya existe",
        variant: "destructive",
      });
      return;
    }

    setSections([...sections, trimmedName]);
    setNewSectionName("");

    toast({
      title: "✅ Sección agregada",
      description: `Sección "${trimmedName}" creada`,
    });
  };

  // Eliminar sección (mover campos a "Sin sección")
  const handleDeleteSection = (sectionName: string) => {
    // Mover campos de esta sección a "Sin sección"
    setFields(
      fields.map((f) =>
        f.section === sectionName ? { ...f, section: "Sin sección" } : f
      )
    );

    // Eliminar de lista de secciones
    setSections(sections.filter((s) => s !== sectionName));

    toast({
      title: "Sección eliminada",
      description: `Los campos se movieron a "Sin sección"`,
    });

    setDeleteSection(null);
  };

  // Guardar cambios
  const handleSave = async () => {
    setSaving(true);

    try {
      // Actualizar cada campo con su nueva sección
      const updates = fields.map((field) =>
        fetch(`/api/admin/complaints/fields/${field.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section: field.section }),
        })
      );

      await Promise.all(updates);

      toast({
        title: "✅ Cambios guardados",
        description: "Las secciones se actualizaron correctamente",
      });

      router.push("/admin/libro-reclamaciones");
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "Error al guardar cambios",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Agrupar campos por sección
  const fieldsBySection = fields.reduce((acc, field) => {
    const section = field.section || "Sin sección";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FormField[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/libro-reclamaciones">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Organizar Campos por Sección</h1>
            <p className="text-muted-foreground">
              Cambia la sección de cada campo para organizar tu formulario
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar Cambios
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{fields.length}</div>
            <p className="text-xs text-muted-foreground">Campos totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{sections.length}</div>
            <p className="text-xs text-muted-foreground">Secciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {fieldsBySection["Sin sección"]?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Sin sección</p>
          </CardContent>
        </Card>
      </div>

      {/* Agregar nueva sección */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agregar Nueva Sección</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ej: Datos Personales, Dirección..."
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
            />
            <Button onClick={handleAddSection}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campos agrupados por sección */}
      {Object.keys(fieldsBySection).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No hay campos para organizar</p>
            <Button asChild className="mt-4">
              <Link href="/admin/libro-reclamaciones/campos/nuevo">
                Crear Primer Campo
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(fieldsBySection)
            .sort(([a], [b]) => {
              // "Sin sección" al final
              if (a === "Sin sección") return 1;
              if (b === "Sin sección") return -1;
              return a.localeCompare(b);
            })
            .map(([sectionName, sectionFields]) => (
              <Card key={sectionName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{sectionName}</CardTitle>
                      <Badge variant="secondary">
                        {sectionFields.length} campo{sectionFields.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {sectionName !== "Sin sección" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteSection(sectionName)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sectionFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {/* Drag handle */}
                      <GripVertical className="h-5 w-5 text-muted-foreground" />

                      {/* Información del campo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{field.label}</p>
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">
                              Obligatorio
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {fieldTypeLabels[field.fieldType] || field.fieldType}
                          </Badge>
                          <span>•</span>
                          <Badge variant="secondary" className="text-xs">
                            {widthLabels[field.width || "full"] || "100%"}
                          </Badge>
                          <span>•</span>
                          <span className="text-xs">Orden: {field.order}</span>
                        </div>
                      </div>

                      {/* Selector de sección */}
                      <div className="w-[220px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Mover a sección
                        </Label>
                        <Select
                          value={field.section || "Sin sección"}
                          onValueChange={(value) =>
                            handleChangeSection(field.id, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sections.map((section) => (
                              <SelectItem key={section} value={section}>
                                {section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Tip */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            💡 <strong>Tip:</strong> Usa secciones para organizar tu formulario
            de manera lógica. Por ejemplo: "Datos Personales", "Dirección",
            "Detalle de la Reclamación".
          </p>
        </CardContent>
      </Card>

      {/* Delete Section Dialog */}
      <AlertDialog
        open={deleteSection !== null}
        onOpenChange={() => setDeleteSection(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sección?</AlertDialogTitle>
            <AlertDialogDescription>
              Los campos de esta sección se moverán a "Sin sección". Podrás
              asignarles una nueva sección después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSection && handleDeleteSection(deleteSection)}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Edit2,
  Loader2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Element {
  id: string;
  type: string;
  label: string;
  width: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
  otherLabel?: string;
}

interface Section {
  id: string;
  title: string;
  elements: Element[];
}

const ELEMENT_TYPES = [
  { id: "heading", label: "Título", icon: "H1" },
  { id: "text", label: "Texto", icon: "T" },
  { id: "email", label: "Email", icon: "@" },
  { id: "tel", label: "Teléfono", icon: "📞" },
  { id: "textarea", label: "Área de texto", icon: "¶" },
  { id: "select", label: "Selector", icon: "▼" },
  { id: "select_with_other", label: "Selector + Otro", icon: "▼+" },
  { id: "radio", label: "Radio", icon: "◉" },
  { id: "checkbox", label: "Checkbox", icon: "☑" },
  { id: "date", label: "Fecha", icon: "📅" },
];

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

export default function ConstructorEditablePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [editingElement, setEditingElement] = useState<Element | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<{
    type: string;
    fromSection?: string;
    elementId?: string;
  } | null>(null);

  // Cargar campos existentes
  useEffect(() => {
    loadExistingFields();
  }, []);

  const loadExistingFields = async () => {
    try {
      const response = await fetch("/api/admin/complaints/fields");
      const data = await response.json();

      if (data.success && data.fields.length > 0) {
        const fieldsBySection: Record<string, any[]> = {};

        data.fields.forEach((field: any) => {
          const section = field.section || "Sección Principal";
          if (!fieldsBySection[section]) {
            fieldsBySection[section] = [];
          }
          fieldsBySection[section].push(field);
        });

        const loadedSections: Section[] = Object.entries(fieldsBySection).map(
          ([sectionName, fields], index) => ({
            id: `section-${index}`,
            title: sectionName,
            elements: fields.map((field) => ({
              id: field.id,
              type: field.fieldType,
              label: field.label,
              width: field.width || "full",
              placeholder: field.placeholder || "",
              helpText: field.helpText || "",
              required: field.required,
              options: field.options || [],
              otherLabel: field.otherLabel || "",
            })),
          })
        );

        setSections(loadedSections);
      } else {
        setSections([
          {
            id: "section-0",
            title: "Sección Principal",
            elements: [],
          },
        ]);
      }
    } catch (error) {
      console.error("Error loading fields:", error);
      toast({
        title: "❌ Error",
        description: "Error al cargar campos existentes",
      });
      setSections([
        {
          id: "section-0",
          title: "Sección Principal",
          elements: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Agregar nueva sección
  const addSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: `Nueva Sección ${sections.length + 1}`,
      elements: [],
    };
    setSections([...sections, newSection]);
  };

  // Eliminar sección
  const removeSection = (sectionId: string) => {
    if (sections.length === 1) {
      toast({
        title: "❌ Error",
        description: "Debe haber al menos una sección",
      });
      return;
    }
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  // Editar nombre de sección
  const updateSectionTitle = (sectionId: string, newTitle: string) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s))
    );
    setEditingSectionId(null);
  };

  // Agregar elemento a sección
  const addElementToSection = (sectionId: string, elementType: string) => {
    const needsOptions =
      elementType === "select" ||
      elementType === "select_with_other" ||
      elementType === "radio";

    const newElement: Element = {
      id: `temp-${Date.now()}-${Math.random()}`,
      type: elementType,
      label: `Nuevo ${ELEMENT_TYPES.find((t) => t.id === elementType)?.label}`,
      width: "full",
      placeholder: "",
      helpText: "",
      required: false,
      options: needsOptions ? ["Opción 1", "Opción 2", "Opción 3"] : undefined,
      otherLabel: elementType === "select_with_other" ? "Otro" : undefined,
    };

    setSections(
      sections.map((section) =>
        section.id === sectionId
          ? { ...section, elements: [...section.elements, newElement] }
          : section
      )
    );

    toast({
      title: "✅ Campo agregado",
      description: `${newElement.label} agregado a ${
        sections.find((s) => s.id === sectionId)?.title
      }`,
    });
  };

  // Eliminar elemento
  const removeElement = (sectionId: string, elementId: string) => {
    setSections(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              elements: section.elements.filter((e) => e.id !== elementId),
            }
          : section
      )
    );
  };

  // Actualizar elemento
  const updateElement = (updatedElement: Element) => {
    setSections(
      sections.map((section) => ({
        ...section,
        elements: section.elements.map((element) =>
          element.id === updatedElement.id ? updatedElement : element
        ),
      }))
    );
    setEditingElement(null);
  };

  // Mover elemento entre secciones o dentro de la misma sección
  const moveElement = (
    elementId: string,
    fromSectionId: string,
    toSectionId: string,
    toIndex: number
  ) => {
    const fromSection = sections.find((s) => s.id === fromSectionId);
    const element = fromSection?.elements.find((e) => e.id === elementId);

    if (!element) return;

    // Eliminar del origen
    const updatedSections = sections.map((section) =>
      section.id === fromSectionId
        ? {
            ...section,
            elements: section.elements.filter((e) => e.id !== elementId),
          }
        : section
    );

    // Agregar al destino
    const finalSections = updatedSections.map((section) => {
      if (section.id === toSectionId) {
        const newElements = [...section.elements];
        newElements.splice(toIndex, 0, element);
        return { ...section, elements: newElements };
      }
      return section;
    });

    setSections(finalSections);
  };

  // Handlers de drag & drop
  const handleDragStart = (
    e: React.DragEvent,
    type: string,
    fromSection?: string,
    elementId?: string
  ) => {
    setDraggedElement({ type, fromSection, elementId });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, toSectionId: string, toIndex?: number) => {
    e.preventDefault();

    if (!draggedElement) return;

    // Caso 1: Arrastrar nuevo elemento del panel
    if (!draggedElement.fromSection && !draggedElement.elementId) {
      addElementToSection(toSectionId, draggedElement.type);
    }
    // Caso 2: Mover elemento existente
    else if (draggedElement.fromSection && draggedElement.elementId) {
      const targetIndex = toIndex ?? sections.find((s) => s.id === toSectionId)?.elements.length ?? 0;
      moveElement(
        draggedElement.elementId,
        draggedElement.fromSection,
        toSectionId,
        targetIndex
      );
    }

    setDraggedElement(null);
  };

  // Guardar formulario
  const handleSave = async () => {
    setSaving(true);

    try {
      const fieldsToSave: any[] = [];
      const fieldsToUpdate: any[] = [];
      let order = 0;

      sections.forEach((section) => {
        section.elements.forEach((element) => {
          const fieldData = {
            label: element.label,
            fieldType: element.type,
            section: section.title,
            width: element.width,
            placeholder: element.placeholder || undefined,
            helpText: element.helpText || undefined,
            required: element.required,
            options: element.options,
            otherLabel: element.otherLabel || undefined,
            order: order++,
          };

          if (element.id.startsWith("temp-")) {
            fieldsToSave.push(fieldData);
          } else {
            fieldsToUpdate.push({
              id: element.id,
              ...fieldData,
            });
          }
        });
      });

      // Crear nuevos campos
      for (const field of fieldsToSave) {
        await fetch("/api/admin/complaints/fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(field),
        });
      }

      // Actualizar campos existentes
      for (const field of fieldsToUpdate) {
        await fetch(`/api/admin/complaints/fields/${field.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(field),
        });
      }

      toast({
        title: "✅ Formulario guardado",
        description: `${fieldsToSave.length} nuevos, ${fieldsToUpdate.length} actualizados`,
      });

      router.push("/admin/libro-reclamaciones");
    } catch (error) {
      console.error("Error saving form:", error);
      toast({
        title: "❌ Error",
        description: "Error al guardar el formulario",
      });
    } finally {
      setSaving(false);
    }
  };

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
            <h1 className="text-3xl font-bold">Constructor Editable</h1>
            <p className="text-muted-foreground">
              Arrastra elementos para agregar o reorganizar campos
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

      <div className="grid grid-cols-12 gap-6">
        {/* Panel de elementos */}
        <div className="col-span-3">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Elementos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ELEMENT_TYPES.map((type) => (
                <div
                  key={type.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, type.id)}
                  className="flex items-center gap-2 p-3 border rounded-lg cursor-move hover:bg-slate-50 transition-colors active:opacity-50"
                >
                  <span className="text-lg">{type.icon}</span>
                  <span className="text-sm font-medium">{type.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Área de construcción */}
        <div className="col-span-9 space-y-4">
          {sections.map((section) => (
            <Card
              key={section.id}
              className="border-2 border-dashed"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, section.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  {editingSectionId === section.id ? (
                    <Input
                      autoFocus
                      value={section.title}
                      onChange={(e) =>
                        setSections(
                          sections.map((s) =>
                            s.id === section.id
                              ? { ...s, title: e.target.value }
                              : s
                          )
                        )
                      }
                      onBlur={() => setEditingSectionId(null)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && setEditingSectionId(null)
                      }
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <CardTitle>{section.title}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSectionId(section.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Badge variant="secondary">
                        {section.elements.length} campos
                      </Badge>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSection(section.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="min-h-[100px] space-y-2">
                {section.elements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Arrastra elementos aquí para agregarlos
                  </div>
                ) : (
                  section.elements.map((element, index) => (
                    <div
                      key={element.id}
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(e, element.type, section.id, element.id)
                      }
                      onDragOver={handleDragOver}
                      onDrop={(e) => {
                        e.stopPropagation();
                        handleDrop(e, section.id, index);
                      }}
                      className="flex items-center gap-2 p-3 border rounded-lg bg-white hover:border-slate-400 transition-colors cursor-move"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{element.label}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {fieldTypeLabels[element.type]}
                          </Badge>
                          <span>•</span>
                          <Badge variant="secondary" className="text-xs">
                            {widthLabels[element.width]}
                          </Badge>
                          {element.required && (
                            <>
                              <span>•</span>
                              <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100">
                                Obligatorio
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingElement(element);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeElement(section.id, element.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}

          <Button onClick={addSection} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Sección
          </Button>
        </div>
      </div>

      {/* Dialog de edición */}
      <Dialog
        open={editingElement !== null}
        onOpenChange={() => setEditingElement(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Campo</DialogTitle>
          </DialogHeader>
          {editingElement && (
            <ElementEditor
              element={editingElement}
              onSave={updateElement}
              onCancel={() => setEditingElement(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Editor de elemento
function ElementEditor({
  element,
  onSave,
  onCancel,
}: {
  element: Element;
  onSave: (element: Element) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(element);

  return (
    <div className="space-y-4">
      <div>
        <Label>Etiqueta</Label>
        <Input
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
        />
      </div>

      <div>
        <Label>Ancho</Label>
        <Select
          value={formData.width}
          onValueChange={(value) => setFormData({ ...formData, width: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Completo (100%)</SelectItem>
            <SelectItem value="half">Media (50%)</SelectItem>
            <SelectItem value="third">Tercio (33%)</SelectItem>
            <SelectItem value="quarter">Cuarto (25%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.type !== "heading" && (
        <>
          <div>
            <Label>Placeholder</Label>
            <Input
              value={formData.placeholder}
              onChange={(e) =>
                setFormData({ ...formData, placeholder: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Texto de ayuda</Label>
            <Input
              value={formData.helpText}
              onChange={(e) =>
                setFormData({ ...formData, helpText: e.target.value })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.required}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, required: checked })
              }
            />
            <Label>Campo obligatorio</Label>
          </div>
        </>
      )}

      {(formData.type === "select" ||
        formData.type === "select_with_other" ||
        formData.type === "radio") && (
        <div>
          <Label>Opciones (una por línea)</Label>
          <Textarea
            value={formData.options?.join("\n") || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                options: e.target.value.split("\n").filter(Boolean),
              })
            }
            rows={5}
          />
        </div>
      )}

      {formData.type === "select_with_other" && (
        <div>
          <Label>Etiqueta para "Otro"</Label>
          <Input
            value={formData.otherLabel}
            onChange={(e) =>
              setFormData({ ...formData, otherLabel: e.target.value })
            }
            placeholder="Otro"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={() => onSave(formData)} className="flex-1">
          Guardar
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
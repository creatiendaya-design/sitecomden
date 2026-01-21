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
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  { id: "heading", label: "Título", icon: "📝", description: "Título de sección" },
  { id: "text", label: "Texto", icon: "✏️", description: "Campo de texto corto" },
  { id: "email", label: "Email", icon: "📧", description: "Campo de email" },
  { id: "tel", label: "Teléfono", icon: "📞", description: "Campo de teléfono" },
  { id: "textarea", label: "Área de texto", icon: "📄", description: "Campo de texto largo" },
  { id: "select", label: "Selector", icon: "🔽", description: "Lista desplegable" },
  { id: "select_with_other", label: "Selector + Otro", icon: "🔽➕", description: "Lista con opción 'Otro'" },
  { id: "radio", label: "Radio", icon: "⭕", description: "Opciones únicas" },
  { id: "checkbox", label: "Checkbox", icon: "☑️", description: "Casillas de verificación" },
  { id: "date", label: "Fecha", icon: "📅", description: "Selector de fecha" },
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

export default function ConstructorMobileOptimized() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [editingElement, setEditingElement] = useState<Element | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Para drag & drop en desktop
  const [draggedElement, setDraggedElement] = useState<{
    type: string;
    fromSection?: string;
    elementId?: string;
  } | null>(null);

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
        if (loadedSections.length > 0) {
          setActiveSection(loadedSections[0].id);
        }
      } else {
        const initialSection = {
          id: "section-0",
          title: "Sección Principal",
          elements: [],
        };
        setSections([initialSection]);
        setActiveSection(initialSection.id);
      }
    } catch (error) {
      console.error("Error loading fields:", error);
      toast({
        title: "❌ Error",
        description: "Error al cargar campos existentes",
      });
    } finally {
      setLoading(false);
    }
  };

  const addSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: `Nueva Sección ${sections.length + 1}`,
      elements: [],
    };
    setSections([...sections, newSection]);
    setActiveSection(newSection.id);
  };

  const removeSection = (sectionId: string) => {
    if (sections.length === 1) {
      toast({
        title: "❌ Error",
        description: "Debe haber al menos una sección",
      });
      return;
    }
    setSections(sections.filter((s) => s.id !== sectionId));
    if (activeSection === sectionId) {
      setActiveSection(sections[0].id);
    }
  };

  const updateSectionTitle = (sectionId: string, newTitle: string) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s))
    );
    setEditingSectionId(null);
  };

  // NUEVA FUNCIÓN: Agregar elemento con tap (mobile-friendly)
  const addElementToSectionByTap = (elementType: string) => {
    if (!activeSection) {
      toast({
        title: "❌ Error",
        description: "Selecciona una sección primero",
      });
      return;
    }

    addElementToSection(activeSection, elementType);
    setSheetOpen(false); // Cerrar sheet después de agregar
  };

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
      description: `${newElement.label} agregado`,
    });
  };

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

  // Mover elemento arriba/abajo
  const moveElementUp = (sectionId: string, elementIndex: number) => {
    if (elementIndex === 0) return;

    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          const newElements = [...section.elements];
          [newElements[elementIndex - 1], newElements[elementIndex]] = [
            newElements[elementIndex],
            newElements[elementIndex - 1],
          ];
          return { ...section, elements: newElements };
        }
        return section;
      })
    );
  };

  const moveElementDown = (sectionId: string, elementIndex: number) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section || elementIndex === section.elements.length - 1) return;

    setSections(
      sections.map((s) => {
        if (s.id === sectionId) {
          const newElements = [...s.elements];
          [newElements[elementIndex], newElements[elementIndex + 1]] = [
            newElements[elementIndex + 1],
            newElements[elementIndex],
          ];
          return { ...s, elements: newElements };
        }
        return s;
      })
    );
  };

  // Drag & drop para desktop
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

    if (!draggedElement.fromSection && !draggedElement.elementId) {
      addElementToSection(toSectionId, draggedElement.type);
    }

    setDraggedElement(null);
  };

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

      for (const field of fieldsToSave) {
        await fetch("/api/admin/complaints/fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(field),
        });
      }

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
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/libro-reclamaciones">
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden sm:inline">Volver</span>
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold truncate">Constructor</h1>
            <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
              Toca para agregar campos en mobile, arrastra en desktop
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="w-full md:w-auto">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          <span className="hidden sm:inline">Guardar Cambios</span>
          <span className="sm:hidden">Guardar</span>
        </Button>
      </div>

      {/* Mobile: Bottom Sheet + FAB */}
      <div className="lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Agregar Campo</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona un tipo de campo para agregar
              </p>
            </SheetHeader>
            <div className="mt-6 space-y-2 overflow-y-auto max-h-[calc(80vh-120px)]">
              {ELEMENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => addElementToSectionByTap(type.id)}
                  className="w-full flex items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                >
                  <span className="text-2xl">{type.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Desktop: Sidebar con elementos */}
        <div className="hidden lg:block lg:col-span-3">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Elementos</CardTitle>
              <p className="text-xs text-muted-foreground">
                Arrastra para agregar
              </p>
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{type.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {type.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Área de construcción */}
        <div className="lg:col-span-9 space-y-3 md:space-y-4">
          {/* Selector de sección activa (mobile) */}
          <div className="lg:hidden">
            <Label className="text-sm mb-2 block">Sección activa</Label>
            <Select value={activeSection || ""} onValueChange={setActiveSection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title} ({section.elements.length} campos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sections.map((section) => (
            <Card
              key={section.id}
              className={`border-2 ${
                activeSection === section.id
                  ? "border-primary shadow-md"
                  : "border-dashed"
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, section.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
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
                      className="text-base md:text-lg font-semibold"
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CardTitle className="text-base md:text-lg truncate">
                        {section.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSectionId(section.id)}
                        className="flex-shrink-0 h-8 w-8 p-0"
                      >
                        <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {section.elements.length}
                      </Badge>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSection(section.id)}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="min-h-[80px] md:min-h-[100px] space-y-2">
                {section.elements.length === 0 ? (
                  <div className="text-center py-6 md:py-8 text-muted-foreground text-xs md:text-sm">
                    {activeSection === section.id ? (
                      <div>
                        <p className="font-medium">Sección activa</p>
                        <p className="lg:hidden mt-1">
                          Toca el botón + para agregar campos
                        </p>
                        <p className="hidden lg:block mt-1">
                          Arrastra elementos aquí
                        </p>
                      </div>
                    ) : (
                      <p>Vacío</p>
                    )}
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
                      className="flex items-center gap-2 p-2 md:p-3 border rounded-lg bg-white hover:border-slate-400 transition-colors"
                    >
                      {/* Desktop: drag handle */}
                      <GripVertical className="hidden lg:block h-5 w-5 text-muted-foreground flex-shrink-0 cursor-move" />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm md:text-base truncate">
                          {element.label}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 md:gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {fieldTypeLabels[element.type]}
                          </Badge>
                          <span className="hidden sm:inline">•</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {widthLabels[element.width]}
                          </Badge>
                          {element.required && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <Badge className="text-[10px] bg-red-100 text-red-700 hover:bg-red-100">
                                Req
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Mobile: Up/Down buttons */}
                      <div className="flex lg:hidden gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveElementUp(section.id, index)}
                          disabled={index === 0}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveElementDown(section.id, index)}
                          disabled={index === section.elements.length - 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Edit & Delete buttons */}
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingElement(element);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeElement(section.id, element.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}

          <Button onClick={addSection} variant="outline" className="w-full" size="sm">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

      <div className="flex flex-col sm:flex-row gap-2 pt-4">
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
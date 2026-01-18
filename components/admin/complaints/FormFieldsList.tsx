"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { deleteFormField, updateFormField } from "@/actions/complaints";
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
  placeholder?: string;
  helpText?: string;
  required: boolean;
  order: number;
  options?: string[];
  active: boolean;
  section?: string; // ← AGREGADO ✨
  width?: string;   // ← AGREGADO ✨
}

interface FormFieldsListProps {
  fields: FormField[];
}

// ACTUALIZADO con select_with_other ✨
const fieldTypeLabels: Record<string, string> = {
  heading: "Título",
  text: "Texto",
  email: "Email",
  tel: "Teléfono",
  textarea: "Área de texto",
  select: "Selector",
  select_with_other: "Selector + Otro", // ← AGREGADO ✨
  radio: "Radio",
  checkbox: "Checkbox",
  date: "Fecha",
};

// Opciones de ancho ✨
const widthLabels: Record<string, string> = {
  full: "100%",
  half: "50%",
  third: "33%",
  quarter: "25%",
  "two-thirds": "67%",
};

export default function FormFieldsList({ fields }: FormFieldsListProps) {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setLoading(id);
    const result = await updateFormField(id, { active: !currentActive });

    if (result.success) {
      toast({
        title: currentActive ? "Campo desactivado" : "Campo activado",
        description: "El campo se actualizó correctamente",
      });
      window.location.reload();
    } else {
      toast({
        title: "Error",
        description: result.error || "Error al actualizar campo",
        variant: "destructive",
      });
    }
    setLoading(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setLoading(deleteId);
    const result = await deleteFormField(deleteId);

    if (result.success) {
      toast({
        title: "Campo eliminado",
        description: "El campo se eliminó correctamente",
      });
      setDeleteId(null);
      window.location.reload();
    } else {
      toast({
        title: "Error",
        description: result.error || "Error al eliminar campo",
        variant: "destructive",
      });
    }
    setLoading(null);
  };

  if (fields.length === 0) {
    return null;
  }

  // Agrupar campos por sección ✨
  const fieldsBySection = fields.reduce((acc, field) => {
    const section = field.section || "Sin sección";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FormField[]>);

  return (
    <>
      <div className="space-y-6">
        {/* Mostrar agrupado por sección ✨ */}
        {Object.entries(fieldsBySection).map(([sectionName, sectionFields]) => (
          <div key={sectionName} className="space-y-2">
            {/* Encabezado de sección */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
              <h3 className="font-semibold text-slate-700">{sectionName}</h3>
              <Badge variant="secondary">{sectionFields.length} campos</Badge>
            </div>

            {/* Tabla de campos */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Orden</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ancho</TableHead> {/* ← AGREGADO ✨ */}
                    <TableHead className="text-center">Obligatorio</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{field.order}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{field.label}</p>
                          {field.placeholder && (
                            <p className="text-sm text-muted-foreground">
                              {field.placeholder}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {fieldTypeLabels[field.fieldType] || field.fieldType}
                        </Badge>
                      </TableCell>
                      {/* Columna Ancho ✨ */}
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {widthLabels[field.width || "full"] || "100%"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {field.required ? (
                          <Badge variant="default">Sí</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {field.active ? (
                          <Badge className="bg-green-100 text-green-700">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(field.id, field.active)}
                            disabled={loading === field.id}
                          >
                            {field.active ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/admin/libro-reclamaciones/campos/${field.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(field.id)}
                            disabled={loading === field.id}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar campo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El campo será eliminado
              permanentemente del formulario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
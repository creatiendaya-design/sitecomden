"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createRole, getAllPermissions } from "@/actions/roles";
import { toast } from "sonner";
import PermissionSelector from "@/components/admin/PermissionSelector";

export default function NewRolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [permissionsGrouped, setPermissionsGrouped] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    level: 50,
    color: "#6366f1",
    active: true,
    permissionIds: [] as string[],
  });

  // Cargar permisos al montar
  useEffect(() => {
    async function loadPermissions() {
      const result = await getAllPermissions();
      if (result.success && result.grouped) {
        setPermissionsGrouped(result.grouped);
      }
    }
    loadPermissions();
  }, []);

  // Auto-generar slug desde el nombre
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createRole(formData);

      if (result.success) {
        toast.success("Rol creado exitosamente");
        router.push("/admin/configuracion/roles");
      } else {
        toast.error(result.error || "Error al crear el rol");
      }
    } catch (error) {
      toast.error("Error al crear el rol");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/admin/configuracion/roles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Crear Nuevo Rol</h1>
        <p className="text-muted-foreground mt-1">
          Define un nuevo rol con permisos personalizados
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
            <CardDescription>
              Configuración general del rol
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre del Rol <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="ej: Vendedor"
                required
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="ej: vendedor"
                required
              />
              <p className="text-xs text-muted-foreground">
                Identificador único del rol (auto-generado desde el nombre)
              </p>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="ej: Personal de ventas con acceso limitado"
                rows={3}
              />
            </div>

            {/* Nivel y Color */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="level">
                  Nivel de Jerarquía <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="level"
                  type="number"
                  min="0"
                  max="99"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  0-99 (roles del sistema: 100)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permisos */}
        <Card>
          <CardHeader>
            <CardTitle>Permisos</CardTitle>
            <CardDescription>
              Selecciona los permisos que tendrá este rol
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(permissionsGrouped).length > 0 ? (
              <PermissionSelector
                permissionsGrouped={permissionsGrouped}
                selectedPermissionIds={formData.permissionIds}
                onChange={(permissionIds) => setFormData({ ...formData, permissionIds })}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Cargando permisos...</p>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/configuracion/roles">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Creando..." : "Crear Rol"}
          </Button>
        </div>
      </form>
    </div>
  );
}
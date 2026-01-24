"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Copy } from "lucide-react";
import Link from "next/link";
import { updateRole, getRoleById, getAllPermissions, duplicateRole } from "@/actions/roles";
import { toast } from "sonner";
import PermissionSelector from "@/components/admin/PermissionSelector";
import { Switch } from "@/components/ui/switch";

interface EditRolePageProps {
  params: Promise<{ id: string }>;
}

export default function EditRolePage({ params: paramsPromise }: EditRolePageProps) {
  const router = useRouter();
  const [params, setParams] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
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
  const [roleInfo, setRoleInfo] = useState<{
    isSystem: boolean;
    userCount: number;
  }>({ isSystem: false, userCount: 0 });

  // Resolver params
  useEffect(() => {
    paramsPromise.then(setParams);
  }, [paramsPromise]);

  // Cargar datos
  useEffect(() => {
    if (!params?.id) return;

    async function loadData() {
      if (!params) return; // Verificación adicional para TypeScript
      
      try {
        // Cargar rol y permisos en paralelo
        const [roleResult, permissionsResult] = await Promise.all([
          getRoleById(params.id),
          getAllPermissions(),
        ]);

        if (!roleResult.success || !roleResult.role) {
          toast.error(roleResult.error || "Rol no encontrado");
          router.push("/admin/configuracion/roles");
          return;
        }

        if (!permissionsResult.success || !permissionsResult.grouped) {
          toast.error("Error al cargar permisos");
          return;
        }

        const role = roleResult.role;
        setRoleInfo({
          isSystem: role.isSystem,
          userCount: role._count.users,
        });

        setFormData({
          name: role.name,
          slug: role.slug,
          description: role.description || "",
          level: role.level,
          color: role.color || "#6366f1",
          active: role.active,
          permissionIds: role.permissions.map((rp) => rp.permissionId),
        });

        setPermissionsGrouped(permissionsResult.grouped);
      } catch (error) {
        toast.error("Error al cargar datos");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params?.id) return;

    setSaving(true);

    try {
      const result = await updateRole(params.id, formData);

      if (result.success) {
        toast.success("Rol actualizado exitosamente");
        router.push("/admin/configuracion/roles");
      } else {
        toast.error(result.error || "Error al actualizar el rol");
      }
    } catch (error) {
      toast.error("Error al actualizar el rol");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!params?.id) return;

    setDuplicating(true);

    try {
      const result = await duplicateRole(params.id);

      if (result.success) {
        toast.success("Rol duplicado exitosamente");
        router.push("/admin/configuracion/roles");
      } else {
        toast.error(result.error || "Error al duplicar el rol");
      }
    } catch (error) {
      toast.error("Error al duplicar el rol");
    } finally {
      setDuplicating(false);
    }
  };

  if (loading || !params) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

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
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-bold">Editar Rol</h1>
          {roleInfo.isSystem && (
            <Badge variant="secondary">Sistema</Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          Modifica los permisos y configuración del rol
        </p>
      </div>

      {/* Advertencia para roles del sistema */}
      {roleInfo.isSystem && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800">
              ⚠️ Este es un rol del sistema. No se puede editar su información básica,
              solo los permisos asignados.
            </p>
          </CardContent>
        </Card>
      )}

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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ej: Vendedor"
                required
                disabled={roleInfo.isSystem}
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
                disabled={roleInfo.isSystem}
              />
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
                disabled={roleInfo.isSystem}
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
                  disabled={roleInfo.isSystem}
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
                    disabled={roleInfo.isSystem}
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1"
                    disabled={roleInfo.isSystem}
                  />
                </div>
              </div>
            </div>

            {/* Estado Activo */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="active">Estado del Rol</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.active ? "Activo y disponible" : "Desactivado"}
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                disabled={roleInfo.isSystem}
              />
            </div>

            {/* Info de usuarios */}
            {roleInfo.userCount > 0 && (
              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                ℹ️ Este rol está asignado a {roleInfo.userCount} usuario(s)
              </div>
            )}
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
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleDuplicate}
            disabled={duplicating}
          >
            <Copy className="mr-2 h-4 w-4" />
            {duplicating ? "Duplicando..." : "Duplicar Rol"}
          </Button>

          <div className="flex gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/configuracion/roles">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
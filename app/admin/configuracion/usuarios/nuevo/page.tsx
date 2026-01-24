"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { createUser } from "@/actions/users";
import { getRoles } from "@/actions/roles";
import { toast } from "sonner";

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    active: true,
  });

  // Cargar roles al montar
  useEffect(() => {
    async function loadRoles() {
      const result = await getRoles();
      if (result.success && result.roles) {
        // Filtrar solo roles activos
        const activeRoles = result.roles.filter(r => r.active);
        setRoles(activeRoles);
      }
    }
    loadRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createUser({
        ...formData,
        roleId: formData.roleId || null,
      });

      if (result.success) {
        toast.success("Usuario creado exitosamente");
        router.push("/admin/configuracion/usuarios");
      } else {
        toast.error(result.error || "Error al crear el usuario");
      }
    } catch (error) {
      toast.error("Error al crear el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/admin/configuracion/usuarios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Crear Nuevo Usuario</h1>
        <p className="text-muted-foreground mt-1">
          Crea un nuevo usuario administrador con acceso al panel
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Usuario</CardTitle>
            <CardDescription>
              Datos personales y credenciales de acceso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ej: Juan Pérez"
                required
                autoFocus
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ej: juan@shopgood.pe"
                required
              />
              <p className="text-xs text-muted-foreground">
                El usuario usará este email para iniciar sesión
              </p>
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Contraseña <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 6 caracteres
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rol y Permisos */}
        <Card>
          <CardHeader>
            <CardTitle>Rol y Permisos</CardTitle>
            <CardDescription>
              Asigna un rol para definir los permisos del usuario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selector de Rol */}
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Seleccionar rol (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin rol asignado</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: role.color || "#6366f1" }}
                        />
                        <span>{role.name}</span>
                        {role.isSystem && (
                          <span className="text-xs text-muted-foreground">(Sistema)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                El rol define los permisos base del usuario. Puedes asignar permisos
                personalizados después de crear el usuario.
              </p>
            </div>

            {/* Vista previa del rol seleccionado */}
            {formData.roleId && roles.length > 0 && (
              <div className="rounded-lg border p-4 space-y-2">
                {(() => {
                  const selectedRole = roles.find(r => r.id === formData.roleId);
                  return selectedRole ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: selectedRole.color || "#6366f1" }}
                        />
                        <h4 className="font-semibold">{selectedRole.name}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedRole.description || "Sin descripción"}
                      </p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>Nivel: {selectedRole.level}</span>
                        <span>•</span>
                        <span>{selectedRole.permissions.length} permisos</span>
                      </div>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado */}
        <Card>
          <CardHeader>
            <CardTitle>Estado del Usuario</CardTitle>
            <CardDescription>
              Controla si el usuario puede acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="active">Usuario Activo</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.active 
                    ? "El usuario podrá iniciar sesión"
                    : "El usuario no podrá acceder al sistema"}
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/configuracion/usuarios">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Creando..." : "Crear Usuario"}
          </Button>
        </div>
      </form>
    </div>
  );
}
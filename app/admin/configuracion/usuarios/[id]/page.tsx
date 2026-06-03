"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Eye, EyeOff, Shield, Key, Calendar } from "lucide-react";
import Link from "next/link";
import { updateUser, getUserById, changeUserPassword } from "@/actions/users";
import { getRoles, getAllPermissions } from "@/actions/roles";
import { toast } from "sonner";
import type { Permission } from "@prisma/client";

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  level: number;
  color: string | null;
  active: boolean;
  isSystem: boolean;
  permissions: unknown[];
}
import CustomPermissionsManager from "@/components/admin/CustomPermissionsManager";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default function EditUserPage({ params: paramsPromise }: EditUserPageProps) {
  const router = useRouter();
  const [params, setParams] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    roleId: "",
    active: true,
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [userData, setUserData] = useState<Awaited<ReturnType<typeof getUserById>>["user"]>(null);

  // Resolver params
  useEffect(() => {
    paramsPromise.then(setParams);
  }, [paramsPromise]);

  // Cargar datos
  useEffect(() => {
    if (!params?.id) return;

    async function loadData() {
      if (!params) return;

      try {
        const [userResult, rolesResult, permissionsResult] = await Promise.all([
          getUserById(params.id),
          getRoles(),
          getAllPermissions(),
        ]);

        if (!userResult.success || !userResult.user) {
          toast.error(userResult.error || "Usuario no encontrado");
          router.push("/admin/configuracion/usuarios");
          return;
        }

        if (!rolesResult.success || !rolesResult.roles) {
          toast.error("Error al cargar roles");
          return;
        }

        if (!permissionsResult.success || !permissionsResult.permissions) {
          toast.error("Error al cargar permisos");
          return;
        }

        const user = userResult.user;
        setUserData(user);
        setFormData({
          name: user.name,
          email: user.email,
          roleId: user.roleId || "",
          active: user.active,
        });

        setRoles(rolesResult.roles.filter((r) => r.active) as RoleOption[]);
        setPermissions(permissionsResult.permissions);
      } catch {
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
      const result = await updateUser(params.id, {
        ...formData,
        roleId: formData.roleId || null,
      });

      if (result.success) {
        toast.success("Usuario actualizado exitosamente");
        // Recargar datos
        const userResult = await getUserById(params.id);
        if (userResult.success && userResult.user) {
          setUserData(userResult.user);
        }
      } else {
        toast.error(result.error || "Error al actualizar el usuario");
      }
    } catch {
      toast.error("Error al actualizar el usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params?.id) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSaving(true);

    try {
      const result = await changeUserPassword(params.id, passwordData.newPassword);

      if (result.success) {
        toast.success("Contraseña actualizada exitosamente");
        setPasswordData({ newPassword: "", confirmPassword: "" });
      } else {
        toast.error(result.error || "Error al cambiar la contraseña");
      }
    } catch {
      toast.error("Error al cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading || !params || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0 pb-24 sm:pb-0">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/admin/configuracion/usuarios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <div className="flex items-center gap-3 sm:gap-4">
          <Avatar className="h-12 w-12 sm:h-16 sm:w-16 shrink-0">
            <AvatarFallback
              style={{
                backgroundColor: userData.role?.color || "#6366f1",
                color: "white",
              }}
              className="text-base sm:text-xl"
            >
              {getInitials(userData.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl font-bold truncate">{userData.name}</h1>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
              <p className="text-xs sm:text-base text-muted-foreground truncate">
                {userData.email}
              </p>
              {!userData.active && (
                <Badge variant="outline" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1.5">
                  Inactivo
                </Badge>
              )}
              {userData.role && (
                <Badge
                  className="text-[10px] sm:text-xs h-4 sm:h-5 px-1.5"
                  style={{
                    backgroundColor: userData.role.color || "#6366f1",
                    color: "white",
                  }}
                >
                  {userData.role.name}
                </Badge>
              )}
              {!userData.role && (
                <Badge variant="destructive" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1.5">
                  Sin Rol
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards - compact 3 cols mobile */}
      <div className="grid gap-2 sm:gap-4 grid-cols-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-sm text-muted-foreground mb-1">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Acceso</span>
            </div>
            <p className="font-semibold text-xs sm:text-base truncate">
              {userData.lastLogin
                ? formatDistanceToNow(new Date(userData.lastLogin), {
                    addSuffix: true,
                    locale: es,
                  })
                : "Nunca"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-sm text-muted-foreground mb-1">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Rol</span>
            </div>
            <p className="font-semibold text-xs sm:text-base truncate">
              {userData.role?.name || "Sin rol"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-sm text-muted-foreground mb-1">
              <Key className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Permisos</span>
            </div>
            <p className="font-semibold text-xs sm:text-base tabular-nums">
              {userData.customPermissions.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full sm:w-auto h-auto sm:h-10 p-1 grid grid-cols-3 sm:flex">
          <TabsTrigger value="general" className="text-xs sm:text-sm py-1.5">
            <span className="hidden sm:inline">Información General</span>
            <span className="sm:hidden">General</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="text-xs sm:text-sm py-1.5">
            Permisos
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm py-1.5">
            <span className="hidden sm:inline">Seguridad</span>
            <span className="sm:hidden">Clave</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Información General */}
        <TabsContent value="general" className="space-y-4 sm:space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Usuario</CardTitle>
                <CardDescription>
                  Información básica y de contacto
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
                    required
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
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rol y Permisos Base</CardTitle>
                <CardDescription>
                  Cambia el rol para modificar los permisos base del usuario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selector de Rol */}
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select
                    value={formData.roleId || undefined}
                    onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Sin rol asignado" />
                    </SelectTrigger>
                    <SelectContent>
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
                    Los permisos personalizados (tab &quot;Permisos&quot;) sobrescriben el rol
                  </p>
                </div>

                {/* Vista previa del rol */}
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

            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
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
                        ? "El usuario puede iniciar sesión"
                        : "El usuario no puede acceder al sistema"}
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

            <div className="hidden sm:flex justify-end gap-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/configuracion/usuarios">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>

            {/* Sticky bottom save bar — mobile only */}
            <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur px-3 py-2.5 flex gap-2 shadow-lg">
              <Button
                type="button"
                variant="outline"
                asChild
                className="flex-1 h-10"
              >
                <Link href="/admin/configuracion/usuarios">Cancelar</Link>
              </Button>
              <Button type="submit" className="flex-1 h-10" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Tab: Permisos */}
        <TabsContent value="permissions" className="space-y-4 sm:space-y-6">
          {params && (
            <CustomPermissionsManager
              userId={params.id}
              currentRole={userData.role}
              customPermissions={userData.customPermissions as unknown as { id: string; permissionId: string; type: "GRANT" | "DENY"; permission: { id: string; key: string; module: string; action: string; name?: string; description?: string } }[]}
              allPermissions={permissions as unknown as { id: string; key: string; module: string; action: string; name?: string; description?: string }[]}
            />
          )}
        </TabsContent>

        {/* Tab: Seguridad */}
        <TabsContent value="security" className="space-y-4 sm:space-y-6">
          <form onSubmit={handleChangePassword} className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>
                  Establece una nueva contraseña para el usuario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nueva contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    Nueva Contraseña <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
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

                {/* Confirmar contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirmar Contraseña <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                <Key className="mr-2 h-4 w-4" />
                {saving ? "Cambiando..." : "Cambiar Contraseña"}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
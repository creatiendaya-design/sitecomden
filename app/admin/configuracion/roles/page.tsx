import { getRoles } from "@/actions/roles";
import { hasPermission } from "@/lib/permissions";
import { getCurrentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Shield, Users, Edit, Copy } from "lucide-react";
import DeleteRoleButton from "@/components/admin/DeleteRoleButton";
import ToggleRoleButton from "@/components/admin/ToggleRoleButton";

export default async function RolesPage() {
  const userId = await getCurrentUserId();

  // Verificar permiso
  const canView = await hasPermission(userId, "users:view");
  if (!canView) {
    redirect("/admin/dashboard");
  }

  const canManage = await hasPermission(userId, "users:manage_roles");

  // Obtener roles
  const result = await getRoles();
  const roles = result.success ? result.roles : [];

  // Estadísticas
  const totalRoles = roles.length;
  const totalUsers = roles.reduce((acc, role) => acc + role._count.users, 0);
  const systemRoles = roles.filter(r => r.isSystem).length;
  const activeRoles = roles.filter(r => r.active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Roles</h1>
          <p className="text-muted-foreground mt-1">
            Administra roles y permisos del sistema
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/admin/configuracion/roles/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Crear Rol
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRoles}</p>
                <p className="text-sm text-muted-foreground">Roles Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Usuarios Asignados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-500/10 p-3">
                <Shield className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{systemRoles}</p>
                <p className="text-sm text-muted-foreground">Roles del Sistema</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <Shield className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeRoles}</p>
                <p className="text-sm text-muted-foreground">Roles Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Roles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.length === 0 ? (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">No hay roles</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Crea el primer rol para comenzar
              </p>
              {canManage && (
                <Button asChild className="mt-4">
                  <Link href="/admin/configuracion/roles/nuevo">
                    Crear Primer Rol
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          roles.map((role) => (
            <Card key={role.id} className={!role.active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: role.color || "#6366f1" }}
                    />
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    {role.isSystem && (
                      <Badge variant="secondary" className="text-xs">
                        Sistema
                      </Badge>
                    )}
                    {!role.active && (
                      <Badge variant="outline" className="text-xs">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {role.description || "Sin descripción"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats del rol */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-bold">{role.level}</p>
                    <p className="text-xs text-muted-foreground">Nivel</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-bold">{role.permissions.length}</p>
                    <p className="text-xs text-muted-foreground">Permisos</p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-lg font-bold">{role._count.users}</p>
                    <p className="text-xs text-muted-foreground">Usuarios</p>
                  </div>
                </div>

                {/* Acciones */}
                {canManage ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/admin/configuracion/roles/${role.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </Button>
                    {!role.isSystem && (
                      <>
                        <ToggleRoleButton roleId={role.id} isActive={role.active} />
                        <DeleteRoleButton
                          roleId={role.id}
                          roleName={role.name}
                          userCount={role._count.users}
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/admin/configuracion/roles/${role.id}`}>
                      Ver Detalles
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
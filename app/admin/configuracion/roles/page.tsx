export const dynamic = "force-dynamic";

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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Gestión de Roles</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Administra roles y permisos del sistema
          </p>
        </div>
        {canManage && (
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/admin/configuracion/roles/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Crear Rol
            </Link>
          </Button>
        )}
      </div>

      {/* Mobile primary CTA */}
      {canManage && (
        <Button asChild className="sm:hidden w-full">
          <Link href="/admin/configuracion/roles/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Crear Rol
          </Link>
        </Button>
      )}

      {/* Stats - 2 cols on mobile to fit all 4 in one screen */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="rounded-lg bg-primary/10 p-1.5 sm:p-3 shrink-0">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">
                  {totalRoles}
                </p>
                <p className="text-[11px] sm:text-sm text-muted-foreground mt-1 truncate">
                  Roles Totales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="rounded-lg bg-blue-500/10 p-1.5 sm:p-3 shrink-0">
                <Users className="h-4 w-4 sm:h-6 sm:w-6 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">
                  {totalUsers}
                </p>
                <p className="text-[11px] sm:text-sm text-muted-foreground mt-1 truncate">
                  Usuarios
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="rounded-lg bg-purple-500/10 p-1.5 sm:p-3 shrink-0">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-purple-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">
                  {systemRoles}
                </p>
                <p className="text-[11px] sm:text-sm text-muted-foreground mt-1 truncate">
                  Sistema
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="rounded-lg bg-green-500/10 p-1.5 sm:p-3 shrink-0">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">
                  {activeRoles}
                </p>
                <p className="text-[11px] sm:text-sm text-muted-foreground mt-1 truncate">
                  Activos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Roles */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
            <div key={role.id}>
              {/* ============ MOBILE: compact row ============ */}
              <div
                className={`sm:hidden flex items-center gap-2 rounded-lg border bg-card pl-3 pr-2 py-2.5 ${
                  !role.active ? "opacity-60" : ""
                }`}
              >
                <Link
                  href={`/admin/configuracion/roles/${role.id}`}
                  className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-70"
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: role.color || "#6366f1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm truncate">
                        {role.name}
                      </span>
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 leading-none">
                          Sistema
                        </Badge>
                      )}
                      {!role.active && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 leading-none">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {role.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                      Nivel {role.level} · {role.permissions.length} permisos ·{" "}
                      {role._count.users} usuario
                      {role._count.users !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
                {canManage && !role.isSystem && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <ToggleRoleButton roleId={role.id} isActive={role.active} />
                    <DeleteRoleButton
                      roleId={role.id}
                      roleName={role.name}
                      userCount={role._count.users}
                    />
                  </div>
                )}
              </div>

              {/* ============ DESKTOP: card with stat boxes ============ */}
              <Card
                className={`hidden sm:block ${!role.active ? "opacity-60" : ""}`}
              >
                <CardHeader className="px-6 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: role.color || "#6366f1" }}
                      />
                      <CardTitle className="text-lg truncate">
                        {role.name}
                      </CardTitle>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          Sistema
                        </Badge>
                      )}
                      {!role.active && (
                        <Badge variant="outline" className="text-xs h-5 px-1.5">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2 text-sm mt-1">
                    {role.description || "Sin descripción"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted px-1 py-2">
                      <p className="text-lg font-bold tabular-nums leading-none">
                        {role.level}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Nivel</p>
                    </div>
                    <div className="rounded-lg bg-muted px-1 py-2">
                      <p className="text-lg font-bold tabular-nums leading-none">
                        {role.permissions.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Permisos
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted px-1 py-2">
                      <p className="text-lg font-bold tabular-nums leading-none">
                        {role._count.users}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Usuarios
                      </p>
                    </div>
                  </div>

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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
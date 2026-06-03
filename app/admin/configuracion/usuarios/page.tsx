export const dynamic = "force-dynamic";

import { getUsers } from "@/actions/users";
import { getRoles } from "@/actions/roles";
import { hasPermission } from "@/lib/permissions";
import { getCurrentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Users, Shield, Power, Edit, Mail, Calendar } from "lucide-react";
import DeleteUserButton from "@/components/admin/DeleteUserButton";
import ToggleUserButton from "@/components/admin/ToggleUserButton";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default async function UsersPage() {
  const userId = await getCurrentUserId();

  // Verificar permiso
  const canView = await hasPermission(userId, "users:view");
  if (!canView) {
    redirect("/admin/dashboard");
  }

  const canCreate = await hasPermission(userId, "users:create");
  const canEdit = await hasPermission(userId, "users:edit");
  const canDelete = await hasPermission(userId, "users:delete");

  // Obtener usuarios y roles
  const [usersResult, rolesResult] = await Promise.all([
    getUsers(),
    getRoles(),
  ]);

  const users = usersResult.success ? usersResult.users : [];
  const roles = rolesResult.success ? rolesResult.roles : [];

  // Estadísticas
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active).length;
  const usersWithoutRole = users.filter(u => !u.roleId).length;

  // Obtener iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Usuarios Admin</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestiona los usuarios con acceso al panel administrativo
          </p>
        </div>
        {canCreate && (
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/admin/configuracion/usuarios/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Link>
          </Button>
        )}
      </div>

      {/* Mobile primary CTA */}
      {canCreate && (
        <Button asChild className="sm:hidden w-full">
          <Link href="/admin/configuracion/usuarios/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Link>
        </Button>
      )}

      {/* Stats - 2 cols on mobile */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="rounded-lg bg-primary/10 p-1.5 sm:p-3 shrink-0">
                <Users className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">
                  {totalUsers}
                </p>
                <p className="text-[11px] sm:text-sm text-muted-foreground mt-1 truncate">
                  Totales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="rounded-lg bg-green-500/10 p-1.5 sm:p-3 shrink-0">
                <Power className="h-4 w-4 sm:h-6 sm:w-6 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">
                  {activeUsers}
                </p>
                <p className="text-[11px] sm:text-sm text-muted-foreground mt-1 truncate">
                  Activos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="rounded-lg bg-blue-500/10 p-1.5 sm:p-3 shrink-0">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">
                  {roles.length}
                </p>
                <p className="text-[11px] sm:text-sm text-muted-foreground mt-1 truncate">
                  Roles
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2.5 sm:gap-4">
              <div className="rounded-lg bg-orange-500/10 p-1.5 sm:p-3 shrink-0">
                <Users className="h-4 w-4 sm:h-6 sm:w-6 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">
                  {usersWithoutRole}
                </p>
                <p className="text-[11px] sm:text-sm text-muted-foreground mt-1 truncate">
                  Sin rol
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Usuarios */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">
            Usuarios Registrados
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Todos los usuarios con acceso al panel administrativo
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {users.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">No hay usuarios</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Crea el primer usuario administrador
              </p>
              {canCreate && (
                <Button asChild className="mt-4">
                  <Link href="/admin/configuracion/usuarios/nuevo">
                    Crear Primer Usuario
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y sm:divide-y-0 sm:space-y-3">
              {users.map((user) => (
                <div key={user.id}>
                  {/* ============ MOBILE: compact row ============ */}
                  <div
                    className={`sm:hidden flex items-center gap-2 px-3 py-2.5 ${
                      !user.active ? "opacity-60" : ""
                    }`}
                  >
                    <Link
                      href={
                        canEdit || canDelete
                          ? `/admin/configuracion/usuarios/${user.id}`
                          : `/admin/configuracion/usuarios/${user.id}`
                      }
                      className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-70"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback
                          style={{
                            backgroundColor: user.role?.color || "#6366f1",
                            color: "white",
                          }}
                          className="text-xs"
                        >
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm truncate">
                            {user.name}
                          </span>
                          {user.id === userId && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 leading-none">
                              Tú
                            </Badge>
                          )}
                          {!user.active && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 leading-none">
                              Inactivo
                            </Badge>
                          )}
                          {user.role ? (
                            <Badge
                              className="text-[10px] h-4 px-1.5 leading-none"
                              style={{
                                backgroundColor: user.role.color || "#6366f1",
                                color: "white",
                              }}
                            >
                              {user.role.name}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1.5 leading-none">
                              Sin Rol
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {user.email}
                        </p>
                        {(user.lastLogin || user.customPermissions.length > 0) && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {user.lastLogin && (
                              <>
                                Acceso{" "}
                                {formatDistanceToNow(new Date(user.lastLogin), {
                                  addSuffix: true,
                                  locale: es,
                                })}
                              </>
                            )}
                            {user.lastLogin && user.customPermissions.length > 0 && " · "}
                            {user.customPermissions.length > 0 && (
                              <>{user.customPermissions.length} permisos custom</>
                            )}
                          </p>
                        )}
                      </div>
                    </Link>
                    {(canEdit || canDelete) && user.id !== userId && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {canEdit && (
                          <ToggleUserButton userId={user.id} isActive={user.active} />
                        )}
                        {canDelete && (
                          <DeleteUserButton
                            userId={user.id}
                            userName={user.name}
                            isSuperAdmin={user.role?.level === 100}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* ============ DESKTOP: original ============ */}
                  <div
                    className={`hidden sm:flex sm:items-center gap-4 rounded-lg border p-4 ${
                      !user.active ? "opacity-60" : ""
                    }`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback
                        style={{
                          backgroundColor: user.role?.color || "#6366f1",
                          color: "white",
                        }}
                      >
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{user.name}</h3>
                        {user.id === userId && (
                          <Badge variant="secondary" className="text-xs">
                            Tú
                          </Badge>
                        )}
                        {!user.active && (
                          <Badge variant="outline" className="text-xs">
                            Inactivo
                          </Badge>
                        )}
                        {user.role && (
                          <Badge
                            variant="default"
                            className="text-xs"
                            style={{ backgroundColor: user.role.color || "#6366f1" }}
                          >
                            {user.role.name}
                          </Badge>
                        )}
                        {!user.role && (
                          <Badge variant="destructive" className="text-xs">
                            Sin Rol
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-row items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        {user.lastLogin && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Último acceso:{" "}
                            {formatDistanceToNow(new Date(user.lastLogin), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </div>
                        )}
                        {user.customPermissions.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {user.customPermissions.length} permisos personalizados
                          </Badge>
                        )}
                      </div>
                    </div>

                    {(canEdit || canDelete) && (
                      <div className="flex gap-2">
                        {canEdit && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/configuracion/usuarios/${user.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </Button>
                        )}
                        {user.id !== userId && (
                          <>
                            {canEdit && (
                              <ToggleUserButton userId={user.id} isActive={user.active} />
                            )}
                            {canDelete && (
                              <DeleteUserButton
                                userId={user.id}
                                userName={user.name}
                                isSuperAdmin={user.role?.level === 100}
                              />
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {!canEdit && !canDelete && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/configuracion/usuarios/${user.id}`}>
                          Ver Detalles
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
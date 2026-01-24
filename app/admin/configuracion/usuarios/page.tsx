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
import { Plus, Users, Shield, Power, Edit, Trash2, Mail, Calendar } from "lucide-react";
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
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Usuarios Admin</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los usuarios con acceso al panel administrativo
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/admin/configuracion/usuarios/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
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
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Usuarios Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <Power className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeUsers}</p>
                <p className="text-sm text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roles.length}</p>
                <p className="text-sm text-muted-foreground">Roles Disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-orange-500/10 p-3">
                <Users className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usersWithoutRole}</p>
                <p className="text-sm text-muted-foreground">Sin Rol Asignado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>
            Todos los usuarios con acceso al panel administrativo
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border p-4 ${
                    !user.active ? "opacity-60" : ""
                  }`}
                >
                  {/* Avatar */}
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

                  {/* Info */}
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
                          style={{
                            backgroundColor: user.role.color || "#6366f1",
                          }}
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

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
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

                  {/* Acciones */}
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

                  {/* Vista solo lectura */}
                  {!canEdit && !canDelete && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/configuracion/usuarios/${user.id}`}>
                        Ver Detalles
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
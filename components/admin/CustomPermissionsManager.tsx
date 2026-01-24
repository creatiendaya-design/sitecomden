"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { assignCustomPermission, removeCustomPermission, getUserById } from "@/actions/users";
import { toast } from "sonner";

interface CustomPermissionsManagerProps {
  userId: string;
  currentRole: any;
  customPermissions: any[];
  allPermissions: any[];
}

// Nombres amigables para módulos
const MODULE_NAMES: Record<string, string> = {
  products: "Productos",
  categories: "Categorías",
  orders: "Órdenes",
  customers: "Clientes",
  coupons: "Cupones",
  loyalty: "Programa de Lealtad",
  payments: "Pagos",
  newsletter: "Newsletter",
  settings: "Configuración",
  users: "Usuarios",
  reports: "Reportes",
  complaints: "Libro de Reclamaciones",
};

// Nombres amigables para acciones
const ACTION_NAMES: Record<string, string> = {
  view: "Ver",
  create: "Crear",
  edit: "Editar",
  delete: "Eliminar",
  manage: "Gestionar",
  configure: "Configurar",
  verify: "Verificar",
  reject: "Rechazar",
  export: "Exportar",
  cancel: "Cancelar",
  refund: "Reembolsar",
  update_status: "Actualizar Estado",
  manage_roles: "Gestionar Roles",
  manage_permissions: "Gestionar Permisos",
  view_sensitive: "Ver Información Sensible",
};

export default function CustomPermissionsManager({
  userId,
  currentRole,
  customPermissions,
  allPermissions,
}: CustomPermissionsManagerProps) {
  const [localCustomPermissions, setLocalCustomPermissions] = useState(customPermissions);
  const [loading, setLoading] = useState(false);

  // Agrupar permisos por módulo
  const permissionsGrouped = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, any[]>);

  // Obtener permisos del rol
  const rolePermissions = currentRole?.permissions?.map((rp: any) => rp.permission.id) || [];

  // Verificar si un permiso está en el rol
  const hasRolePermission = (permissionId: string) => {
    return rolePermissions.includes(permissionId);
  };

  // Obtener permiso personalizado
  const getCustomPermission = (permissionId: string) => {
    return localCustomPermissions.find((cp) => cp.permissionId === permissionId);
  };

  // Manejar toggle de permiso
  const handleTogglePermission = async (permissionId: string, currentType?: "GRANT" | "DENY") => {
    setLoading(true);

    try {
      if (currentType) {
        // Ya tiene el permiso, eliminarlo
        const result = await removeCustomPermission(userId, permissionId);
        if (result.success) {
          setLocalCustomPermissions(localCustomPermissions.filter(cp => cp.permissionId !== permissionId));
          toast.success("Permiso eliminado");
        } else {
          toast.error(result.error || "Error al eliminar permiso");
        }
      } else {
        // No tiene el permiso, agregarlo como GRANT
        const result = await assignCustomPermission(userId, permissionId, "GRANT");
        if (result.success) {
          // Recargar permisos
          const userResult = await getUserById(userId);
          if (userResult.success && userResult.user) {
            setLocalCustomPermissions(userResult.user.customPermissions);
          }
          toast.success("Permiso otorgado (GRANT)");
        } else {
          toast.error(result.error || "Error al asignar permiso");
        }
      }
    } catch (error) {
      toast.error("Error al modificar permiso");
    } finally {
      setLoading(false);
    }
  };

  // Cambiar tipo de permiso (GRANT ↔ DENY)
  const handleChangePermissionType = async (permissionId: string, newType: "GRANT" | "DENY") => {
    setLoading(true);

    try {
      const result = await assignCustomPermission(userId, permissionId, newType);
      if (result.success) {
        // Recargar permisos
        const userResult = await getUserById(userId);
        if (userResult.success && userResult.user) {
          setLocalCustomPermissions(userResult.user.customPermissions);
        }
        toast.success(`Permiso cambiado a ${newType}`);
      } else {
        toast.error(result.error || "Error al cambiar tipo");
      }
    } catch (error) {
      toast.error("Error al cambiar tipo");
    } finally {
      setLoading(false);
    }
  };

  // Formatear nombre de permiso
  const formatPermissionName = (permission: any) => {
    const actionName = ACTION_NAMES[permission.action] || permission.action;
    return `${actionName}`;
  };

  return (
    <div className="space-y-6">
      {/* Info del rol actual */}
      {currentRole && (
        <Card>
          <CardHeader>
            <CardTitle>Permisos del Rol "{currentRole.name}"</CardTitle>
            <CardDescription>
              El usuario hereda estos {currentRole.permissions.length} permisos de su rol.
              Los permisos personalizados sobrescriben el rol.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentRole.permissions.map((rp: any) => (
                <Badge key={rp.permission.id} variant="secondary">
                  {MODULE_NAMES[rp.permission.module] || rp.permission.module}:{" "}
                  {formatPermissionName(rp.permission)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permisos personalizados actuales */}
      {localCustomPermissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Permisos Personalizados Activos</CardTitle>
            <CardDescription>
              Estos permisos sobrescriben el rol. GRANT otorga el permiso, DENY lo bloquea.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {localCustomPermissions.map((cp) => (
                <Badge
                  key={cp.id}
                  variant={cp.type === "GRANT" ? "default" : "destructive"}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => handleTogglePermission(cp.permissionId, cp.type)}
                >
                  {MODULE_NAMES[cp.permission.module] || cp.permission.module}:{" "}
                  {formatPermissionName(cp.permission)} ({cp.type})
                  <span className="ml-1">×</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selector de permisos */}
      <Card>
        <CardHeader>
          <CardTitle>Asignar Permisos Personalizados</CardTitle>
          <CardDescription>
            Click en ✓ para GRANT (otorgar), ✗ para DENY (bloquear). Los permisos del
            rol aparecen en gris.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(permissionsGrouped).map(([module, permissions]) => (
              <Card key={module}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {MODULE_NAMES[module] || module}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(permissions as any[]).map((permission: any) => {
                    const customPerm = getCustomPermission(permission.id);
                    const inRole = hasRolePermission(permission.id);

                    return (
                      <div key={permission.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {formatPermissionName(permission)}
                          </span>
                          {inRole && !customPerm && (
                            <Badge variant="secondary" className="text-xs">
                              Del rol
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant={customPerm?.type === "GRANT" ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (customPerm?.type === "GRANT") {
                                handleTogglePermission(permission.id, "GRANT");
                              } else if (customPerm?.type === "DENY") {
                                handleChangePermissionType(permission.id, "GRANT");
                              } else {
                                handleTogglePermission(permission.id);
                              }
                            }}
                            disabled={loading}
                            title="GRANT - Otorgar permiso"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant={customPerm?.type === "DENY" ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (customPerm?.type === "DENY") {
                                handleTogglePermission(permission.id, "DENY");
                              } else if (customPerm?.type === "GRANT") {
                                handleChangePermissionType(permission.id, "DENY");
                              } else {
                                handleChangePermissionType(permission.id, "DENY");
                              }
                            }}
                            disabled={loading}
                            title="DENY - Bloquear permiso"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Explicación */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-2">💡 Cómo funcionan los permisos personalizados:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• <strong>GRANT (✓):</strong> Otorga el permiso aunque el rol no lo tenga</li>
            <li>• <strong>DENY (✗):</strong> Bloquea el permiso aunque el rol lo tenga</li>
            <li>• <strong>Prioridad:</strong> DENY → GRANT → Permisos del rol</li>
            <li>• Los permisos personalizados sobrescriben el rol asignado</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
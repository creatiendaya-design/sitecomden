"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, X, Search } from "lucide-react";
import { assignCustomPermission, removeCustomPermission, getUserById } from "@/actions/users";
import { toast } from "sonner";
import { getActionLabel, getModuleInfo } from "@/lib/permissions-display";

interface PermissionEntry {
  id: string;
  key: string;
  module: string;
  action: string;
  name?: string;
  description?: string;
}

interface RolePermissionEntry {
  permission: PermissionEntry;
}

interface RoleEntry {
  name: string;
  permissions?: RolePermissionEntry[];
}

interface CustomPermissionEntry {
  id: string;
  permissionId: string;
  type: "GRANT" | "DENY";
  permission: PermissionEntry;
}

interface CustomPermissionsManagerProps {
  userId: string;
  currentRole: RoleEntry | null;
  customPermissions: CustomPermissionEntry[];
  allPermissions: PermissionEntry[];
}

export default function CustomPermissionsManager({
  userId,
  currentRole,
  customPermissions,
  allPermissions,
}: CustomPermissionsManagerProps) {
  const [localCustomPermissions, setLocalCustomPermissions] = useState(customPermissions);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Agrupar permisos por módulo
  const permissionsGrouped = useMemo(
    () =>
      allPermissions.reduce((acc, perm) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push(perm);
        return acc;
      }, {} as Record<string, PermissionEntry[]>),
    [allPermissions],
  );

  // Filtrado por búsqueda (módulo es-PE, acción es-PE, key cruda, descripción).
  const filteredGrouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return permissionsGrouped;
    const out: Record<string, PermissionEntry[]> = {};
    for (const [module, perms] of Object.entries(permissionsGrouped)) {
      const moduleLabel = getModuleInfo(module).name.toLowerCase();
      const moduleMatches = moduleLabel.includes(q);
      const matched = perms.filter((p) => {
        if (moduleMatches) return true;
        const action = getActionLabel(p.action).toLowerCase();
        return (
          action.includes(q) ||
          p.key.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false) ||
          (p.name?.toLowerCase().includes(q) ?? false)
        );
      });
      if (matched.length > 0) out[module] = matched;
    }
    return out;
  }, [permissionsGrouped, search]);

  const hasSearch = search.trim().length > 0;
  const visibleGroupedEntries = Object.entries(filteredGrouped);

  // Obtener permisos del rol
  const rolePermissions = currentRole?.permissions?.map((rp) => rp.permission.id) || [];

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
            setLocalCustomPermissions(userResult.user.customPermissions as unknown as CustomPermissionEntry[]);
          }
          toast.success("Permiso otorgado (GRANT)");
        } else {
          toast.error(result.error || "Error al asignar permiso");
        }
      }
    } catch {
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
          setLocalCustomPermissions(userResult.user.customPermissions as unknown as CustomPermissionEntry[]);
        }
        toast.success(`Permiso cambiado a ${newType}`);
      } else {
        toast.error(result.error || "Error al cambiar tipo");
      }
    } catch {
      toast.error("Error al cambiar tipo");
    } finally {
      setLoading(false);
    }
  };

  // Formatear nombre de permiso (acción es-PE)
  const formatPermissionName = (permission: PermissionEntry) => {
    return getActionLabel(permission.action);
  };

  // Etiqueta de módulo (es-PE)
  const moduleLabel = (moduleKey: string) => getModuleInfo(moduleKey).name;

  return (
    <div className="space-y-6">
      {/* Info del rol actual */}
      {currentRole && (
        <Card>
          <CardHeader>
            <CardTitle>Permisos del Rol &quot;{currentRole.name}&quot;</CardTitle>
            <CardDescription>
              El usuario hereda estos {currentRole.permissions?.length ?? 0} permisos de su rol.
              Los permisos personalizados sobrescriben el rol.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(currentRole.permissions ?? []).map((rp) => (
                <Badge key={rp.permission.id} variant="secondary">
                  {moduleLabel(rp.permission.module)}:{" "}
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
                  {moduleLabel(cp.permission.module)}:{" "}
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
            rol aparecen marcados como &quot;Del rol&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar permiso (ej: temas, products:update, eliminar…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8"
            />
            {hasSearch && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearch("")}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {hasSearch && visibleGroupedEntries.length === 0 && (
            <div className="rounded-lg border border-dashed bg-muted/20 py-8 text-center text-sm text-muted-foreground">
              Sin resultados para &quot;{search}&quot;
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {visibleGroupedEntries.map(([module, permissions]) => {
              const info = getModuleInfo(module);
              return (
                <Card key={module}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{info.icon}</span>
                      <span>{info.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {permissions.map((permission) => {
                      const customPerm = getCustomPermission(permission.id);
                      const inRole = hasRolePermission(permission.id);

                      return (
                        <div key={permission.id} className="flex items-center justify-between gap-2">
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium">
                                {formatPermissionName(permission)}
                              </span>
                              {inRole && !customPerm && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  Del rol
                                </Badge>
                              )}
                            </div>
                            <code className="text-[10px] text-muted-foreground truncate">
                              {permission.key}
                            </code>
                          </div>
                          <div className="flex gap-1 shrink-0">
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
              );
            })}
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
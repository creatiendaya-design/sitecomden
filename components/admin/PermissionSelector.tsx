// components/admin/PermissionSelector.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Nombres amigables de módulos
const MODULE_NAMES: Record<string, { name: string; icon: string }> = {
  products: { name: "Productos", icon: "📦" },
  categories: { name: "Categorías", icon: "📂" },
  orders: { name: "Órdenes", icon: "🛒" },
  customers: { name: "Clientes", icon: "👥" },
  coupons: { name: "Cupones", icon: "🎟️" },
  loyalty: { name: "Lealtad", icon: "⭐" },
  payments: { name: "Pagos", icon: "💳" },
  newsletter: { name: "Newsletter", icon: "📧" },
  settings: { name: "Configuración", icon: "⚙️" },
  users: { name: "Usuarios", icon: "👤" },
  reports: { name: "Reportes", icon: "📊" },
  complaints: { name: "Reclamaciones", icon: "📝" },
};

// Nombres amigables de acciones
const ACTION_NAMES: Record<string, string> = {
  view: "Ver",
  create: "Crear",
  edit: "Editar",
  delete: "Eliminar",
  manage: "Gestionar",
  manage_inventory: "Gestionar Inventario",
  manage_points: "Gestionar Puntos",
  manage_rewards: "Gestionar Recompensas",
  configure: "Configurar",
  verify: "Verificar",
  reject: "Rechazar",
  export: "Exportar",
  cancel: "Cancelar",
  refund: "Reembolsar",
  update_status: "Actualizar Estado",
  view_sensitive: "Ver Datos Sensibles",
  edit_general: "Editar General",
  edit_payments: "Editar Pagos",
  edit_emails: "Editar Emails",
  edit_shipping: "Editar Envíos",
  manage_roles: "Gestionar Roles",
  manage_permissions: "Gestionar Permisos",
  view_sales: "Ver Ventas",
  view_inventory: "Ver Inventario",
  view_customers: "Ver Clientes",
  respond: "Responder",
};

interface PermissionSelectorProps {
  permissionsGrouped: Record<string, Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    module: string;
    action: string;
  }>>;
  selectedPermissionIds: string[];
  onChange: (permissionIds: string[]) => void;
}

export default function PermissionSelector({
  permissionsGrouped,
  selectedPermissionIds,
  onChange,
}: PermissionSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedPermissionIds));

  // Sincronizar cuando cambian las props
  useEffect(() => {
    setSelected(new Set(selectedPermissionIds));
  }, [selectedPermissionIds]);

  const handleToggle = (permissionId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelected(newSelected);
    onChange(Array.from(newSelected));
  };

  const handleToggleModule = (module: string) => {
    const modulePermissions = permissionsGrouped[module] || [];
    const modulePermissionIds = modulePermissions.map((p) => p.id);
    const allSelected = modulePermissionIds.every((id) => selected.has(id));

    const newSelected = new Set(selected);
    if (allSelected) {
      // Deseleccionar todos del módulo
      modulePermissionIds.forEach((id) => newSelected.delete(id));
    } else {
      // Seleccionar todos del módulo
      modulePermissionIds.forEach((id) => newSelected.add(id));
    }

    setSelected(newSelected);
    onChange(Array.from(newSelected));
  };

  const handleSelectAll = () => {
    const allPermissionIds = Object.values(permissionsGrouped)
      .flat()
      .map((p) => p.id);
    setSelected(new Set(allPermissionIds));
    onChange(allPermissionIds);
  };

  const handleDeselectAll = () => {
    setSelected(new Set());
    onChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {selected.size} permisos seleccionados
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Seleccionar Todos
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            Deseleccionar Todos
          </Button>
        </div>
      </div>

      {/* Módulos */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(permissionsGrouped).map(([module, permissions]) => {
          const moduleInfo = MODULE_NAMES[module] || { name: module, icon: "📌" };
          const modulePermissionIds = permissions.map((p) => p.id);
          const selectedCount = modulePermissionIds.filter((id) => selected.has(id)).length;
          const allSelected = selectedCount === modulePermissionIds.length;
          const someSelected = selectedCount > 0 && !allSelected;

          return (
            <Card key={module}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{moduleInfo.icon}</span>
                    <div>
                      <CardTitle className="text-base">{moduleInfo.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {permissions.length} permisos
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={allSelected ? "default" : someSelected ? "secondary" : "outline"} className="text-xs">
                      {selectedCount}/{permissions.length}
                    </Badge>
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => handleToggleModule(module)}
                      className="h-5 w-5"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {permissions.map((permission) => (
                  <div key={permission.id} className="flex items-center gap-2">
                    <Checkbox
                      id={permission.id}
                      checked={selected.has(permission.id)}
                      onCheckedChange={() => handleToggle(permission.id)}
                    />
                    <Label
                      htmlFor={permission.id}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      {ACTION_NAMES[permission.action] || permission.action}
                      {permission.description && (
                        <span className="block text-xs text-muted-foreground">
                          {permission.description}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
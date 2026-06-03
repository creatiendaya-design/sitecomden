// components/admin/PermissionSelector.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { getActionLabel, getModuleInfo } from "@/lib/permissions-display";

interface PermissionSelectorProps {
  permissionsGrouped: Record<
    string,
    Array<{
      id: string;
      key: string;
      name: string;
      description: string | null;
      module: string;
      action: string;
    }>
  >;
  selectedPermissionIds: string[];
  onChange: (permissionIds: string[]) => void;
}

export default function PermissionSelector({
  permissionsGrouped,
  selectedPermissionIds,
  onChange,
}: PermissionSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedPermissionIds)
  );
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );
  const [search, setSearch] = useState("");

  // Sincronizar cuando cambian las props
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set(selectedPermissionIds));
  }, [selectedPermissionIds]);

  // Filtro por búsqueda: matchea contra módulo (es-PE), acción (es-PE),
  // key cruda y descripción. Si hay query, expandimos automáticamente
  // los módulos con resultados.
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const entries = Object.entries(permissionsGrouped);
    if (!q) return entries;
    return entries
      .map(([module, perms]) => {
        const moduleInfo = getModuleInfo(module);
        const moduleMatches = moduleInfo.name.toLowerCase().includes(q);
        const filtered = perms.filter((p) => {
          if (moduleMatches) return true;
          const actionLabel = getActionLabel(p.action).toLowerCase();
          return (
            actionLabel.includes(q) ||
            p.key.toLowerCase().includes(q) ||
            (p.description?.toLowerCase().includes(q) ?? false) ||
            p.name.toLowerCase().includes(q)
          );
        });
        return [module, filtered] as const;
      })
      .filter(([, perms]) => perms.length > 0);
  }, [permissionsGrouped, search]);

  // Auto-expand modules that match the search query.
  useEffect(() => {
    if (search.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedModules(new Set(filteredEntries.map(([m]) => m)));
    }
  }, [search, filteredEntries]);

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
      modulePermissionIds.forEach((id) => newSelected.delete(id));
    } else {
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

  const toggleModuleExpand = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const moduleEntries = Object.entries(permissionsGrouped);
  const allModulesExpanded =
    moduleEntries.length > 0 && expandedModules.size === moduleEntries.length;

  const toggleAllExpanded = () => {
    if (allModulesExpanded) {
      setExpandedModules(new Set());
    } else {
      setExpandedModules(new Set(moduleEntries.map(([m]) => m)));
    }
  };

  const totalPermissions = moduleEntries.reduce(
    (sum, [, perms]) => sum + perms.length,
    0
  );

  const visibleEntries = filteredEntries;
  const visiblePermissionCount = visibleEntries.reduce(
    (sum, [, perms]) => sum + perms.length,
    0
  );
  const hasSearch = search.trim().length > 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search — first row, full width */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar permiso (ej: editar productos, themes:update…)"
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

      {/* Top actions — stack on mobile */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs sm:text-sm">
            {selected.size} / {totalPermissions} seleccionados
          </Badge>
          {hasSearch && (
            <Badge variant="outline" className="text-xs">
              {visiblePermissionCount} coincidencias
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleAllExpanded}
            className="flex-1 sm:flex-initial"
          >
            {allModulesExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden xs:inline ml-1 sm:ml-0">Colapsar</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden xs:inline ml-1 sm:ml-0">Expandir</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex-1 sm:flex-initial"
          >
            <span className="hidden sm:inline">Seleccionar Todos</span>
            <span className="sm:hidden">Todos</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            className="flex-1 sm:flex-initial"
          >
            <span className="hidden sm:inline">Deseleccionar</span>
            <span className="sm:hidden">Ninguno</span>
          </Button>
        </div>
      </div>

      {/* Empty state when search returns nothing */}
      {hasSearch && visibleEntries.length === 0 && (
        <div className="rounded-lg border border-dashed bg-muted/20 py-8 text-center text-sm text-muted-foreground">
          Sin resultados para &quot;{search}&quot;
        </div>
      )}

      {/* Módulos accordion */}
      <div className="space-y-2 sm:grid sm:gap-3 sm:grid-cols-2 sm:space-y-0">
        {visibleEntries.map(([module, permissions]) => {
          const moduleInfo = getModuleInfo(module);
          // Stats sobre el módulo COMPLETO (no solo lo filtrado), para que
          // los contadores no engañen cuando hay búsqueda activa.
          const fullModulePermissions = permissionsGrouped[module] ?? [];
          const fullModulePermissionIds = fullModulePermissions.map((p) => p.id);
          const selectedCount = fullModulePermissionIds.filter((id) =>
            selected.has(id)
          ).length;
          const allSelected =
            fullModulePermissionIds.length > 0 &&
            selectedCount === fullModulePermissionIds.length;
          const someSelected = selectedCount > 0 && !allSelected;
          const isExpanded = expandedModules.has(module);

          return (
            <div
              key={module}
              className="rounded-lg border bg-card overflow-hidden self-start"
            >
              {/* Module header — always visible, compact */}
              <div
                className={`flex items-center gap-2 p-2.5 sm:p-3 ${
                  isExpanded ? "bg-muted/40 border-b" : "bg-muted/20"
                }`}
              >
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => handleToggleModule(module)}
                  className="h-5 w-5 shrink-0"
                  aria-label={`Seleccionar todos los permisos de ${moduleInfo.name}`}
                />
                <button
                  type="button"
                  onClick={() => toggleModuleExpand(module)}
                  className="flex-1 min-w-0 text-left flex items-center gap-2"
                  aria-expanded={isExpanded}
                >
                  <span className="text-lg sm:text-xl shrink-0">
                    {moduleInfo.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {moduleInfo.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {selectedCount} / {fullModulePermissions.length} permisos
                      {hasSearch && permissions.length !== fullModulePermissions.length && (
                        <span> · {permissions.length} visibles</span>
                      )}
                    </p>
                  </div>
                </button>
                <Badge
                  variant={
                    allSelected
                      ? "default"
                      : someSelected
                      ? "secondary"
                      : "outline"
                  }
                  className="text-[10px] sm:text-xs h-5 px-1.5 tabular-nums shrink-0"
                >
                  {selectedCount}/{fullModulePermissions.length}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleModuleExpand(module)}
                  className="h-7 w-7 shrink-0"
                  aria-label={isExpanded ? "Colapsar" : "Expandir"}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Permission list — only when expanded */}
              {isExpanded && (
                <div className="p-2.5 sm:p-3 space-y-1.5">
                  {permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-muted/40"
                    >
                      <Checkbox
                        id={permission.id}
                        checked={selected.has(permission.id)}
                        onCheckedChange={() => handleToggle(permission.id)}
                        className="mt-0.5 shrink-0"
                      />
                      <Label
                        htmlFor={permission.id}
                        className="flex-1 cursor-pointer text-sm font-normal leading-tight min-w-0"
                      >
                        <span className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-medium">
                            {getActionLabel(permission.action)}
                          </span>
                          <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                            {permission.key}
                          </code>
                        </span>
                        {permission.description && (
                          <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                            {permission.description}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

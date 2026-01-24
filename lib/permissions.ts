// lib/permissions.ts
// Funciones para verificar permisos de usuarios admin

import { prisma } from "@/lib/db";
import { cache } from "react";
import { Prisma } from "@prisma/client";

// ============================================================
// TIPOS
// ============================================================

// Usar el tipo generado por Prisma
type UserWithPermissionsInclude = Prisma.UserGetPayload<{
  include: {
    role: {
      include: {
        permissions: {
          include: {
            permission: true;
          };
        };
      };
    };
    customPermissions: {
      include: {
        permission: true;
      };
    };
  };
}>;

export type Permission = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
};

export type UserWithPermissions = UserWithPermissionsInclude;

// ============================================================
// OBTENER USUARIO CON PERMISOS (CON CACHE)
// ============================================================

/**
 * Obtiene un usuario con todos sus permisos (rol + personalizados)
 * Usa React cache para optimizar múltiples llamadas en el mismo request
 */
export const getUserWithPermissions = cache(
  async (userId: string): Promise<UserWithPermissions | null> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
          customPermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!user || !user.active) {
        return null;
      }

      return user;
    } catch (error) {
      console.error("Error getting user with permissions:", error);
      return null;
    }
  }
);

// ============================================================
// VERIFICAR PERMISO INDIVIDUAL
// ============================================================

/**
 * Verifica si un usuario tiene un permiso específico
 * 
 * Prioridad:
 * 1. DENY explícito (tiene máxima prioridad)
 * 2. GRANT explícito
 * 3. Permisos del rol
 * 
 * @param userId - ID del usuario
 * @param permissionKey - Clave del permiso (ej: "products:create")
 * @returns true si tiene el permiso, false si no
 */
export async function hasPermission(
  userId: string,
  permissionKey: string
): Promise<boolean> {
  const user = await getUserWithPermissions(userId);

  if (!user || !user.active) {
    return false;
  }

  // 1. Verificar DENY explícito (tiene prioridad)
  const hasDeny = user.customPermissions.some(
    (cp) => cp.permission.key === permissionKey && cp.type === "DENY"
  );

  if (hasDeny) {
    return false;
  }

  // 2. Verificar GRANT explícito
  const hasGrant = user.customPermissions.some(
    (cp) => cp.permission.key === permissionKey && cp.type === "GRANT"
  );

  if (hasGrant) {
    return true;
  }

  // 3. Verificar permisos del rol
  if (user.role) {
    const hasRolePermission = user.role.permissions.some(
      (rp) => rp.permission.key === permissionKey
    );

    if (hasRolePermission) {
      return true;
    }
  }

  return false;
}

// ============================================================
// VERIFICAR MÚLTIPLES PERMISOS
// ============================================================

/**
 * Verifica si un usuario tiene AL MENOS UNO de los permisos especificados
 * 
 * @param userId - ID del usuario
 * @param permissionKeys - Array de claves de permisos
 * @returns true si tiene al menos uno, false si no tiene ninguno
 */
export async function hasAnyPermission(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  for (const key of permissionKeys) {
    if (await hasPermission(userId, key)) {
      return true;
    }
  }
  return false;
}

/**
 * Verifica si un usuario tiene TODOS los permisos especificados
 * 
 * @param userId - ID del usuario
 * @param permissionKeys - Array de claves de permisos
 * @returns true solo si tiene todos, false si le falta alguno
 */
export async function hasAllPermissions(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  for (const key of permissionKeys) {
    if (!(await hasPermission(userId, key))) {
      return false;
    }
  }
  return true;
}

// ============================================================
// VERIFICAR ACCESO A MÓDULO
// ============================================================

/**
 * Verifica si un usuario tiene acceso a un módulo completo
 * (tiene al menos un permiso de ese módulo)
 * 
 * @param userId - ID del usuario
 * @param module - Nombre del módulo (ej: "products", "orders")
 * @returns true si tiene al menos un permiso del módulo
 */
export async function hasModuleAccess(
  userId: string,
  module: string
): Promise<boolean> {
  const user = await getUserWithPermissions(userId);

  if (!user || !user.active) {
    return false;
  }

  // Verificar permisos GRANT del módulo
  const hasCustomAccess = user.customPermissions.some(
    (cp) => cp.permission.module === module && cp.type === "GRANT"
  );

  if (hasCustomAccess) {
    return true;
  }

  // Verificar permisos del rol
  if (user.role) {
    const hasRoleAccess = user.role.permissions.some(
      (rp) => rp.permission.module === module
    );

    if (hasRoleAccess) {
      return true;
    }
  }

  return false;
}

// ============================================================
// OBTENER TODOS LOS PERMISOS DEL USUARIO
// ============================================================

/**
 * Obtiene un Set con todas las claves de permisos que tiene el usuario
 * (útil para verificaciones múltiples o UI condicional)
 * 
 * @param userId - ID del usuario
 * @returns Set de claves de permisos
 */
export async function getUserPermissionKeys(userId: string): Promise<Set<string>> {
  const user = await getUserWithPermissions(userId);

  if (!user || !user.active) {
    return new Set();
  }

  const permissions = new Set<string>();

  // Agregar permisos del rol
  if (user.role) {
    user.role.permissions.forEach((rp) => {
      permissions.add(rp.permission.key);
    });
  }

  // Aplicar permisos personalizados
  user.customPermissions.forEach((cp) => {
    if (cp.type === "GRANT") {
      permissions.add(cp.permission.key);
    } else if (cp.type === "DENY") {
      permissions.delete(cp.permission.key);
    }
  });

  return permissions;
}

// ============================================================
// VERIFICAR SI ES SUPER ADMIN
// ============================================================

/**
 * Verifica si un usuario es Super Admin
 * (tiene el rol con level 100)
 * 
 * @param userId - ID del usuario
 * @returns true si es Super Admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await getUserWithPermissions(userId);

  if (!user || !user.active || !user.role) {
    return false;
  }

  return user.role.level >= 100;
}

// ============================================================
// VERIFICAR NIVEL DE ROL
// ============================================================

/**
 * Verifica si el rol del usuario tiene un nivel mínimo
 * 
 * @param userId - ID del usuario
 * @param minLevel - Nivel mínimo requerido
 * @returns true si el nivel del rol es >= minLevel
 */
export async function hasRoleLevel(
  userId: string,
  minLevel: number
): Promise<boolean> {
  const user = await getUserWithPermissions(userId);

  if (!user || !user.active || !user.role) {
    return false;
  }

  return user.role.level >= minLevel;
}

// ============================================================
// OBTENER PERMISOS AGRUPADOS POR MÓDULO
// ============================================================

/**
 * Obtiene los permisos del usuario organizados por módulo
 * (útil para mostrar en UI de configuración)
 * 
 * @param userId - ID del usuario
 * @returns Objeto con permisos agrupados por módulo
 */
export async function getUserPermissionsByModule(
  userId: string
): Promise<Record<string, Set<string>>> {
  const permissionKeys = await getUserPermissionKeys(userId);
  const byModule: Record<string, Set<string>> = {};

  // Obtener detalles de los permisos
  const permissions = await prisma.permission.findMany({
    where: {
      key: {
        in: Array.from(permissionKeys),
      },
    },
  });

  // Agrupar por módulo
  permissions.forEach((perm) => {
    if (!byModule[perm.module]) {
      byModule[perm.module] = new Set();
    }
    byModule[perm.module].add(perm.action);
  });

  return byModule;
}

// ============================================================
// HELPERS PARA COMPONENTES
// ============================================================

/**
 * Wrapper para usar en componentes de servidor
 * Verifica permiso y lanza error 403 si no lo tiene
 */
export async function requirePermission(
  userId: string,
  permissionKey: string
): Promise<void> {
  const hasAccess = await hasPermission(userId, permissionKey);

  if (!hasAccess) {
    throw new Error(`Permiso denegado: ${permissionKey}`);
  }
}

/**
 * Wrapper para verificar múltiples permisos (ANY)
 */
export async function requireAnyPermission(
  userId: string,
  permissionKeys: string[]
): Promise<void> {
  const hasAccess = await hasAnyPermission(userId, permissionKeys);

  if (!hasAccess) {
    throw new Error(
      `Permiso denegado. Se requiere uno de: ${permissionKeys.join(", ")}`
    );
  }
}

/**
 * Wrapper para verificar múltiples permisos (ALL)
 */
export async function requireAllPermissions(
  userId: string,
  permissionKeys: string[]
): Promise<void> {
  const hasAccess = await hasAllPermissions(userId, permissionKeys);

  if (!hasAccess) {
    throw new Error(
      `Permiso denegado. Se requieren todos: ${permissionKeys.join(", ")}`
    );
  }
}
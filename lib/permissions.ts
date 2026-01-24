// lib/permissions.ts
"use server";

import { prisma } from "@/lib/db";

/**
 * Verifica si un usuario tiene un permiso específico
 * Super Admin (nivel 100+) tiene TODOS los permisos automáticamente
 */
export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
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

    if (!user) {
      return false;
    }

    // ✅ SUPER ADMIN BYPASS: Nivel 100+ tiene TODO permitido
    // Verificación explícita para evitar error de TypeScript
    if (user.role && user.role.level >= 100) {
      return true;
    }

    // Verificar permisos personalizados primero (DENY tiene prioridad)
    const customPermission = user.customPermissions.find(
      (cp) => cp.permission.key === permissionKey
    );

    if (customPermission) {
      // Si es DENY, bloquear inmediatamente
      if (customPermission.type === "DENY") {
        return false;
      }
      // Si es GRANT, permitir
      if (customPermission.type === "GRANT") {
        return true;
      }
    }

    // Verificar permisos del rol
    if (user.role) {
      const roleHasPermission = user.role.permissions.some(
        (rp) => rp.permission.key === permissionKey
      );

      if (roleHasPermission) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Require que un usuario tenga un permiso específico (lanza error si no)
 * Super Admin (nivel 100+) bypass automático
 */
export async function requirePermission(userId: string, permissionKey: string): Promise<void> {
  const has = await hasPermission(userId, permissionKey);

  if (!has) {
    throw new Error(`Permission denied: ${permissionKey}`);
  }
}

/**
 * Verifica si un usuario es Super Admin (nivel 100+)
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    // ✅ Verificación explícita para evitar error de TypeScript
    if (!user) return false;
    if (!user.role) return false;
    
    return user.role.level >= 100;
  } catch (error) {
    console.error("Error checking super admin:", error);
    return false;
  }
}

/**
 * Obtiene todos los permisos efectivos de un usuario
 * (combinando permisos del rol y personalizados)
 */
export async function getUserEffectivePermissions(userId: string): Promise<string[]> {
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

    if (!user) {
      return [];
    }

    // ✅ Super Admin tiene TODOS los permisos
    if (user.role && user.role.level >= 100) {
      // Obtener TODOS los permisos del sistema
      const allPermissions = await prisma.permission.findMany({
        select: { key: true },
      });
      return allPermissions.map(p => p.key);
    }

    const permissions = new Set<string>();

    // Agregar permisos del rol
    if (user.role) {
      user.role.permissions.forEach((rp) => {
        permissions.add(rp.permission.key);
      });
    }

    // Aplicar permisos personalizados (GRANT agrega, DENY elimina)
    user.customPermissions.forEach((cp) => {
      if (cp.type === "GRANT") {
        permissions.add(cp.permission.key);
      } else if (cp.type === "DENY") {
        permissions.delete(cp.permission.key);
      }
    });

    return Array.from(permissions);
  } catch (error) {
    console.error("Error getting effective permissions:", error);
    return [];
  }
}

/**
 * Verifica si un usuario tiene TODOS los permisos especificados
 */
export async function hasAllPermissions(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  for (const key of permissionKeys) {
    const has = await hasPermission(userId, key);
    if (!has) {
      return false;
    }
  }
  return true;
}

/**
 * Verifica si un usuario tiene AL MENOS UNO de los permisos especificados
 */
export async function hasAnyPermission(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  for (const key of permissionKeys) {
    const has = await hasPermission(userId, key);
    if (has) {
      return true;
    }
  }
  return false;
}
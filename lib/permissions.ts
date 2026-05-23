// lib/permissions.ts
"use server";

import { cache } from "react";
import { prisma } from "@/lib/db";
import { SUPER_ADMIN_LEVEL } from "@/lib/constants";
import { checkPermission } from "@/lib/permissions-check";

// Cached per-request: múltiples llamadas a hasPermission en el mismo render
// solo disparan una query a la DB.
const fetchUserWithPermissions = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
      customPermissions: {
        include: { permission: true },
      },
    },
  });
});

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  try {
    const user = await fetchUserWithPermissions(userId);
    if (!user) return false;
    return checkPermission(user, permissionKey);
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Verifica múltiples permisos en una sola query (usa el mismo cache por request).
 * Retorna un objeto { [permissionKey]: boolean }
 */
export async function hasPermissions<T extends string>(
  userId: string,
  permissionKeys: T[]
): Promise<Record<T, boolean>> {
  try {
    const user = await fetchUserWithPermissions(userId);
    if (!user) {
      return Object.fromEntries(permissionKeys.map((k) => [k, false])) as Record<T, boolean>;
    }
    return Object.fromEntries(
      permissionKeys.map((k) => [k, checkPermission(user, k)])
    ) as Record<T, boolean>;
  } catch (error) {
    console.error("Error checking permissions:", error);
    return Object.fromEntries(permissionKeys.map((k) => [k, false])) as Record<T, boolean>;
  }
}

export async function requirePermission(userId: string, permissionKey: string): Promise<void> {
  const has = await hasPermission(userId, permissionKey);
  if (!has) {
    throw new Error(`Permission denied: ${permissionKey}`);
  }
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const user = await fetchUserWithPermissions(userId);
    if (!user?.role) return false;
    return user.role.level >= SUPER_ADMIN_LEVEL;
  } catch (error) {
    console.error("Error checking super admin:", error);
    return false;
  }
}

export async function getUserEffectivePermissions(userId: string): Promise<string[]> {
  try {
    const user = await fetchUserWithPermissions(userId);
    if (!user) return [];

    if (user.role && user.role.level >= SUPER_ADMIN_LEVEL) {
      const allPermissions = await prisma.permission.findMany({ select: { key: true } });
      return allPermissions.map((p) => p.key);
    }

    const permissions = new Set<string>();

    user.role?.permissions.forEach((rp) => permissions.add(rp.permission.key));

    user.customPermissions.forEach((cp) => {
      if (cp.type === "GRANT") permissions.add(cp.permission.key);
      else if (cp.type === "DENY") permissions.delete(cp.permission.key);
    });

    return Array.from(permissions);
  } catch (error) {
    console.error("Error getting effective permissions:", error);
    return [];
  }
}

export async function hasAllPermissions(userId: string, permissionKeys: string[]): Promise<boolean> {
  const results = await hasPermissions(userId, permissionKeys as string[] & string[]);
  return permissionKeys.every((k) => results[k]);
}

export async function hasAnyPermission(userId: string, permissionKeys: string[]): Promise<boolean> {
  const results = await hasPermissions(userId, permissionKeys as string[] & string[]);
  return permissionKeys.some((k) => results[k]);
}

// Agregar a actions/users.ts

"use server";

import { getCurrentUserId } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

/**
 * Verifica si el usuario actual tiene un permiso específico
 * (Para usar desde client components)
 */
export async function checkPermission(permission: string) {
  try {
    const userId = await getCurrentUserId();
    const has = await hasPermission(userId, permission);
    
    return {
      success: true,
      hasPermission: has,
    };
  } catch {
    return {
      success: false,
      hasPermission: false,
      error: "Error al verificar permisos",
    };
  }
}
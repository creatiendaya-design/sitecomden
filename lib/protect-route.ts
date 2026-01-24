// lib/protect-route.ts
import { getCurrentUserId } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

/**
 * Protege una ruta verificando que el usuario tenga el permiso necesario.
 * Si no tiene permiso, redirige al dashboard.
 * 
 * @param permission - El permiso requerido (ej: "settings:view")
 * @returns El userId si tiene permiso
 */
export async function protectRoute(permission: string): Promise<string> {
  const userId = await getCurrentUserId();
  const hasAccess = await hasPermission(userId, permission);
  
  if (!hasAccess) {
    redirect("/admin/dashboard");
  }
  
  return userId;
}

/**
 * Protege una ruta verificando múltiples permisos (OR).
 * Si tiene al menos uno de los permisos, permite el acceso.
 * 
 * @param permissions - Array de permisos (ej: ["settings:view", "settings:configure"])
 * @returns El userId si tiene al menos un permiso
 */
export async function protectRouteAny(permissions: string[]): Promise<string> {
  const userId = await getCurrentUserId();
  
  for (const permission of permissions) {
    const hasAccess = await hasPermission(userId, permission);
    if (hasAccess) {
      return userId;
    }
  }
  
  redirect("/admin/dashboard");
}

/**
 * Protege una ruta verificando múltiples permisos (AND).
 * Debe tener TODOS los permisos para acceder.
 * 
 * @param permissions - Array de permisos requeridos
 * @returns El userId si tiene todos los permisos
 */
export async function protectRouteAll(permissions: string[]): Promise<string> {
  const userId = await getCurrentUserId();
  
  for (const permission of permissions) {
    const hasAccess = await hasPermission(userId, permission);
    if (!hasAccess) {
      redirect("/admin/dashboard");
    }
  }
  
  return userId;
}
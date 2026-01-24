// lib/auth.ts
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Obtiene el ID del usuario admin actual
 * Se puede usar en Server Components y Server Actions
 */
export async function getCurrentUserId(): Promise<string> {
  // Opción 1: Desde cookie (más confiable)
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");
  
  if (adminSession?.value) {
    return adminSession.value;
  }

  // Opción 2: Desde header (inyectado por middleware)
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  
  if (userId) {
    return userId;
  }

  // No hay sesión
  redirect("/admin-auth/login");
}

/**
 * Obtiene el ID del usuario sin redirigir
 * Retorna null si no hay sesión
 */
export async function getCurrentUserIdOrNull(): Promise<string | null> {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");
  
  if (adminSession?.value) {
    return adminSession.value;
  }

  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  
  return userId || null;
}

/**
 * Verifica si hay una sesión activa
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserIdOrNull();
  return userId !== null;
}
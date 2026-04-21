/**
 * 🔐 SISTEMA DE AUTENTICACIÓN Y AUTORIZACIÓN
 * 
 * Este archivo contiene funciones para:
 * - Verificar sesiones de usuario
 * - Proteger rutas API con permisos
 * - Obtener información del usuario actual
 * 
 * COMPATIBILIDAD:
 * - Mantiene funciones legacy para Server Components
 * - Agrega nuevas funciones para API routes
 * 
 * Uso en API Routes:
 *   const { user, response } = await requireAuth();
 *   if (response) return response;
 * 
 * Uso en Server Components:
 *   const userId = await getCurrentUserId();
 *   const user = await getCurrentUser();
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import { SUPER_ADMIN_LEVEL } from "./constants";
import type { User, Role } from "@prisma/client";

// ===================================================================
// TIPOS
// ===================================================================

export type UserWithRole = User & { role: Role };

export type AuthResult = 
  | { user: UserWithRole; response: null }
  | { user: null; response: NextResponse };

// ===================================================================
// FUNCIÓN PRINCIPAL: OBTENER USUARIO ACTUAL (Mejorada)
// ===================================================================

/**
 * Obtiene el usuario actual desde la cookie de sesión
 * Valida que exista en la base de datos y esté activo
 * Redirige a login si no hay sesión válida
 * 
 * Para Server Components y Server Actions
 * Para API Routes, usa requireAuth() en su lugar
 */
export async function getCurrentUser(): Promise<UserWithRole> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      redirect("/admin-auth/login");
    }

    const user = await prisma.user.findUnique({
      where: { 
        id: sessionCookie.value,
        active: true 
      },
      include: { 
        role: true 
      },
    });

    if (!user || !user.role || !user.role.active) {
      // Sesión inválida, limpiar cookie y redirigir
      const cookieStore = await cookies();
      cookieStore.delete("admin_session");
      redirect("/admin-auth/login");
    }

    return user as UserWithRole;
  } catch (error) {
    // Si es un redirect, dejarlo pasar
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    
    console.error("Error getting current user:", error);
    redirect("/admin-auth/login");
  }
}

/**
 * Obtiene el usuario actual sin redirigir
 * Retorna null si no hay sesión o es inválida
 * 
 * Útil para verificaciones condicionales
 */
export async function getCurrentUserOrNull(): Promise<UserWithRole | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session");

    if (!sessionCookie) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { 
        id: sessionCookie.value,
        active: true 
      },
      include: { 
        role: true 
      },
    });

    if (!user || !user.role || !user.role.active) {
      return null;
    }

    return user as UserWithRole;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// ===================================================================
// AUTENTICACIÓN BÁSICA (Solo verificar login)
// ===================================================================

/**
 * Requiere que el usuario esté autenticado
 * No verifica permisos específicos
 * 
 * @returns { user, response } - Si response existe, retornarlo inmediatamente
 * 
 * @example
 * export async function GET(request: Request) {
 *   const { user, response } = await requireAuth();
 *   if (response) return response;
 *   
 *   // Usuario autenticado, continuar...
 * }
 */
export async function requireAuth(): Promise<AuthResult> {
  const user = await getCurrentUserOrNull();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { 
          error: "No autorizado - Debes iniciar sesión",
          code: "UNAUTHORIZED" 
        },
        { status: 401 }
      ),
    };
  }

  return { user, response: null };
}

// ===================================================================
// AUTORIZACIÓN POR NIVEL DE ROL
// ===================================================================

/**
 * Requiere que el usuario tenga un nivel de rol mínimo
 * 
 * Niveles típicos:
 * - 1: Staff (lectura)
 * - 3: Editor (escritura limitada)
 * - 5: Manager (escritura amplia)
 * - 10: Admin (todo)
 * - 100+: Super Admin (todos los permisos)
 * 
 * @param minLevel - Nivel mínimo requerido
 * 
 * @example
 * // Solo Admin (nivel 10) puede acceder
 * const { user, response } = await requireRoleLevel(10);
 * if (response) return response;
 */
export async function requireRoleLevel(minLevel: number): Promise<AuthResult> {
  const { user, response: authResponse } = await requireAuth();
  
  if (authResponse) {
    return { user: null, response: authResponse };
  }

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      ),
    };
  }

  if (user.role.level < minLevel) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "No tienes permisos suficientes para esta acción", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

// ===================================================================
// AUTORIZACIÓN POR PERMISO ESPECÍFICO
// ===================================================================

/**
 * ✅ VERSIÓN CORREGIDA CON SUPER ADMIN BYPASS
 * 
 * Requiere que el usuario tenga un permiso específico
 * 
 * @param permissionSlug - Slug del permiso (ej: "products.create")
 * 
 * @example
 * const { user, response } = await requirePermission("products:delete");
 * if (response) return response;
 */
export async function requirePermission(permissionSlug: string): Promise<AuthResult> {
  const { user, response: authResponse } = await requireAuth();
  
  if (authResponse) {
    return { user: null, response: authResponse };
  }

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      ),
    };
  }

  // Verificar que el usuario tenga un rol asignado
  if (!user.roleId) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Usuario sin rol asignado" },
        { status: 403 }
      ),
    };
  }

  // ✅ SUPER ADMIN BYPASS: Nivel 100+ tiene TODO permitido
  if (user.role && user.role.level >= SUPER_ADMIN_LEVEL) {
    console.log(`✅ Super Admin bypass: ${user.email} - ${permissionSlug}`);
    return { user, response: null };
  }

  try {
    // Importar hasPermission dinámicamente para evitar dependencia circular
    const { hasPermission } = await import("./permissions");

    const allowed = await hasPermission(user.id, permissionSlug);

    if (!allowed) {
      return {
        user: null,
        response: NextResponse.json(
          { error: "No tienes permisos para esta acción", code: "FORBIDDEN" },
          { status: 403 }
        ),
      };
    }
    return { user, response: null };

  } catch (error) {
    console.error("Error verificando permiso:", error);
    return {
      user: null,
      response: NextResponse.json(
        { error: "Error al verificar permisos" },
        { status: 500 }
      ),
    };
  }
}

// ===================================================================
// AUTORIZACIÓN POR MÚLTIPLES PERMISOS (OR)
// ===================================================================

/**
 * Requiere que el usuario tenga AL MENOS UNO de los permisos especificados
 * 
 * @param permissionSlugs - Array de slugs de permisos
 * 
 * @example
 * // Usuario puede ver órdenes O editarlas
 * const { user, response } = await requireAnyPermission([
 *   "orders.view",
 *   "orders.update"
 * ]);
 * if (response) return response;
 */
export async function requireAnyPermission(permissionSlugs: string[]): Promise<AuthResult> {
  const { user, response: authResponse } = await requireAuth();
  
  if (authResponse) {
    return { user: null, response: authResponse };
  }

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      ),
    };
  }

  // Verificar que el usuario tenga un rol asignado
  if (!user.roleId) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Usuario sin rol asignado" },
        { status: 403 }
      ),
    };
  }

  // ✅ SUPER ADMIN BYPASS
  if (user.role && user.role.level >= SUPER_ADMIN_LEVEL) {
    console.log(`✅ Super Admin bypass: ${user.email} - any of ${permissionSlugs.join(", ")}`);
    return { user, response: null };
  }

  // Verificar si el rol tiene alguno de los permisos
  const permission = await prisma.permission.findFirst({
    where: {
      key: { in: permissionSlugs },
      roles: {
        some: {
          roleId: user.roleId,
        },
      },
    },
  });

  if (!permission) {
    return {
      user: null,
      response: NextResponse.json(
        { 
          error: "No tienes permisos para esta acción",
          code: "FORBIDDEN",
          required_permissions: permissionSlugs,
          role: user.role.name
        },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

// ===================================================================
// AUTORIZACIÓN POR MÚLTIPLES PERMISOS (AND)
// ===================================================================

/**
 * Requiere que el usuario tenga TODOS los permisos especificados
 * 
 * @param permissionSlugs - Array de slugs de permisos
 * 
 * @example
 * // Usuario debe poder ver Y editar productos
 * const { user, response } = await requireAllPermissions([
 *   "products.view",
 *   "products.update"
 * ]);
 * if (response) return response;
 */
export async function requireAllPermissions(permissionSlugs: string[]): Promise<AuthResult> {
  const { user, response: authResponse } = await requireAuth();
  
  if (authResponse) {
    return { user: null, response: authResponse };
  }

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      ),
    };
  }

  // Verificar que el usuario tenga un rol asignado
  if (!user.roleId) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Usuario sin rol asignado" },
        { status: 403 }
      ),
    };
  }

  // ✅ SUPER ADMIN BYPASS
  if (user.role && user.role.level >= SUPER_ADMIN_LEVEL) {
    console.log(`✅ Super Admin bypass: ${user.email} - all of ${permissionSlugs.join(", ")}`);
    return { user, response: null };
  }

  // Verificar si el rol tiene todos los permisos
  const permissions = await prisma.permission.findMany({
    where: {
      key: { in: permissionSlugs },
      roles: {
        some: {
          roleId: user.roleId,
        },
      },
    },
  });

  if (permissions.length !== permissionSlugs.length) {
    const foundSlugs = permissions.map(p => p.key);
    const missingPermissions = permissionSlugs.filter(
      (slug: string) => !foundSlugs.includes(slug)
    );

    return {
      user: null,
      response: NextResponse.json(
        {
          error: "No tienes todos los permisos necesarios",
          code: "FORBIDDEN",
          required_permissions: permissionSlugs,
          missing_permissions: missingPermissions,
          role: user.role.name
        },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

// ===================================================================
// VERIFICACIÓN DE OWNERSHIP (Recurso propio)
// ===================================================================

/**
 * Verifica que el recurso pertenezca al usuario
 * Útil para endpoints donde usuarios solo pueden editar sus propios datos
 * 
 * @param resourceUserId - ID del usuario dueño del recurso
 * @param allowAdminOverride - Si true, admin puede acceder aunque no sea dueño
 * 
 * @example
 * const order = await prisma.order.findUnique({ where: { id } });
 * const { user, response } = await requireOwnership(order.userId, true);
 * if (response) return response;
 */
export async function requireOwnership(
  resourceUserId: string,
  allowAdminOverride: boolean = true
): Promise<AuthResult> {
  const { user, response: authResponse } = await requireAuth();
  
  if (authResponse) {
    return { user: null, response: authResponse };
  }

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      ),
    };
  }

  // Si es admin y está permitido override, permitir acceso
  if (allowAdminOverride && user.role.level >= 10) {
    return { user, response: null };
  }

  // Verificar ownership
  if (user.id !== resourceUserId) {
    return {
      user: null,
      response: NextResponse.json(
        { 
          error: "No puedes acceder a este recurso",
          code: "FORBIDDEN"
        },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

// ===================================================================
// HELPERS: Verificar permisos sin retornar response
// ===================================================================

/**
 * Solo verifica si el usuario tiene un permiso
 * No retorna NextResponse, solo boolean
 * Útil para lógica condicional dentro de un endpoint
 * 
 * @example
 * const canEdit = await userHasPermission(user, "products.update");
 * if (canEdit) {
 *   // mostrar botón de editar
 * }
 */
export async function userHasPermission(
  user: UserWithRole,
  permissionSlug: string
): Promise<boolean> {
  // Si el usuario no tiene rol, no tiene permisos
  if (!user.roleId) {
    return false;
  }

  // ✅ SUPER ADMIN BYPASS
  if (user.role && user.role.level >= SUPER_ADMIN_LEVEL) {
    return true;
  }

  const permission = await prisma.permission.findFirst({
    where: {
      key: permissionSlug,
      roles: {
        some: {
          roleId: user.roleId,
        },
      },
    },
  });

  return !!permission;
}

/**
 * Solo verifica si el usuario tiene nivel suficiente
 * No retorna NextResponse, solo boolean
 */
export async function userHasRoleLevel(
  user: UserWithRole,
  minLevel: number
): Promise<boolean> {
  return user.role.level >= minLevel;
}

// ===================================================================
// FUNCIONES LEGACY (Compatibilidad con código existente)
// ===================================================================

/**
 * @deprecated Usa getCurrentUser() para obtener información completa
 * 
 * Obtiene el ID del usuario admin actual
 * Se puede usar en Server Components y Server Actions
 */
export async function getCurrentUserId(): Promise<string> {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");

  if (adminSession?.value) {
    return adminSession.value;
  }

  redirect("/admin-auth/login");
}

/**
 * @deprecated Usa getCurrentUser() con null check
 * 
 * Obtiene el ID del usuario sin redirigir
 * Retorna null si no hay sesión
 */
export async function getCurrentUserIdOrNull(): Promise<string | null> {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");
  return adminSession?.value ?? null;
}

/**
 * @deprecated Usa getCurrentUser() con null check
 * 
 * Verifica si hay una sesión activa
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserIdOrNull();
  return userId !== null;
}
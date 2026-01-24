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

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "./db";
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
        { 
          error: "No tienes permisos suficientes para esta acción",
          code: "FORBIDDEN",
          required_level: minLevel,
          user_level: user.role.level
        },
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
 * Requiere que el usuario tenga un permiso específico
 * 
 * @param permissionSlug - Slug del permiso (ej: "products.create")
 * 
 * @example
 * const { user, response } = await requirePermission("products.delete");
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

  // Verificar si el rol tiene el permiso
  // Hacemos la query inversa: buscar Permission que tenga el key
  // y que tenga un RolePermission con el roleId del usuario
  const permission = await prisma.permission.findFirst({
    where: {
      key: permissionSlug, // ← Cambiado de slug a key
      roles: { // ← Cambiado de rolePermissions a roles
        some: {
          roleId: user.roleId, // ✅ Buscar permisos asociados a este rol
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
          required_permission: permissionSlug,
          role: user.role.name
        },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
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

  // Verificar si el rol tiene alguno de los permisos
  // Query inversa: buscar Permission que cumpla las condiciones
  const permission = await prisma.permission.findFirst({
    where: {
      key: { in: permissionSlugs }, // ← Cambiado de slug a key
      roles: { // ← Cambiado de rolePermissions a roles
        some: {
          roleId: user.roleId, // ✅ Buscar permisos asociados a este rol
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

  // Verificar si el rol tiene todos los permisos
  // Query inversa: buscar Permissions que cumplan las condiciones
  const permissions = await prisma.permission.findMany({
    where: {
      key: { in: permissionSlugs }, // ← Cambiado de slug a key
      roles: { // ← Cambiado de rolePermissions a roles
        some: {
          roleId: user.roleId, // ✅ Buscar permisos asociados a este rol
        },
      },
    },
  });

  if (permissions.length !== permissionSlugs.length) {
    const foundSlugs = permissions.map(p => p.key); // ← Cambiado de slug a key
    const missingPermissions = permissionSlugs.filter(
      slug => !foundSlugs.includes(slug)
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

  // Query inversa: buscar Permission que cumpla las condiciones
  const permission = await prisma.permission.findFirst({
    where: {
      key: permissionSlug, // ← Cambiado de slug a key
      roles: { // ← Cambiado de rolePermissions a roles
        some: {
          roleId: user.roleId, // ✅ Buscar permisos asociados a este rol
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
 * @deprecated Usa getCurrentUser() con null check
 * 
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
 * @deprecated Usa getCurrentUser() con null check
 * 
 * Verifica si hay una sesión activa
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserIdOrNull();
  return userId !== null;
}

// ===================================================================
// EJEMPLO DE USO COMPLETO
// ===================================================================

/*
// ========================================
// EJEMPLO 1: API Route Protegida
// ========================================
// app/api/admin/products/create/route.ts

import { requirePermission } from "@/lib/auth";
import { withRateLimit, apiRateLimiter } from "@/lib/rate-limit";
import { createProductSchema } from "@/lib/validations";
import { z } from "zod";

export async function POST(request: Request) {
  // 1. ✅ Verificar autenticación y permisos
  const { user, response: authResponse } = await requirePermission("products.create");
  if (authResponse) return authResponse;

  // 2. ✅ Rate limiting
  const rateLimitResponse = await withRateLimit(request, apiRateLimiter);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // 3. ✅ Validar datos
    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    // 4. ✅ Crear producto
    const product = await prisma.product.create({
      data: validatedData,
    });

    console.log(`✅ Producto creado por ${user.email}:`, product.id);

    return NextResponse.json({ success: true, product });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}


// ========================================
// EJEMPLO 2: Server Component (legacy)
// ========================================
// app/admin/dashboard/page.tsx

import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  // Si no hay usuario, getCurrentUser() redirige automáticamente a login
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bienvenido, {user.name}</p>
      <p>Rol: {user.role.name}</p>
    </div>
  );
}


// ========================================
// EJEMPLO 3: Verificación condicional
// ========================================
// components/AdminButton.tsx

import { getCurrentUser } from "@/lib/auth";
import { userHasPermission } from "@/lib/auth";

export default async function AdminButton() {
  const user = await getCurrentUser();
  
  if (!user) return null;
  
  const canEdit = await userHasPermission(user, "products.update");
  
  if (!canEdit) {
    return <p>No tienes permisos para editar</p>;
  }
  
  return <button>Editar Producto</button>;
}
*/
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { requirePermission, isSuperAdmin, hasPermission } from "@/lib/permissions"; // ← CAMBIO 1: Agregar hasPermission
import bcrypt from "bcryptjs";

// ============================================================
// TIPOS
// ============================================================

export type UserFormData = {
  name: string;
  email: string;
  password?: string; // Solo al crear
  roleId: string | null;
  active: boolean;
};

export type CustomPermissionData = {
  permissionId: string;
  type: "GRANT" | "DENY";
};

// ============================================================
// OBTENER TODOS LOS USUARIOS
// ============================================================

export async function getUsers() {
  try {
    const currentUserId = await getCurrentUserId();
    await requirePermission(currentUserId, "users:view");

    const users = await prisma.user.findMany({
      include: {
        role: true,
        customPermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, users };
  } catch (error) {
    console.error("Error getting users:", error);
    return { success: false, error: "Error al obtener usuarios", users: [] };
  }
}

// ============================================================
// OBTENER USUARIO POR ID
// ============================================================

export async function getUserById(userId: string) {
  try {
    const currentUserId = await getCurrentUserId();
    await requirePermission(currentUserId, "users:view");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        customPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado", user: null };
    }

    // No retornar password
    const { password, ...userWithoutPassword } = user;

    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error("Error getting user:", error);
    return { success: false, error: "Error al obtener usuario", user: null };
  }
}

// ============================================================
// CREAR USUARIO
// ============================================================

export async function createUser(data: UserFormData & { password: string }) {
  try {
    const currentUserId = await getCurrentUserId();
    await requirePermission(currentUserId, "users:create");

    // Validaciones
    if (!data.name || !data.email || !data.password) {
      return { success: false, error: "Nombre, email y contraseña son requeridos" };
    }

    if (data.password.length < 6) {
      return { success: false, error: "La contraseña debe tener al menos 6 caracteres" };
    }

    // Verificar que el email no exista
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return { success: false, error: "Ya existe un usuario con ese email" };
    }

    // Si se asigna un rol, verificar que existe
    if (data.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: data.roleId },
      });

      if (!role) {
        return { success: false, error: "El rol seleccionado no existe" };
      }
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        roleId: data.roleId,
        active: data.active,
      },
      include: {
        role: true,
      },
    });

    revalidatePath("/admin/configuracion/usuarios");

    const { password, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: "Error al crear usuario" };
  }
}

// ============================================================
// ACTUALIZAR USUARIO
// ============================================================

export async function updateUser(userId: string, data: UserFormData) {
  try {
    const currentUserId = await getCurrentUserId();
    await requirePermission(currentUserId, "users:edit");

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return { success: false, error: "Usuario no encontrado" };
    }

    // No permitir que un usuario se desactive a sí mismo
    if (userId === currentUserId && !data.active) {
      return { success: false, error: "No puedes desactivarte a ti mismo" };
    }

    // Solo Super Admin puede cambiar roles de otros Super Admins
    if (existingUser.roleId) {
      const existingRole = await prisma.role.findUnique({
        where: { id: existingUser.roleId },
      });

      if (existingRole && existingRole.level >= 100) {
        const isCurrentUserSuperAdmin = await isSuperAdmin(currentUserId);
        if (!isCurrentUserSuperAdmin) {
          return {
            success: false,
            error: "Solo un Super Admin puede modificar a otro Super Admin",
          };
        }
      }
    }

    // Verificar email único (si cambió)
    if (data.email !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailInUse) {
        return { success: false, error: "Ya existe un usuario con ese email" };
      }
    }

    // Si se asigna un rol, verificar que existe
    if (data.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: data.roleId },
      });

      if (!role) {
        return { success: false, error: "El rol seleccionado no existe" };
      }
    }

    // Actualizar usuario
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        roleId: data.roleId,
        active: data.active,
      },
      include: {
        role: true,
      },
    });

    revalidatePath("/admin/configuracion/usuarios");
    revalidatePath(`/admin/configuracion/usuarios/${userId}`);

    const { password, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: "Error al actualizar usuario" };
  }
}

// ============================================================
// CAMBIAR CONTRASEÑA
// ============================================================

export async function changeUserPassword(userId: string, newPassword: string) {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Solo puede cambiar su propia contraseña o si tiene permiso de editar usuarios
    if (userId !== currentUserId) {
      await requirePermission(currentUserId, "users:edit");
    }

    if (newPassword.length < 6) {
      return { success: false, error: "La contraseña debe tener al menos 6 caracteres" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: "Error al cambiar contraseña" };
  }
}

// ============================================================
// ELIMINAR USUARIO
// ============================================================

export async function deleteUser(userId: string) {
  try {
    const currentUserId = await getCurrentUserId();
    await requirePermission(currentUserId, "users:delete");

    // No permitir eliminar al usuario actual
    if (userId === currentUserId) {
      return { success: false, error: "No puedes eliminarte a ti mismo" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    // Solo Super Admin puede eliminar a otro Super Admin
    if (user.role && user.role.level >= 100) {
      const isCurrentUserSuperAdmin = await isSuperAdmin(currentUserId);
      if (!isCurrentUserSuperAdmin) {
        return {
          success: false,
          error: "Solo un Super Admin puede eliminar a otro Super Admin",
        };
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/configuracion/usuarios");

    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Error al eliminar usuario" };
  }
}

// ============================================================
// ACTIVAR/DESACTIVAR USUARIO
// ============================================================

export async function toggleUserStatus(userId: string, active: boolean) {
  try {
    const currentUserId = await getCurrentUserId();
    await requirePermission(currentUserId, "users:edit");

    // No permitir desactivarse a sí mismo
    if (userId === currentUserId && !active) {
      return { success: false, error: "No puedes desactivarte a ti mismo" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { active },
    });

    revalidatePath("/admin/configuracion/usuarios");

    return { success: true };
  } catch (error) {
    console.error("Error toggling user status:", error);
    return { success: false, error: "Error al cambiar estado del usuario" };
  }
}

// ============================================================
// ASIGNAR PERMISO PERSONALIZADO
// ============================================================

export async function assignCustomPermission(
  userId: string,
  permissionId: string,
  type: "GRANT" | "DENY"
) {
  try {
    const currentUserId = await getCurrentUserId();
    await requirePermission(currentUserId, "users:manage_permissions");

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    // Verificar que el permiso existe
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      return { success: false, error: "Permiso no encontrado" };
    }

    // Crear o actualizar permiso personalizado
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
      create: {
        userId,
        permissionId,
        type,
      },
      update: {
        type,
      },
    });

    revalidatePath(`/admin/configuracion/usuarios/${userId}`);

    return { success: true };
  } catch (error) {
    console.error("Error assigning custom permission:", error);
    return { success: false, error: "Error al asignar permiso personalizado" };
  }
}

// ============================================================
// ELIMINAR PERMISO PERSONALIZADO
// ============================================================

export async function removeCustomPermission(userId: string, permissionId: string) {
  try {
    const currentUserId = await getCurrentUserId();
    await requirePermission(currentUserId, "users:manage_permissions");

    await prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });

    revalidatePath(`/admin/configuracion/usuarios/${userId}`);

    return { success: true };
  } catch (error) {
    console.error("Error removing custom permission:", error);
    return { success: false, error: "Error al eliminar permiso personalizado" };
  }
}

// ============================================================
// VERIFICAR PERMISO (PARA CLIENT COMPONENTS)
// ============================================================

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
  } catch (error) {
    return {
      success: false,
      hasPermission: false,
      error: "Error al verificar permisos",
    };
  }
}
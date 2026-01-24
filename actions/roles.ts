"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

// ============================================================
// TIPOS
// ============================================================

export type RoleFormData = {
  name: string;
  slug: string;
  description?: string;
  level: number;
  color?: string;
  active: boolean;
  permissionIds: string[];
};

// ============================================================
// OBTENER TODOS LOS ROLES
// ============================================================

export async function getRoles() {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        level: "desc",
      },
    });

    return { success: true, roles };
  } catch (error) {
    console.error("Error getting roles:", error);
    return { success: false, error: "Error al obtener roles", roles: [] };
  }
}

// ============================================================
// OBTENER UN ROL POR ID
// ============================================================

export async function getRoleById(roleId: string) {
  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      return { success: false, error: "Rol no encontrado", role: null };
    }

    return { success: true, role };
  } catch (error) {
    console.error("Error getting role:", error);
    return { success: false, error: "Error al obtener rol", role: null };
  }
}

// ============================================================
// OBTENER TODOS LOS PERMISOS
// ============================================================

export async function getAllPermissions() {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { module: "asc" },
        { action: "asc" },
      ],
    });

    // Agrupar permisos por módulo
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return { success: true, permissions, grouped };
  } catch (error) {
    console.error("Error getting permissions:", error);
    return { success: false, error: "Error al obtener permisos", permissions: [], grouped: {} };
  }
}

// ============================================================
// CREAR ROL
// ============================================================

export async function createRole(data: RoleFormData) {
  try {
    const userId = await getCurrentUserId();
    await requirePermission(userId, "users:manage_roles");

    if (!data.name || !data.slug) {
      return { success: false, error: "Nombre y slug son requeridos" };
    }

    const existing = await prisma.role.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return { success: false, error: "Ya existe un rol con ese slug" };
    }

    const role = await prisma.role.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        level: data.level,
        color: data.color || "#6366f1",
        active: data.active,
        isSystem: false,
      },
    });

    if (data.permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: data.permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    revalidatePath("/admin/configuracion/roles");

    return { success: true, role };
  } catch (error) {
    console.error("Error creating role:", error);
    return { success: false, error: "Error al crear rol" };
  }
}

// ============================================================
// ACTUALIZAR ROL
// ============================================================

export async function updateRole(roleId: string, data: RoleFormData) {
  try {
    const userId = await getCurrentUserId();
    await requirePermission(userId, "users:manage_roles");

    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return { success: false, error: "Rol no encontrado" };
    }

    if (existingRole.isSystem) {
      return {
        success: false,
        error: "No se pueden editar roles del sistema",
      };
    }

    if (data.slug !== existingRole.slug) {
      const slugInUse = await prisma.role.findUnique({
        where: { slug: data.slug },
      });

      if (slugInUse) {
        return { success: false, error: "Ya existe un rol con ese slug" };
      }
    }

    const role = await prisma.$transaction(async (tx) => {
      const updatedRole = await tx.role.update({
        where: { id: roleId },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          level: data.level,
          color: data.color,
          active: data.active,
        },
      });

      await tx.rolePermission.deleteMany({
        where: { roleId: roleId },
      });

      if (data.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: data.permissionIds.map((permissionId) => ({
            roleId: roleId,
            permissionId,
          })),
        });
      }

      return updatedRole;
    });

    revalidatePath("/admin/configuracion/roles");
    revalidatePath(`/admin/configuracion/roles/${roleId}`);

    return { success: true, role };
  } catch (error) {
    console.error("Error updating role:", error);
    return { success: false, error: "Error al actualizar rol" };
  }
}

// ============================================================
// ELIMINAR ROL
// ============================================================

export async function deleteRole(roleId: string) {
  try {
    const userId = await getCurrentUserId();
    await requirePermission(userId, "users:manage_roles");

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return { success: false, error: "Rol no encontrado" };
    }

    if (role.isSystem) {
      return {
        success: false,
        error: "No se pueden eliminar roles del sistema",
      };
    }

    if (role._count.users > 0) {
      return {
        success: false,
        error: `No se puede eliminar. ${role._count.users} usuario(s) tienen este rol`,
      };
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    revalidatePath("/admin/configuracion/roles");

    return { success: true };
  } catch (error) {
    console.error("Error deleting role:", error);
    return { success: false, error: "Error al eliminar rol" };
  }
}

// ============================================================
// DUPLICAR ROL
// ============================================================

export async function duplicateRole(roleId: string) {
  try {
    const userId = await getCurrentUserId();
    await requirePermission(userId, "users:manage_roles");

    const originalRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });

    if (!originalRole) {
      return { success: false, error: "Rol no encontrado" };
    }

    let newSlug = `${originalRole.slug}-copy`;
    let counter = 1;
    
    while (await prisma.role.findUnique({ where: { slug: newSlug } })) {
      newSlug = `${originalRole.slug}-copy-${counter}`;
      counter++;
    }

    const newRole = await prisma.role.create({
      data: {
        name: `${originalRole.name} (Copia)`,
        slug: newSlug,
        description: originalRole.description,
        level: originalRole.level,
        color: originalRole.color,
        active: false,
        isSystem: false,
      },
    });

    if (originalRole.permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: originalRole.permissions.map((rp) => ({
          roleId: newRole.id,
          permissionId: rp.permissionId,
        })),
      });
    }

    revalidatePath("/admin/configuracion/roles");

    return { success: true, role: newRole };
  } catch (error) {
    console.error("Error duplicating role:", error);
    return { success: false, error: "Error al duplicar rol" };
  }
}

// ============================================================
// ACTIVAR/DESACTIVAR ROL
// ============================================================

export async function toggleRoleStatus(roleId: string, active: boolean) {
  try {
    const userId = await getCurrentUserId();
    await requirePermission(userId, "users:manage_roles");

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return { success: false, error: "Rol no encontrado" };
    }

    if (role.isSystem) {
      return {
        success: false,
        error: "No se pueden desactivar roles del sistema",
      };
    }

    await prisma.role.update({
      where: { id: roleId },
      data: { active },
    });

    revalidatePath("/admin/configuracion/roles");

    return { success: true };
  } catch (error) {
    console.error("Error toggling role status:", error);
    return { success: false, error: "Error al cambiar estado del rol" };
  }
}
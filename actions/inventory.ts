"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { InventoryMovementType } from "@prisma/client"; // ✅ Importar el enum
import { protectRoute } from "@/lib/protect-route";
import { z } from "zod";
import {
  adjustStockSchema,
  createInventoryMovementSchema,
} from "@/lib/validations/admin";
import { logAudit } from "@/lib/audit-log";
import { getCurrentUserId } from "@/lib/auth";

function flattenZodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join("; ");
}

// Tipos
export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  currentStock: number;
  lowStockAlert: number;
  isLowStock: boolean;
  hasVariants: boolean;
  variants?: {
    id: string;
    sku: string;
    options: any;
    stock: number;
    lowStockAlert: number;
  }[];
}

export interface InventoryMovementWithDetails {
  id: string;
  type: string;
  quantity: number;
  reason?: string;
  reference?: string;
  createdAt: Date;
  product?: {
    id: string;
    name: string;
  };
  variant?: {
    id: string;
    sku: string;
    options: any;
  };
}

// Obtener resumen de inventario
export async function getInventorySummary() {
  await protectRoute("products:view");
  try {
    // Productos simples
    const simpleProducts = await prisma.product.findMany({
      where: {
        active: true,
        hasVariants: false,
      },
      select: {
        id: true,
        stock: true,
      },
    });

    // Variantes de productos
    const variants = await prisma.productVariant.findMany({
      where: {
        active: true,
        product: {
          active: true,
        },
      },
      select: {
        id: true,
        stock: true,
        lowStockAlert: true,
      },
    });

    const totalStock = simpleProducts.reduce((sum, p) => sum + p.stock, 0) +
                       variants.reduce((sum, v) => sum + v.stock, 0);

    const lowStockItems = simpleProducts.filter(p => p.stock <= 5).length +
                         variants.filter(v => v.stock <= v.lowStockAlert).length;

    const outOfStockItems = simpleProducts.filter(p => p.stock === 0).length +
                           variants.filter(v => v.stock === 0).length;

    // Movimientos recientes (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMovements = await prisma.inventoryMovement.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return {
      success: true,
      data: {
        totalStock,
        lowStockItems,
        outOfStockItems,
        recentMovements,
      },
    };
  } catch (error) {
    console.error("Error fetching inventory summary:", error);
    return {
      success: false,
      error: "Error al obtener resumen de inventario",
    };
  }
}

// Obtener todos los productos con su inventario
export async function getInventoryList() {
  await protectRoute("products:view");
  try {
    const products = await prisma.product.findMany({
      where: {
        active: true,
      },
      include: {
        variants: {
          where: { active: true },
          select: {
            id: true,
            sku: true,
            options: true,
            stock: true,
            lowStockAlert: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const inventoryItems: InventoryItem[] = products.map((product) => {
      if (product.hasVariants && product.variants.length > 0) {
        // Producto con variantes
        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        const minStock = Math.min(...product.variants.map((v) => v.stock));
        const lowStockAlert = product.variants[0]?.lowStockAlert || 5;
        
        return {
          id: product.id,
          name: product.name,
          sku: undefined,
          currentStock: totalStock,
          lowStockAlert,
          isLowStock: minStock <= lowStockAlert,
          hasVariants: true,
          variants: product.variants,
        };
      } else {
        // Producto simple
        return {
          id: product.id,
          name: product.name,
          sku: product.sku || undefined,
          currentStock: product.stock,
          lowStockAlert: 5, // Default
          isLowStock: product.stock <= 5,
          hasVariants: false,
        };
      }
    });

    return {
      success: true,
      data: inventoryItems,
    };
  } catch (error) {
    console.error("Error fetching inventory list:", error);
    return {
      success: false,
      error: "Error al obtener lista de inventario",
      data: [],
    };
  }
}

// Obtener movimientos de inventario con filtros
export async function getInventoryMovements(filters?: {
  productId?: string;
  variantId?: string;
  type?: InventoryMovementType; // ✅ CAMBIO: usar el enum en lugar de string
  limit?: number;
}) {
  await protectRoute("products:view");
  try {
    const movements = await prisma.inventoryMovement.findMany({
      where: {
        ...(filters?.productId && { productId: filters.productId }),
        ...(filters?.variantId && { variantId: filters.variantId }),
        ...(filters?.type && { type: filters.type }), // ✅ Ahora es del tipo correcto
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            options: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: filters?.limit || 50,
    });

    return {
      success: true,
      data: movements,
    };
  } catch (error) {
    console.error("Error fetching inventory movements:", error);
    return {
      success: false,
      error: "Error al obtener movimientos de inventario",
      data: [],
    };
  }
}

// Crear movimiento manual de inventario
export async function createInventoryMovement(data: {
  productId?: string;
  variantId?: string;
  type: "PURCHASE" | "ADJUSTMENT" | "DAMAGE" | "RETURN";
  quantity: number;
  reason?: string;
  reference?: string;
}) {
  await protectRoute("products:manage_inventory");
  try {
    const currentUserId = await getCurrentUserId();

    const parsed = createInventoryMovementSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: flattenZodError(parsed.error) };
    }
    const input = parsed.data;

    // Crear el movimiento
    const movement = await prisma.inventoryMovement.create({
      data: {
        productId: input.productId ?? undefined,
        variantId: input.variantId ?? undefined,
        type: input.type as InventoryMovementType,
        quantity: input.quantity,
        reason: input.reason,
        reference: input.reference,
      },
    });

    // Actualizar el stock
    if (input.variantId) {
      await prisma.productVariant.update({
        where: { id: input.variantId },
        data: {
          stock: {
            increment: input.quantity,
          },
        },
      });
    } else if (input.productId) {
      await prisma.product.update({
        where: { id: input.productId },
        data: {
          stock: {
            increment: input.quantity,
          },
        },
      });
    }

    revalidatePath("/admin/inventario");

    await logAudit({
      action: "inventory.movement_created",
      userId: currentUserId ?? null,
      entityType: input.variantId ? "ProductVariant" : "Product",
      entityId: input.variantId ?? input.productId ?? null,
      metadata: {
        type: input.type,
        quantity: input.quantity,
        reason: input.reason ?? null,
        reference: input.reference ?? null,
        movementId: movement.id,
      },
    });

    return {
      success: true,
      data: movement,
    };
  } catch (error) {
    console.error("Error creating inventory movement:", error);
    return {
      success: false,
      error: "Error al crear movimiento de inventario",
    };
  }
}

// Ajustar stock manualmente (setear a un valor específico)
export async function adjustStock(data: {
  productId?: string;
  variantId?: string;
  newStock: number;
  reason: string;
}) {
  await protectRoute("products:manage_inventory");
  try {
    const currentUserId = await getCurrentUserId();

    const parsed = adjustStockSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: flattenZodError(parsed.error) };
    }
    const input = parsed.data;

    let currentStock = 0;

    // Obtener stock actual
    if (input.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: input.variantId },
        select: { stock: true },
      });
      currentStock = variant?.stock || 0;
    } else if (input.productId) {
      const product = await prisma.product.findUnique({
        where: { id: input.productId },
        select: { stock: true },
      });
      currentStock = product?.stock || 0;
    }

    const difference = input.newStock - currentStock;

    if (difference === 0) {
      return {
        success: true,
        message: "El stock ya está en el valor indicado",
      };
    }

    // Crear movimiento de ajuste
    await prisma.inventoryMovement.create({
      data: {
        productId: input.productId ?? undefined,
        variantId: input.variantId ?? undefined,
        type: "ADJUSTMENT",
        quantity: difference,
        reason: input.reason,
      },
    });

    // Actualizar stock
    if (input.variantId) {
      await prisma.productVariant.update({
        where: { id: input.variantId },
        data: { stock: input.newStock },
      });
    } else if (input.productId) {
      await prisma.product.update({
        where: { id: input.productId },
        data: { stock: input.newStock },
      });
    }

    revalidatePath("/admin/inventario");

    await logAudit({
      action: "inventory.stock_adjusted",
      userId: currentUserId ?? null,
      entityType: input.variantId ? "ProductVariant" : "Product",
      entityId: input.variantId ?? input.productId ?? null,
      before: { stock: currentStock },
      after: { stock: input.newStock },
      metadata: {
        difference,
        reason: input.reason,
      },
    });

    return {
      success: true,
      message: "Stock ajustado correctamente",
    };
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return {
      success: false,
      error: "Error al ajustar stock",
    };
  }
}

// Obtener productos con stock bajo
export async function getLowStockProducts() {
  await protectRoute("products:view");
  try {
    // ✅ Simplificar la query - Prisma no soporta prisma.productVariant.fields en queries
    const products = await prisma.product.findMany({
      where: {
        active: true,
      },
      include: {
        variants: {
          where: {
            active: true,
          },
          select: {
            id: true,
            sku: true,
            options: true,
            stock: true,
            lowStockAlert: true,
          },
        },
      },
    });

    // Filtrar en JavaScript
    const lowStockProducts = products.filter((product) => {
      if (!product.hasVariants) {
        return product.stock <= 5;
      } else {
        return product.variants.some((v) => v.stock <= v.lowStockAlert);
      }
    });

    return {
      success: true,
      data: lowStockProducts,
    };
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    return {
      success: false,
      error: "Error al obtener productos con stock bajo",
      data: [],
    };
  }
}

// Eliminar masivamente todos los productos con stock 0
export async function deleteZeroStockProducts(): Promise<{ success: boolean; deleted?: number; error?: string }> {
  await protectRoute("products:delete");
  try {
    // Simple products with stock = 0
    const simpleDeleted = await prisma.product.deleteMany({
      where: { hasVariants: false, stock: { lte: 0 } },
    });

    // Variant products where ALL variants have stock = 0:
    // Find products that have at least one variant with stock > 0
    const variantsWithStock = await prisma.productVariant.findMany({
      where: { stock: { gt: 0 } },
      select: { productId: true },
      distinct: ["productId"],
    });
    const productIdsWithStock = variantsWithStock
      .map((v) => v.productId)
      .filter((id): id is string => id !== null);

    const variantDeleted = await prisma.product.deleteMany({
      where: {
        hasVariants: true,
        id: { notIn: productIdsWithStock },
      },
    });

    const total = simpleDeleted.count + variantDeleted.count;
    revalidatePath("/admin/inventario");
    revalidatePath("/admin/productos");

    return { success: true, deleted: total };
  } catch (error) {
    console.error("Error deleting zero stock products:", error);
    return { success: false, error: "Error al eliminar productos" };
  }
}
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { InventoryMovementType } from "@prisma/client"; // ✅ Importar el enum

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
  try {
    // Validar que se proporcione productId o variantId
    if (!data.productId && !data.variantId) {
      return {
        success: false,
        error: "Debe proporcionar productId o variantId",
      };
    }

    // Validar cantidad
    if (data.quantity === 0) {
      return {
        success: false,
        error: "La cantidad no puede ser 0",
      };
    }

    // Crear el movimiento
    const movement = await prisma.inventoryMovement.create({
      data: {
        productId: data.productId,
        variantId: data.variantId,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
        reference: data.reference,
      },
    });

    // Actualizar el stock
    if (data.variantId) {
      await prisma.productVariant.update({
        where: { id: data.variantId },
        data: {
          stock: {
            increment: data.quantity,
          },
        },
      });
    } else if (data.productId) {
      await prisma.product.update({
        where: { id: data.productId },
        data: {
          stock: {
            increment: data.quantity,
          },
        },
      });
    }

    revalidatePath("/admin/inventario");

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
  try {
    if (!data.productId && !data.variantId) {
      return {
        success: false,
        error: "Debe proporcionar productId o variantId",
      };
    }

    if (data.newStock < 0) {
      return {
        success: false,
        error: "El stock no puede ser negativo",
      };
    }

    let currentStock = 0;

    // Obtener stock actual
    if (data.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: data.variantId },
        select: { stock: true },
      });
      currentStock = variant?.stock || 0;
    } else if (data.productId) {
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
        select: { stock: true },
      });
      currentStock = product?.stock || 0;
    }

    const difference = data.newStock - currentStock;

    if (difference === 0) {
      return {
        success: true,
        message: "El stock ya está en el valor indicado",
      };
    }

    // Crear movimiento de ajuste
    await prisma.inventoryMovement.create({
      data: {
        productId: data.productId,
        variantId: data.variantId,
        type: "ADJUSTMENT",
        quantity: difference,
        reason: data.reason,
      },
    });

    // Actualizar stock
    if (data.variantId) {
      await prisma.productVariant.update({
        where: { id: data.variantId },
        data: { stock: data.newStock },
      });
    } else if (data.productId) {
      await prisma.product.update({
        where: { id: data.productId },
        data: { stock: data.newStock },
      });
    }

    revalidatePath("/admin/inventario");

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
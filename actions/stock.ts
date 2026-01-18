"use server";

import { prisma } from "@/lib/db";

export interface StockCheckItem {
  id: string; // ID del item en el carrito
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface StockCheckResult {
  success: boolean;
  items: {
    id: string;
    available: boolean;
    currentStock: number;
    requestedQuantity: number;
    message?: string;
  }[];
  errors: string[];
}

/**
 * Verifica el stock disponible para todos los items del carrito
 */
export async function checkCartStock(
  items: StockCheckItem[]
): Promise<StockCheckResult> {
  const result: StockCheckResult = {
    success: true,
    items: [],
    errors: [],
  };

  try {
    // Verificar cada item
    for (const item of items) {
      // Si tiene variante, verificar stock de la variante
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          select: {
            stock: true,
            active: true,
            product: {
              select: {
                active: true,
                name: true,
              },
            },
          },
        });

        if (!variant) {
          result.success = false;
          result.items.push({
            id: item.id,
            available: false,
            currentStock: 0,
            requestedQuantity: item.quantity,
            message: "Producto no encontrado",
          });
          result.errors.push(`El producto no está disponible`);
          continue;
        }

        if (!variant.active || !variant.product.active) {
          result.success = false;
          result.items.push({
            id: item.id,
            available: false,
            currentStock: 0,
            requestedQuantity: item.quantity,
            message: "Producto no disponible",
          });
          result.errors.push(`${variant.product.name} ya no está disponible`);
          continue;
        }

        const available = variant.stock >= item.quantity;
        
        result.items.push({
          id: item.id,
          available,
          currentStock: variant.stock,
          requestedQuantity: item.quantity,
          message: available
            ? undefined
            : `Solo hay ${variant.stock} unidades disponibles`,
        });

        if (!available) {
          result.success = false;
          result.errors.push(
            `${variant.product.name}: Solo hay ${variant.stock} unidades disponibles`
          );
        }
      } else {
        // Producto sin variante
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            stock: true,
            active: true,
            name: true,
            hasVariants: true,
          },
        });

        if (!product) {
          result.success = false;
          result.items.push({
            id: item.id,
            available: false,
            currentStock: 0,
            requestedQuantity: item.quantity,
            message: "Producto no encontrado",
          });
          result.errors.push(`El producto no está disponible`);
          continue;
        }

        if (!product.active) {
          result.success = false;
          result.items.push({
            id: item.id,
            available: false,
            currentStock: 0,
            requestedQuantity: item.quantity,
            message: "Producto no disponible",
          });
          result.errors.push(`${product.name} ya no está disponible`);
          continue;
        }

        // Si el producto tiene variantes, no debe tener stock directo
        if (product.hasVariants) {
          result.success = false;
          result.items.push({
            id: item.id,
            available: false,
            currentStock: 0,
            requestedQuantity: item.quantity,
            message: "Debes seleccionar una variante",
          });
          result.errors.push(`${product.name}: Debes seleccionar una variante`);
          continue;
        }

        const available = product.stock >= item.quantity;
        
        result.items.push({
          id: item.id,
          available,
          currentStock: product.stock,
          requestedQuantity: item.quantity,
          message: available
            ? undefined
            : `Solo hay ${product.stock} unidades disponibles`,
        });

        if (!available) {
          result.success = false;
          result.errors.push(
            `${product.name}: Solo hay ${product.stock} unidades disponibles`
          );
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Error checking stock:", error);
    return {
      success: false,
      items: [],
      errors: ["Error al verificar el stock. Por favor intenta nuevamente."],
    };
  }
}

/**
 * Verifica el stock de un solo item
 */
export async function checkSingleItemStock(
  productId: string,
  variantId: string | null,
  quantity: number
): Promise<{
  available: boolean;
  currentStock: number;
  message?: string;
}> {
  try {
    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: {
          stock: true,
          active: true,
          product: {
            select: {
              active: true,
            },
          },
        },
      });

      if (!variant || !variant.active || !variant.product.active) {
        return {
          available: false,
          currentStock: 0,
          message: "Producto no disponible",
        };
      }

      return {
        available: variant.stock >= quantity,
        currentStock: variant.stock,
        message:
          variant.stock >= quantity
            ? undefined
            : `Solo hay ${variant.stock} unidades disponibles`,
      };
    } else {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          stock: true,
          active: true,
          hasVariants: true,
        },
      });

      if (!product || !product.active || product.hasVariants) {
        return {
          available: false,
          currentStock: 0,
          message: "Producto no disponible",
        };
      }

      return {
        available: product.stock >= quantity,
        currentStock: product.stock,
        message:
          product.stock >= quantity
            ? undefined
            : `Solo hay ${product.stock} unidades disponibles`,
      };
    }
  } catch (error) {
    console.error("Error checking single item stock:", error);
    return {
      available: false,
      currentStock: 0,
      message: "Error al verificar disponibilidad",
    };
  }
}
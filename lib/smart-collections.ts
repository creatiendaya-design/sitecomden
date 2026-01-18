import { prisma } from "@/lib/db";

interface Condition {
  field: string;
  operator: string;
  value: string;
}

// Mapeo de campos del formulario a campos de la base de datos
const FIELD_MAPPING: Record<string, string> = {
  price: "basePrice",
  compareAtPrice: "compareAtPrice",
  stock: "stock",
  weight: "weight",
  name: "name",
  sku: "sku",
  featured: "featured",
};

/**
 * Evalúa condiciones y asigna productos a una categoría inteligente
 */
export async function applySmartCollectionConditions(
  categoryId: string,
  conditions: Condition[],
  relation: "AND" | "OR" = "AND"
) {
  if (!conditions || conditions.length === 0) {
    console.log(`[Smart Collection] No conditions for category ${categoryId}`);
    return { totalProducts: 0, productIds: [], errors: [] };
  }

  try {
    // Construir los filtros de Prisma dinámicamente
    const filters = conditions.map((condition) => {
      const { field, operator, value } = condition;

      // Mapear el campo del formulario al campo de la base de datos
      const dbField = FIELD_MAPPING[field] || field;

      // Convertir valor según el tipo de campo
      let convertedValue: any = value;
      
      if (["price", "compareAtPrice", "weight", "stock"].includes(field)) {
        convertedValue = parseFloat(value);
      } else if (field === "featured") {
        convertedValue = value === "true";
      }

      // Construir el filtro según el operador
      switch (operator) {
        case "equals":
          return { [dbField]: convertedValue };
        
        case "not_equals":
          return { [dbField]: { not: convertedValue } };
        
        case "greater_than":
          return { [dbField]: { gt: convertedValue } };
        
        case "greater_than_or_equal":
          return { [dbField]: { gte: convertedValue } };
        
        case "less_than":
          return { [dbField]: { lt: convertedValue } };
        
        case "less_than_or_equal":
          return { [dbField]: { lte: convertedValue } };
        
        case "contains":
          return { [dbField]: { contains: value, mode: "insensitive" } };
        
        case "not_contains":
          return { [dbField]: { not: { contains: value, mode: "insensitive" } } };
        
        case "starts_with":
          return { [dbField]: { startsWith: value, mode: "insensitive" } };
        
        case "ends_with":
          return { [dbField]: { endsWith: value, mode: "insensitive" } };
        
        default:
          return { [dbField]: convertedValue };
      }
    });

    // Construir el WHERE según la relación (AND/OR)
    const where = relation === "AND" 
      ? { AND: filters }
      : { OR: filters };

    // Buscar productos que cumplan las condiciones
    const matchingProducts = await prisma.product.findMany({
      where: {
        active: true, // Solo productos activos
        ...where,
      },
      select: { 
        id: true, 
        name: true,
      },
    });

    const productIds = matchingProducts.map((p) => p.id);

    console.log(`[Smart Collection] Found ${productIds.length} products matching conditions for category ${categoryId}`);
    console.log(`[Smart Collection] Product IDs:`, productIds);

    // 1. Eliminar relaciones existentes de esta categoría
    const deleteResult = await prisma.productCategory.deleteMany({
      where: { categoryId },
    });
    
    console.log(`[Smart Collection] Removed ${deleteResult.count} product-category relationships`);

    // 2. Crear nuevas relaciones para productos que cumplen las condiciones
    if (productIds.length > 0) {
      // Crear relaciones en batch
      await prisma.productCategory.createMany({
        data: productIds.map((productId) => ({
          productId,
          categoryId,
        })),
        skipDuplicates: true, // Por si alguna relación ya existía
      });
      
      console.log(`[Smart Collection] Created ${productIds.length} product-category relationships`);

      // Verificar cuántos se asignaron realmente
      const verifyCount = await prisma.productCategory.count({
        where: { categoryId }
      });

      console.log(`[Smart Collection] Verification: ${verifyCount} products now in category ${categoryId}`);

      return {
        totalProducts: verifyCount,
        productIds,
        matchedCount: productIds.length,
        verifiedCount: verifyCount,
      };
    }

    return {
      totalProducts: 0,
      productIds: [],
      matchedCount: 0,
      verifiedCount: 0,
    };

  } catch (error) {
    console.error(`[Smart Collection] Error applying conditions for category ${categoryId}:`, error);
    throw error;
  }
}

/**
 * Re-evalúa todas las categorías inteligentes
 * Útil para ejecutar después de crear/actualizar productos
 */
export async function reevaluateAllSmartCollections() {
  const smartCategories = await prisma.category.findMany({
    where: { collectionType: "SMART" },
    include: { conditions: true },
  });

  const results = [];

  for (const category of smartCategories) {
    if (category.conditions.length > 0) {
      const relation = category.conditions[0].relation as "AND" | "OR";
      
      const result = await applySmartCollectionConditions(
        category.id,
        category.conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
        relation
      );

      results.push({
        categoryId: category.id,
        categoryName: category.name,
        ...result,
      });
    }
  }

  return results;
}
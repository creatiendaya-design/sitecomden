import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  try {
    const { conditions, relation = "AND" } = await request.json();

    if (!conditions || conditions.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // Construir los filtros de Prisma dinámicamente
    const filters = conditions.map((condition: Condition) => {
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

    // Contar productos que cumplan las condiciones
    const count = await prisma.product.count({
      where: {
        active: true,
        ...where,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error en preview:", error);
    return NextResponse.json({ count: 0 });
  }
}